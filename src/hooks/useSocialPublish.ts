import { useState, useCallback, useEffect } from 'react';
import {
  publishApi,
  type SocialPlatform,
  type PublishAccount,
  type PublishContent,
  type PublishStatus,
} from '../services/publish';

interface UseSocialPublishReturn {
  accounts: PublishAccount[];
  isLoading: boolean;
  error: string | null;
  publishStatuses: PublishStatus[];
  fetchAccounts: () => Promise<void>;
  connectAccount: (platform: SocialPlatform) => Promise<string>;
  disconnectAccount: (accountId: string) => Promise<void>;
  publishToPlatform: (platform: SocialPlatform, content: PublishContent) => Promise<void>;
  publishToMultiple: (platforms: SocialPlatform[], content: PublishContent) => Promise<void>;
  clearStatuses: () => void;
}

export const useSocialPublish = (): UseSocialPublishReturn => {
  const [accounts, setAccounts] = useState<PublishAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishStatuses, setPublishStatuses] = useState<PublishStatus[]>([]);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await publishApi.getAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connectAccount = useCallback(async (platform: SocialPlatform): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const { authUrl } = await publishApi.connectAccount(platform);
      return authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect account');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnectAccount = useCallback(async (accountId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await publishApi.disconnectAccount(accountId);
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect account');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const publishToPlatform = useCallback(async (platform: SocialPlatform, content: PublishContent) => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await publishApi.publishToPlatform(platform, content);
      setPublishStatuses((prev) => [...prev, status]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const publishToMultiple = useCallback(async (platforms: SocialPlatform[], content: PublishContent) => {
    setIsLoading(true);
    setError(null);
    try {
      const statuses = await publishApi.publishToMultiple(platforms, content);
      setPublishStatuses((prev) => [...prev, ...statuses]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearStatuses = useCallback(() => {
    setPublishStatuses([]);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    isLoading,
    error,
    publishStatuses,
    fetchAccounts,
    connectAccount,
    disconnectAccount,
    publishToPlatform,
    publishToMultiple,
    clearStatuses,
  };
};
