import React, { useState, useCallback, useEffect } from 'react';
import {
  Upload,
  X,
  CheckCircle,
  XCircle,
  Loader2,
  Link,
  Unlink,
  ExternalLink,
  Save,
  FileText,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSocialPublish } from '../hooks/useSocialPublish';
import type { SocialPlatform, PublishContent, PublishStatus } from '../services/publish';

interface PublishDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  videoBlob: Blob | null;
  coverUrl?: string;
  theme: 'dark' | 'light';
}

interface PlatformLimits {
  titleMax: number;
  descMax: number;
  tagsMax: number;
  tagMaxLen: number;
  tips: string;
}

const PLATFORM_CONFIG: Record<SocialPlatform, { name: string; color: string; icon: string; limits: PlatformLimits }> = {
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    icon: 'YT',
    limits: {
      titleMax: 100,
      descMax: 5000,
      tagsMax: 15,
      tagMaxLen: 30,
      tips: 'Use searchable titles. First 2 lines of description appear in search results.',
    },
  },
  xiaohongshu: {
    name: '小红书',
    color: '#FF2442',
    icon: '小',
    limits: {
      titleMax: 20,
      descMax: 1000,
      tagsMax: 10,
      tagMaxLen: 15,
      tips: '标题限20字。多用表情符号和关键词提升曝光。',
    },
  },
  douyin: {
    name: '抖音',
    color: '#000000',
    icon: '抖',
    limits: {
      titleMax: 55,
      descMax: 1000,
      tagsMax: 10,
      tagMaxLen: 20,
      tips: '标题55字以内。带热门话题标签可获得更多推荐。',
    },
  },
  wechat: {
    name: '视频号',
    color: '#07C160',
    icon: '微',
    limits: {
      titleMax: 30,
      descMax: 1000,
      tagsMax: 10,
      tagMaxLen: 20,
      tips: '标题30字以内。添加话题可提升在朋友圈的传播。',
    },
  },
};

const DRAFT_KEY = 'publish-draft';

function loadDraft(): PublishContent | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveDraft(content: PublishContent) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(content));
  } catch { /* ignore */ }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch { /* ignore */ }
}

