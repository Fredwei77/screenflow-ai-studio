import { Router } from 'express';
import { randomBytes } from 'crypto';

export type SocialPlatform = 'youtube' | 'xiaohongshu' | 'douyin' | 'wechat';

interface PublishAccount {
  id: string;
  platform: SocialPlatform;
  username: string;
  avatar?: string;
  isConnected: boolean;
  connectedAt: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  mode: 'demo' | 'oauth';
}

interface PublicPublishAccount extends Omit<PublishAccount, 'accessToken' | 'refreshToken'> {}

interface PublishContent {
  title: string;
  description?: string;
  tags?: string[];
  videoUrl?: string;
  coverUrl?: string;
}

interface PublishStatus {
  id: string;
  platform: SocialPlatform;
  status: 'pending' | 'publishing' | 'success' | 'failed';
  error?: string;
  publishedUrl?: string;
  createdAt: string;
  updatedAt: string;
  mode?: 'demo' | 'api';
}

interface PlatformProfile {
  platform: SocialPlatform;
  label: string;
  titleMax: number;
  descMax: number;
  tagsMax: number;
  tagMaxLen: number;
  requiredEnv: string[];
  scopes: string[];
  docsUrl: string;
  buildAuthUrl: (state: string) => string;
  buildPublishedUrl: (id: string) => string;
}

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';
const PUBLISH_DEMO_MODE = process.env.PUBLISH_DEMO_MODE !== 'false';

const callbackUrl = (platform: SocialPlatform) =>
  `${PUBLIC_BASE_URL}/api/publish/oauth/${platform}/callback`;

const platformProfiles: Record<SocialPlatform, PlatformProfile> = {
  youtube: {
    platform: 'youtube',
    label: 'YouTube',
    titleMax: 100,
    descMax: 5000,
    tagsMax: 15,
    tagMaxLen: 30,
    requiredEnv: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
    scopes: ['https://www.googleapis.com/auth/youtube.upload'],
    docsUrl: 'https://developers.google.com/youtube/v3/docs/videos/insert',
    buildAuthUrl: (state) => {
      const params = new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID || '',
        redirect_uri: process.env.YOUTUBE_REDIRECT_URI || callbackUrl('youtube'),
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        scope: 'https://www.googleapis.com/auth/youtube.upload',
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    },
    buildPublishedUrl: (id) => `https://studio.youtube.com/video/${id.toLowerCase()}`,
  },
  xiaohongshu: {
    platform: 'xiaohongshu',
    label: 'Xiaohongshu',
    titleMax: 20,
    descMax: 1000,
    tagsMax: 10,
    tagMaxLen: 15,
    requiredEnv: ['XIAOHONGSHU_CLIENT_ID', 'XIAOHONGSHU_CLIENT_SECRET'],
    scopes: ['video.publish'],
    docsUrl: 'https://www.xiaohongshu.com/',
    buildAuthUrl: (state) => {
      const params = new URLSearchParams({
        client_id: process.env.XIAOHONGSHU_CLIENT_ID || '',
        redirect_uri: process.env.XIAOHONGSHU_REDIRECT_URI || callbackUrl('xiaohongshu'),
        response_type: 'code',
        scope: 'video.publish',
        state,
      });
      return `https://www.xiaohongshu.com/oauth/authorize?${params.toString()}`;
    },
    buildPublishedUrl: (id) => `https://www.xiaohongshu.com/explore/${id.toLowerCase()}`,
  },
  douyin: {
    platform: 'douyin',
    label: 'Douyin',
    titleMax: 55,
    descMax: 1000,
    tagsMax: 10,
    tagMaxLen: 20,
    requiredEnv: ['DOUYIN_CLIENT_KEY', 'DOUYIN_CLIENT_SECRET'],
    scopes: ['video.create', 'video.upload'],
    docsUrl: 'https://developer.open-douyin.com/',
    buildAuthUrl: (state) => {
      const params = new URLSearchParams({
        client_key: process.env.DOUYIN_CLIENT_KEY || '',
        redirect_uri: process.env.DOUYIN_REDIRECT_URI || callbackUrl('douyin'),
        response_type: 'code',
        scope: 'video.create,video.upload',
        state,
      });
      return `https://open.douyin.com/platform/oauth/connect?${params.toString()}`;
    },
    buildPublishedUrl: (id) => `https://www.douyin.com/video/${id.toLowerCase()}`,
  },
  wechat: {
    platform: 'wechat',
    label: 'Wechat Channels',
    titleMax: 30,
    descMax: 1000,
    tagsMax: 10,
    tagMaxLen: 20,
    requiredEnv: ['WECHAT_CHANNELS_APP_ID', 'WECHAT_CHANNELS_APP_SECRET'],
    scopes: ['channels.ec.upload'],
    docsUrl: 'https://developers.weixin.qq.com/doc/channels/API/',
    buildAuthUrl: (state) => {
      const params = new URLSearchParams({
        appid: process.env.WECHAT_CHANNELS_APP_ID || '',
        redirect_uri: process.env.WECHAT_CHANNELS_REDIRECT_URI || callbackUrl('wechat'),
        response_type: 'code',
        scope: 'snsapi_login',
        state,
      });
      return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
    },
    buildPublishedUrl: (id) => `https://channels.weixin.qq.com/platform/post/${id.toLowerCase()}`,
  },
};

