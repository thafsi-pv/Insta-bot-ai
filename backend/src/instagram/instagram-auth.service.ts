import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { encryptToken, decryptToken } from '../common/utils/crypto.util';
import axios from 'axios';
import { InstagramAccountStatus } from '@prisma/client';

@Injectable()
export class InstagramAuthService {
  private readonly logger = new Logger(InstagramAuthService.name);
  private readonly graphApiVersion = 'v21.0';
  private readonly encryptionKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.encryptionKey = this.configService.get<string>(
      'ENCRYPTION_KEY',
      '01234567890123456789012345678901',
    );
  }

  getOAuthUrl(): string {
    const appId = this.configService.get<string>('INSTAGRAM_APP_ID');
    const redirectUri = this.configService.get<string>('INSTAGRAM_REDIRECT_URI');

    if (!appId || !redirectUri) {
      throw new BadRequestException(
        'Meta App ID or Redirect URI is not configured in environment variables',
      );
    }

    const scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_messages',
      'instagram_manage_comments',
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_metadata',
      'pages_messaging',
      'business_management',
    ].join(',');

    return `https://www.facebook.com/${this.graphApiVersion}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent(scopes)}&response_type=code&auth_type=rerequest`;
  }

  async handleOAuthCallback(code: string) {
    const appId = this.configService.get<string>('INSTAGRAM_APP_ID');
    const appSecret = this.configService.get<string>('INSTAGRAM_APP_SECRET');
    const redirectUri = this.configService.get<string>('INSTAGRAM_REDIRECT_URI');

    if (!appId || !appSecret || !redirectUri) {
      throw new BadRequestException('Meta App credentials are missing');
    }

    // 1. Exchange code for short-lived token
    const tokenUrl = `https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`;
    const tokenRes = await axios.get(tokenUrl, {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      },
    });

    const shortLivedToken = tokenRes.data.access_token;

    // 2. Exchange for long-lived token (valid ~60 days)
    const longLivedUrl = `https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`;
    const longLivedRes = await axios.get(longLivedUrl, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    const longLivedToken = longLivedRes.data.access_token;
    const expiresIn = longLivedRes.data.expires_in || 5184000; // ~60 days

    // 3. Find connected Instagram Business Accounts via Facebook Pages
    const accountsUrl = `https://graph.facebook.com/${this.graphApiVersion}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=${longLivedToken}`;
    const accountsRes = await axios.get(accountsUrl);
    const pages = accountsRes.data.data || [];
    console.log('[Meta OAuth] Pages retrieved from /me/accounts:', JSON.stringify(pages, null, 2));

    const connectedAccounts = [];

    for (const page of pages) {
      let ig = page.instagram_business_account;
      const pageToken = page.access_token || longLivedToken;

      // If not expanded in /me/accounts, query page directly
      if (!ig && page.id) {
        try {
          const pageDetailUrl = `https://graph.facebook.com/${this.graphApiVersion}/${page.id}?fields=instagram_business_account{id,username,name}&access_token=${pageToken}`;
          const pageDetailRes = await axios.get(pageDetailUrl);
          ig = pageDetailRes.data?.instagram_business_account;
        } catch (e: any) {
          console.warn(`[Meta OAuth] Notice inspecting page ${page.id}:`, e.message);
        }
      }

      if (ig) {
        const saved = await this.saveOrUpdateAccount({
          instagramUserId: ig.id,
          pageId: page.id,            // ← store the Facebook Page ID
          username: ig.username || page.name || 'Instagram User',
          accessToken: pageToken,
          expiresInSeconds: expiresIn,
        });

        // 4. Subscribe the Facebook Page to Meta Webhook Messages
        if (page.id) {
          try {
            const subRes = await axios.post(
              `https://graph.facebook.com/${this.graphApiVersion}/${page.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_deliveries,message_reads,message_echoes&access_token=${pageToken}`,
            );
            console.log(`✅ [PAGE WEBHOOK SUBSCRIBED] Page: ${page.name} (${page.id}) ->`, subRes.data);
          } catch (subErr: any) {
            console.warn(`⚠️ [PAGE WEBHOOK SUBSCRIPTION] Notice subscribing page ${page.id}:`, subErr.response?.data || subErr.message);
          }
        }

        connectedAccounts.push(saved);
      }
    }

    if (connectedAccounts.length === 0) {
      // 4. Try querying direct Instagram user ID if using Instagram Login for Business
      try {
        const igMeUrl = `https://graph.facebook.com/${this.graphApiVersion}/me?fields=id,name&access_token=${longLivedToken}`;
        const meRes = await axios.get(igMeUrl);
        const fbUser = meRes.data;

        if (pages.length > 0) {
          throw new BadRequestException(
            `Found Facebook Page(s) ("${pages.map((p: any) => p.name).join(', ')}"), but no Instagram Business Account is connected to them. Please link your Instagram account to the Facebook Page in Instagram App Settings > Edit Profile > Page.`,
          );
        } else {
          throw new BadRequestException(
            `No Facebook Pages or Instagram Business accounts found for account "${fbUser.name}". Please create a Facebook Page and link it to your Instagram Business account.`,
          );
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        throw new BadRequestException(
          `No Instagram Business account linked to your Facebook profile. Please ensure your Instagram is a Professional/Business account and connected to a Facebook Page.`,
        );
      }
    }

    return connectedAccounts;
  }

  async connectDirect(dto: {
    accessToken: string;
    instagramUserId?: string;
    username?: string;
  }) {
    if (!dto.accessToken) {
      throw new BadRequestException('Access token is required');
    }

    let igId = dto.instagramUserId;
    let username = dto.username;

    // Verify token and fetch metadata from Graph API
    try {
      const inspectUrl = `https://graph.facebook.com/${this.graphApiVersion}/me?fields=id,name&access_token=${dto.accessToken}`;
      const res = await axios.get(inspectUrl);
      if (!igId) igId = res.data.id;
      if (!username) username = res.data.name || 'Connected Instagram';
    } catch (error: any) {
      this.logger.warn(
        `Token verification directly with /me had notice: ${error.message}. Using provided parameters.`,
      );
    }

    if (!igId) {
      throw new BadRequestException(
        'Unable to resolve Instagram ID from token. Please enter your Instagram Business User ID.',
      );
    }

    return this.saveOrUpdateAccount({
      instagramUserId: igId,
      username: username || `ig_${igId}`,
      accessToken: dto.accessToken,
      expiresInSeconds: 5184000,
    });
  }

  async saveOrUpdateAccount(params: {
    instagramUserId: string;
    pageId?: string;             // optional Facebook Page ID
    username: string;
    accessToken: string;
    expiresInSeconds?: number;
  }) {
    const encryptedToken = encryptToken(params.accessToken, this.encryptionKey);
    const expiresAt = params.expiresInSeconds
      ? new Date(Date.now() + params.expiresInSeconds * 1000)
      : null;

    const account = await this.prisma.instagramAccount.upsert({
      where: { instagramUserId: params.instagramUserId },
      update: {
        username: params.username,
        accessTokenEncrypted: encryptedToken,
        tokenExpiresAt: expiresAt,
        status: InstagramAccountStatus.CONNECTED,
        ...(params.pageId ? { pageId: params.pageId } : {}),
      },
      create: {
        instagramUserId: params.instagramUserId,
        pageId: params.pageId || null,
        username: params.username,
        accessTokenEncrypted: encryptedToken,
        tokenExpiresAt: expiresAt,
        status: InstagramAccountStatus.CONNECTED,
      },
      select: {
        id: true,
        businessId: true,
        instagramUserId: true,
        pageId: true,
        username: true,
        status: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Instagram account linked: @${account.username} (IG: ${account.instagramUserId}, Page: ${account.pageId || 'n/a'})`);
    return account;
  }

  async getDecryptedToken(instagramAccountId: string): Promise<string> {
    const account = await this.prisma.instagramAccount.findUnique({
      where: { id: instagramAccountId },
    });

    if (!account || !account.accessTokenEncrypted) {
      throw new BadRequestException('Instagram account or access token not found');
    }

    return decryptToken(account.accessTokenEncrypted, this.encryptionKey);
  }

  async getDecryptedTokenByUserId(instagramUserId: string): Promise<string> {
    const account = await this.prisma.instagramAccount.findUnique({
      where: { instagramUserId },
    });

    if (!account || !account.accessTokenEncrypted) {
      throw new BadRequestException('Instagram account or access token not found');
    }

    return decryptToken(account.accessTokenEncrypted, this.encryptionKey);
  }
}
