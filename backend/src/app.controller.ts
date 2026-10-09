import { Controller, Get, Post, Res, Body } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  health(): object {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('privacy')
  getPrivacyPolicy(@Res() res: Response) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Instagram AI Sales Assistant</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 0 20px; background: #fafafa; }
    .card { background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border: 1px solid #eaeaea; }
    h1 { color: #111; font-size: 28px; margin-bottom: 8px; }
    .updated { color: #777; font-size: 14px; margin-bottom: 24px; }
    h2 { color: #222; font-size: 20px; margin-top: 28px; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px; }
    p, li { color: #444; font-size: 15px; }
    ul { padding-left: 20px; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .contact-box { background: #f0f7ff; border-left: 4px solid #0066cc; padding: 16px; border-radius: 4px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Privacy Policy</h1>
    <div class="updated">Last Updated: October 2026</div>

    <p>This Privacy Policy explains how our Instagram AI Sales Assistant ("we", "our", or "the Service") collects, uses, and safeguards information when you interact with our official Instagram account via Direct Messages or Comments.</p>

    <h2>1. Information We Collect</h2>
    <p>When you comment on our posts or send us a Direct Message on Instagram, we may receive:</p>
    <ul>
      <li><strong>Instagram Profile Information:</strong> Your public Instagram User ID (IGSID) and Instagram username.</li>
      <li><strong>Communications:</strong> The content of messages and comments you send to our business account.</li>
      <li><strong>Order Information:</strong> Delivery address, recipient name, phone number, and product selections voluntarily provided by you to place an order.</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <p>We use the collected information solely for genuine customer service and order processing purposes:</p>
    <ul>
      <li>To respond automatically and promptly to your queries regarding products, pricing, and availability.</li>
      <li>To process, confirm, and fulfill your customer orders.</li>
      <li>To provide relevant updates regarding your inquiries or purchases.</li>
    </ul>
    <p><strong>We do not sell, rent, or trade your personal data with third-party advertisers or data brokers under any circumstances.</strong></p>

    <h2>3. Data Retention & Security</h2>
    <p>We implement industry-standard encryption and security measures to protect your information. Your communications are retained only as long as necessary to provide customer support and satisfy order fulfillment records.</p>

    <h2>4. Your Rights & Data Deletion</h2>
    <p>You have the right to request access to your personal data or ask for complete deletion of your records at any time. For instructions on requesting data deletion, please visit our <a href="/data-deletion">Data Deletion Instructions</a> page.</p>

    <h2>5. Contact Us</h2>
    <div class="contact-box">
      <p>If you have questions, concerns, or requests regarding this Privacy Policy, please reach out to us:</p>
      <p><strong>Email:</strong> support@zerofashion.store</p>
      <p><strong>Direct Message:</strong> Contact our official Instagram Business Account.</p>
    </div>
  </div>
</body>
</html>`;
    return res.type('html').send(html);
  }

  @Public()
  @Get('data-deletion')
  getDataDeletionInstructions(@Res() res: Response) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Data Deletion Instructions</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 0 20px; background: #fafafa; }
    .card { background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border: 1px solid #eaeaea; }
    h1 { color: #111; font-size: 28px; margin-bottom: 8px; }
    .updated { color: #777; font-size: 14px; margin-bottom: 24px; }
    h2 { color: #222; font-size: 20px; margin-top: 28px; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px; }
    p, li { color: #444; font-size: 15px; }
    ol { padding-left: 20px; }
    .step-box { background: #fdfdfd; border: 1px solid #e0e0e0; padding: 18px 24px; border-radius: 8px; margin-bottom: 16px; }
    .step-box h3 { margin-top: 0; color: #0066cc; font-size: 17px; }
    .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 600; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>User Data Deletion Instructions</h1>
    <div class="updated">Meta Platform Compliant Data Deletion Request Process</div>

    <p>In accordance with Meta Platform Terms and data protection regulations, users have the right to request deletion of all data associated with their interactions with our Instagram business account.</p>

    <h2>How to Request Data Deletion</h2>
    <p>You can request complete deletion of your customer information and chat records using any of the options below:</p>

    <div class="step-box">
      <h3>Option 1: Direct Message on Instagram (Fastest)</h3>
      <p>Send a Direct Message to our official Instagram Business Account containing the text: <strong>"DELETE MY DATA"</strong> or <strong>"CLEAR CHAT"</strong>. Our automated system or support team will mark your record for removal.</p>
    </div>

    <div class="step-box">
      <h3>Option 2: Email Request</h3>
      <p>Send an email to <strong>support@zerofashion.store</strong> with the subject line <em>"Instagram Data Deletion Request"</em>. Please mention your Instagram username. We will process and confirm deletion within 48 hours.</p>
    </div>

    <div class="step-box">
      <h3>Option 3: Remove Permissions via Instagram Settings</h3>
      <ol>
        <li>Open Instagram and go to your <strong>Profile</strong>.</li>
        <li>Tap <strong>Settings and privacy</strong> &gt; <strong>Website permissions</strong> &gt; <strong>Apps and websites</strong>.</li>
        <li>Locate our app under <strong>Active</strong> and select <strong>Remove</strong>.</li>
      </ol>
    </div>

    <h2>What Happens Next?</h2>
    <p>Upon receiving your request:</p>
    <ul>
      <li>All conversation logs, stored messages, and contact details are permanently deleted from our database within <strong>48 hours</strong>.</li>
      <li>Any pending or historical customer identifiers are expunged in full.</li>
    </ul>
    <div class="badge">&#10004; Fully Compliant with Meta Platform Data Policy</div>
  </div>
</body>
</html>`;
    return res.type('html').send(html);
  }

  @Public()
  @Post('data-deletion')
  handleDataDeletionCallback(@Body() body: any) {
    const confirmationCode = 'DEL_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    return {
      url: 'https://insta-bot-backend.onrender.com/data-deletion',
      confirmation_code: confirmationCode,
    };
  }
}