export const PublishDashboard: React.FC<PublishDashboardProps> = ({
  isOpen,
  onClose,
  videoBlob,
  coverUrl,
  theme,
}) => {
  const { t } = useTranslation();
  const {
    accounts,
    isLoading,
    error,
    publishStatuses,
    connectAccount,
    disconnectAccount,
    publishToMultiple,
    clearStatuses,
  } = useSocialPublish();

  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [content, setContent] = useState<PublishContent>(() => loadDraft() ?? {
    title: '',
    description: '',
    tags: [],
    videoUrl: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);

  // Generate video thumbnail for preview
  useEffect(() => {
    if (!videoBlob || !isOpen) {
      setVideoThumbnail(null);
      return;
    }
    const url = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.currentTime = 1;
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setVideoThumbnail(canvas.toDataURL('image/jpeg', 0.6));
      }
      URL.revokeObjectURL(url);
    };
    video.onerror = () => URL.revokeObjectURL(url);
  }, [videoBlob, isOpen]);

  // Auto-save draft
  useEffect(() => {
    if (content.title || content.description || content.tags.length > 0) {
      saveDraft(content);
    }
  }, [content]);

  const handlePlatformToggle = useCallback((platform: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  }, []);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim();
    if (!tag) return;

    // Check against most restrictive tag limit across selected platforms
    const activeLimits = selectedPlatforms.map((p) => PLATFORM_CONFIG[p].limits);
    const maxTags = activeLimits.length > 0 ? Math.min(...activeLimits.map((l) => l.tagsMax)) : 15;
    const maxLen = activeLimits.length > 0 ? Math.min(...activeLimits.map((l) => l.tagMaxLen)) : 30;

    if (tag.length > maxLen) return;
    if (content.tags.length >= maxTags) return;
    if (content.tags.includes(tag)) return;

    setContent((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    setTagInput('');
  }, [tagInput, content.tags, selectedPlatforms]);

  const handleRemoveTag = useCallback((tag: string) => {
    setContent((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  }, []);

  const handleConnect = useCallback(
    async (platform: SocialPlatform) => {
      try {
        const authUrl = await connectAccount(platform);
        if (authUrl.startsWith('http')) {
          window.open(authUrl, '_blank', 'noopener,noreferrer');
        }
      } catch (err) {
        console.error('Failed to connect:', err);
      }
    },
    [connectAccount]
  );

  const handlePublish = useCallback(async () => {
    if (selectedPlatforms.length === 0) return;
    await publishToMultiple(selectedPlatforms, {
      ...content,
      coverUrl,
      videoUrl: content.videoUrl || (videoBlob ? `local-recording-${videoBlob.size}.webm` : ''),
    });
    clearDraft();
  }, [coverUrl, selectedPlatforms, content, publishToMultiple, videoBlob]);

  const handleClearDraft = useCallback(() => {
    clearDraft();
    setContent({ title: '', description: '', tags: [], videoUrl: '' });
  }, []);

  const getStatusIcon = (status: PublishStatus['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full bg-gray-400" />;
      case 'publishing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  // Get the tightest character limits across selected platforms
  const activeLimits = selectedPlatforms.map((p) => PLATFORM_CONFIG[p].limits);
  const titleMax = activeLimits.length > 0 ? Math.min(...activeLimits.map((l) => l.titleMax)) : 100;
  const descMax = activeLimits.length > 0 ? Math.min(...activeLimits.map((l) => l.descMax)) : 5000;

  // Platform tips from selected platforms
  const tips = selectedPlatforms.map((p) => `${PLATFORM_CONFIG[p].name}: ${PLATFORM_CONFIG[p].limits.tips}`);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold">{t('publish.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Video Preview */}
          {videoThumbnail && (
            <div
              className={`p-4 rounded-xl flex items-center gap-4 ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
              }`}
            >
              <img
                src={videoThumbnail}
                alt="Video preview"
                className="w-40 rounded-lg shadow-md object-cover"
              />
              <div>
                <div className="font-medium">{content.title || 'Untitled Video'}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {videoBlob ? `${(videoBlob.size / (1024 * 1024)).toFixed(1)} MB` : ''}
                </div>
                {coverUrl && (
                  <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Cover image ready
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Platform Selection */}
          <div
            className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}
          >
            <h3 className="font-semibold mb-3">{t('publish.selectPlatforms')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(
                Object.entries(PLATFORM_CONFIG) as [
                  SocialPlatform,
                  (typeof PLATFORM_CONFIG)[SocialPlatform],
                ][]
              ).map(([platform, config]) => {
                const account = accounts.find((a) => a.platform === platform);
                const isSelected = selectedPlatforms.includes(platform);

                return (
                  <div
                    key={platform}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : theme === 'dark'
                        ? 'border-gray-700 hover:border-gray-600'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => account?.isConnected && handlePlatformToggle(platform)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: config.color }}
                      >
                        {config.icon}
                      </div>
                      {account?.isConnected ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            disconnectAccount(account.id);
                          }}
                          className="text-gray-400 hover:text-red-400"
                          title={t('publish.disconnect')}
                        >
                          <Unlink className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConnect(platform);
                          }}
                          className="text-gray-400 hover:text-indigo-400"
                          title={t('publish.connect')}
                        >
                          <Link className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="font-medium text-sm">{config.name}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {account?.isConnected ? account.username : t('publish.notConnected')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Platform Tips */}
          {tips.length > 0 && (
            <div
              className={`p-3 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-indigo-900/20 border-indigo-800/30 text-indigo-300'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}
            >
              {tips.map((tip, i) => (
                <div key={i}>{tip}</div>
              ))}
            </div>
          )}

          {/* Content Editor */}
          <div
            className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{t('publish.content')}</h3>
              <button
                onClick={handleClearDraft}
                className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                {t('publish.clear')}
              </button>
            </div>
            <div className="space-y-3">
              {/* Title */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Title</label>
                  <span
                    className={`text-xs ${
                      content.title.length > titleMax ? 'text-red-400' : 'text-gray-500'
                    }`}
                  >
                    {content.title.length}/{titleMax}
                  </span>
                </div>
                <input
                  type="text"
                  value={content.title}
                  onChange={(e) => setContent((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={t('publish.titlePlaceholder')}
                  maxLength={titleMax + 20}
                  className={`w-full mt-1 px-3 py-2 rounded-lg border ${
                    content.title.length > titleMax
                      ? 'border-red-500/50'
                      : theme === 'dark'
                      ? 'border-gray-600'
                      : 'border-gray-300'
                  } ${
                    theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
                  }`}
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Description</label>
                  <span
                    className={`text-xs ${
                      content.description.length > descMax ? 'text-red-400' : 'text-gray-500'
                    }`}
                  >
                    {content.description.length}/{descMax}
                  </span>
                </div>
                <textarea
                  value={content.description}
                  onChange={(e) => setContent((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={t('publish.descriptionPlaceholder')}
                  rows={4}
                  className={`w-full mt-1 px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm text-gray-400">{t('publish.tags')}</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add a tag..."
                    className={`flex-1 px-3 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    {t('publish.addTag')}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {content.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-sm flex items-center gap-1"
                    >
                      #{tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Publish Status */}
          {publishStatuses.length > 0 && (
            <div
              className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{t('publish.publishStatus')}</h3>
                <button onClick={clearStatuses} className="text-sm text-gray-400 hover:text-white">
                  {t('publish.clear')}
                </button>
              </div>
              <div className="space-y-2">
                {publishStatuses.map((status, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status.status)}
                      <span className="font-medium">{PLATFORM_CONFIG[status.platform].name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {status.status === 'success' && status.publishedUrl && (
                        <a
                          href={status.publishedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {status.error && (
                        <span className="text-sm text-red-400">{status.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex items-center justify-between ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-400">
            {t('publish.platformsSelected', { count: selectedPlatforms.length })}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {t('publish.cancel')}
            </button>
            <button
              onClick={handlePublish}
              disabled={selectedPlatforms.length === 0 || !content.title || isLoading}
              className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                selectedPlatforms.length === 0 || !content.title || isLoading
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {t('publish.publish')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublishDashboard;