const accounts = new Map<SocialPlatform, PublishAccount>();
const publishJobs = new Map<string, PublishStatus>();
const oauthStates = new Map<string, SocialPlatform>();

export const publishRouter = Router();

const isSocialPlatform = (value: unknown): value is SocialPlatform =>
  typeof value === 'string' && value in platformProfiles;

const toPublicAccount = (account: PublishAccount): PublicPublishAccount => {
  const { accessToken: _accessToken, refreshToken: _refreshToken, ...publicAccount } = account;
  return publicAccount;
};

const isPlatformConfigured = (platform: SocialPlatform) =>
  platformProfiles[platform].requiredEnv.every((key) => !!process.env[key]);

const validateContent = (platform: SocialPlatform, content: PublishContent): string | null => {
  const profile = platformProfiles[platform];
  const title = content.title?.trim() || '';
  const description = content.description || '';
  const tags = content.tags || [];

  if (!title) return 'Title is required';
  if (title.length > profile.titleMax) return `${profile.label} title must be ${profile.titleMax} characters or fewer`;
  if (description.length > profile.descMax) return `${profile.label} description must be ${profile.descMax} characters or fewer`;
  if (tags.length > profile.tagsMax) return `${profile.label} supports up to ${profile.tagsMax} tags`;
  const longTag = tags.find((tag) => tag.length > profile.tagMaxLen);
  if (longTag) return `${profile.label} tag "${longTag}" must be ${profile.tagMaxLen} characters or fewer`;
  return null;
};

const createFailedStatus = (platform: SocialPlatform, error: string): PublishStatus => {
  const now = new Date().toISOString();
  return {
    id: `pub_${randomBytes(6).toString('hex')}`,
    platform,
    status: 'failed',
    error,
    createdAt: now,
    updatedAt: now,
  };
};

const publishViaDemoAdapter = (platform: SocialPlatform): PublishStatus => {
  const now = new Date().toISOString();
  const id = `pub_${randomBytes(6).toString('hex')}`;
  const status: PublishStatus = {
    id,
    platform,
    status: 'success',
    publishedUrl: platformProfiles[platform].buildPublishedUrl(id),
    createdAt: now,
    updatedAt: now,
    mode: 'demo',
  };
  publishJobs.set(id, status);
  return status;
};

const publishViaPlatformApi = async (platform: SocialPlatform, account: PublishAccount, content: PublishContent): Promise<PublishStatus> => {
  if (!content.videoUrl) {
    return createFailedStatus(platform, 'A server-accessible videoUrl is required for real platform upload');
  }

  // Real provider uploads are intentionally isolated here. Each platform has a different
  // media upload protocol; the frontend contract remains stable while these adapters evolve.
  const now = new Date().toISOString();
  const id = `pub_${randomBytes(6).toString('hex')}`;
  const status: PublishStatus = {
    id,
    platform,
    status: 'publishing',
    createdAt: now,
    updatedAt: now,
    mode: 'api',
  };
  publishJobs.set(id, status);

  const failedStatus: PublishStatus = {
    ...status,
    status: 'failed',
    error: `${platformProfiles[platform].label} real upload adapter is configured but not enabled yet. Use PUBLISH_DEMO_MODE=true until the provider upload flow is approved.`,
    updatedAt: new Date().toISOString(),
  };
  publishJobs.set(id, failedStatus);
  return failedStatus;
};

const publishToPlatform = async (platform: SocialPlatform, content: PublishContent): Promise<PublishStatus> => {
  const account = accounts.get(platform);
  if (!account?.isConnected) {
    return createFailedStatus(platform, `${platformProfiles[platform].label} account is not connected`);
  }

  const validationError = validateContent(platform, content);
  if (validationError) return createFailedStatus(platform, validationError);

  if (PUBLISH_DEMO_MODE || account.mode === 'demo') {
    return publishViaDemoAdapter(platform);
  }

  if (!isPlatformConfigured(platform)) {
    return createFailedStatus(platform, `${platformProfiles[platform].label} API credentials are not configured`);
  }

  return publishViaPlatformApi(platform, account, content);
};

