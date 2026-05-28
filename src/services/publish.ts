export type SocialPlatform = 'youtube' | 'xiaohongshu' | 'douyin' | 'wechat';

export interface PublishAccount {
  id: string;
  platform: SocialPlatform;
  username: string;
  avatar?: string;
  isConnected: boolean;
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
  platform: SocialPlatform;
  status: 'pending' | 'publishing' | 'success' | 'failed';
  error?: string;
  publishedUrl?: string;
}

const API_BASE = '/api/publish';

export const publishApi = {
  async getAccounts(): Promise<PublishAccount[]> {
    const response = await fetch(`${API_BASE}/accounts`);
    if (!response.ok) throw new Error('Failed to fetch accounts');
    return response.json();
  },

  async connectAccount(platform: SocialPlatform): Promise<{ authUrl: string }> {
    const response = await fetch(`${API_BASE}/accounts/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    });
    if (!response.ok) throw new Error('Failed to initiate connection');
    return response.json();
  },

  async disconnectAccount(accountId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to disconnect account');
  },

  async publishToPlatform(platform: SocialPlatform, content: PublishContent): Promise<PublishStatus> {
    const response = await fetch(`${API_BASE}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, content }),
    });
    if (!response.ok) throw new Error('Failed to publish');
    return response.json();
  },

  async publishToMultiple(platforms: SocialPlatform[], content: PublishContent): Promise<PublishStatus[]> {
    const response = await fetch(`${API_BASE}/publish/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platforms, content }),
    });
    if (!response.ok) throw new Error('Failed to publish');
    return response.json();
  },

  async getPublishStatus(publishId: string): Promise<PublishStatus> {
    const response = await fetch(`${API_BASE}/status/${publishId}`);
    if (!response.ok) throw new Error('Failed to get status');
    return response.json();
  },
};
