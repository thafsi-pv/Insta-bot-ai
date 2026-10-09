export interface MetaOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MetaLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface InstagramUserProfile {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}

export interface InstagramWebhookEntry {
  id: string;
  time: number;
  messaging?: InstagramMessagingEvent[];
  changes?: InstagramChangeEvent[];
}

export interface InstagramMessagingEvent {
  sender: {
    id: string;
  };
  recipient: {
    id: string;
  };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{
      type: string;
      payload: {
        url?: string;
        [key: string]: any;
      };
    }>;
    reply_to?: {
      mid: string;
      story?: {
        id: string;
        url: string;
      };
    };
    referral?: {
      product?: {
        id: string;
      };
      source?: string;
      type?: string;
    };
  };
  postback?: {
    mid: string;
    title: string;
    payload: string;
  };
}

export interface InstagramChangeEvent {
  field: string;
  value: {
    from: {
      id: string;
      username: string;
    };
    media?: {
      id: string;
      media_product_type?: string;
    };
    id: string;
    text: string;
    created_time?: number;
  };
}

export interface InstagramWebhookPayload {
  object: 'instagram' | 'page';
  entry: InstagramWebhookEntry[];
}
