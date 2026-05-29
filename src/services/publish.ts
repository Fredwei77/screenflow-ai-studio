export type SocialPlatform = 'youtube' | 'xiaohongshu' | 'douyin' | 'wechat';

export interface PublishAccount {
  id: string;
  platform: SocialPlatform;
  username: string;
  avatar?: string;
  isConnected: boolean;
  connectedAt?: string;
  mode?: 'demo' | 'oauth';
}

export interface PublishContent {
  title: string;
  description: string;
  tags: string[];
  videoUrl: string;
  coverUrl?: string;
  platformSpecific?: Record<SocialPlatform, Partial<PublishContent>>;
}

export interface PublishStatus {
  id?: string;
  platform: SocialPlatform;
  status: 'pending' | 'publishing' | 'success' | 'failed';
  error?: string;
  publishedUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  mode?: 'demo' | 'api';
}

export interface PublishPlatformCapability {
  platform: SocialPlatform;
  label: string;
  limits: {
    titleMax: number;
    descMax: number;
    tagsMax: number;
    tagMaxLen: number;
  };
  configured: boolean;
  mode: 'demo' | 'api';
  docsUrl: string;
  scopes: string[];
}

const API_BASE = '/meet/api/publish';

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    const detail = text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')
      ? 'Publish API returned an HTML page. Restart the backend and verify /meet/api/publish is proxied to the server.'
      : text.slice(0, 160);
    throw new Error(detail || fallbackMessage);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || data?.error || fallbackMessage);
  }
  return data as T;
}

export const publishApi = {
  async getPlatforms(): Promise<PublishPlatformCapability[]> {
    const response = await fetch(`${API_BASE}/platforms`);
    return parseJsonResponse<PublishPlatformCapability[]>(response, 'Failed to fetch publish platforms');
  },

  async getAccounts(): Promise<PublishAccount[]> {
    const response = await fetch(`${API_BASE}/accounts`);
    return parseJsonResponse<PublishAccount[]>(response, 'Failed to fetch accounts');
  },

  async connectAccount(platform: SocialPlatform): Promise<{ authUrl: string; account?: PublishAccount }> {
    const response = await fetch(`${API_BASE}/accounts/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    });
    return parseJsonResponse<{ authUrl: string; account?: PublishAccount }>(response, 'Failed to initiate connection');
  },

  async disconnectAccount(accountId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}`, {
      method: 'DELETE',
    });
    await parseJsonResponse<{ success: boolean }>(response, 'Failed to disconnect account');
  },

  async publishToPlatform(platform: SocialPlatform, content: PublishContent): Promise<PublishStatus> {
    const response = await fetch(`${API_BASE}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, content }),
    });
    return parseJsonResponse<PublishStatus>(response, 'Failed to publish');
  },

  async publishToMultiple(platforms: SocialPlatform[], content: PublishContent): Promise<PublishStatus[]> {
    const response = await fetch(`${API_BASE}/publish/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platforms, content }),
    });
    return parseJsonResponse<PublishStatus[]>(response, 'Failed to publish');
  },

  async getPublishStatus(publishId: string): Promise<PublishStatus> {
    const response = await fetch(`${API_BASE}/status/${publishId}`);
    return parseJsonResponse<PublishStatus>(response, 'Failed to get status');
  },
};