publishRouter.get('/platforms', (_req, res) => {
  res.json(Object.values(platformProfiles).map((profile) => ({
    platform: profile.platform,
    label: profile.label,
    limits: {
      titleMax: profile.titleMax,
      descMax: profile.descMax,
      tagsMax: profile.tagsMax,
      tagMaxLen: profile.tagMaxLen,
    },
    configured: isPlatformConfigured(profile.platform),
    mode: PUBLISH_DEMO_MODE ? 'demo' : 'api',
    docsUrl: profile.docsUrl,
    scopes: profile.scopes,
  })));
});

publishRouter.get('/accounts', (_req, res) => {
  res.json(Array.from(accounts.values()).map(toPublicAccount));
});

publishRouter.post('/accounts/connect', (req, res) => {
  const { platform } = req.body;
  if (!isSocialPlatform(platform)) {
    return res.status(400).json({ message: 'Unsupported publish platform' });
  }

  const now = new Date().toISOString();
  if (PUBLISH_DEMO_MODE || !isPlatformConfigured(platform)) {
    const account: PublishAccount = {
      id: accounts.get(platform)?.id || `acc_${platform}_${randomBytes(4).toString('hex')}`,
      platform,
      username: `${platformProfiles[platform].label} Demo Account`,
      isConnected: true,
      connectedAt: now,
      mode: 'demo',
    };
    accounts.set(platform, account);
    return res.json({
      account: toPublicAccount(account),
      authUrl: '',
      mode: 'demo',
    });
  }

  const state = randomBytes(12).toString('hex');
  oauthStates.set(state, platform);
  res.json({
    authUrl: platformProfiles[platform].buildAuthUrl(state),
    mode: 'oauth',
  });
});

publishRouter.get('/oauth/:platform/callback', (req, res) => {
  const { platform } = req.params;
  const { state, code } = req.query;
  if (!isSocialPlatform(platform)) {
    return res.status(400).send('Unsupported publish platform');
  }
  if (typeof state !== 'string' || oauthStates.get(state) !== platform) {
    return res.status(400).send('Invalid OAuth state');
  }

  oauthStates.delete(state);
  const now = new Date().toISOString();
  const account: PublishAccount = {
    id: accounts.get(platform)?.id || `acc_${platform}_${randomBytes(4).toString('hex')}`,
    platform,
    username: `${platformProfiles[platform].label} OAuth Account`,
    isConnected: true,
    connectedAt: now,
    accessToken: typeof code === 'string' ? `oauth_code_${code}` : undefined,
    mode: 'oauth',
  };
  accounts.set(platform, account);

  res.type('html').send(`
    <!doctype html>
    <html>
      <head><title>Connected</title></head>
      <body style="font-family: system-ui; padding: 32px;">
        <h1>${platformProfiles[platform].label} connected</h1>
        <p>You can close this window and return to ScreenFlow AI.</p>
      </body>
    </html>
  `);
});

publishRouter.delete('/accounts/:accountId', (req, res) => {
  const account = Array.from(accounts.values()).find((item) => item.id === req.params.accountId);
  if (!account) {
    return res.status(404).json({ message: 'Publish account not found' });
  }

  accounts.delete(account.platform);
  res.json({ success: true });
});

publishRouter.post('/publish', async (req, res) => {
  const { platform, content } = req.body;
  if (!isSocialPlatform(platform)) {
    return res.status(400).json({ message: 'Unsupported publish platform' });
  }

  const status = await publishToPlatform(platform, content || {});
  res.status(status.status === 'failed' ? 400 : 200).json(status);
});

publishRouter.post('/publish/batch', async (req, res) => {
  const { platforms, content } = req.body;
  if (!Array.isArray(platforms) || platforms.some((platform) => !isSocialPlatform(platform))) {
    return res.status(400).json({ message: 'Platforms must be a supported platform array' });
  }

  const statuses = await Promise.all(platforms.map((platform) => publishToPlatform(platform, content || {})));
  res.json(statuses);
});

publishRouter.get('/status/:publishId', (req, res) => {
  const status = publishJobs.get(req.params.publishId);
  if (!status) {
    return res.status(404).json({ message: 'Publish job not found' });
  }

  res.json(status);
});
