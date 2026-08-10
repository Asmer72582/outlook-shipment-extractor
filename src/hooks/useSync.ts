import { useState, useCallback } from 'react';
import { syncOutlookEmails, type SyncStep } from '@/services/syncService';
import { useAuth } from '@/hooks/useAuth';
import type { SyncResult } from '@/types/outlook';

const STEP_ORDER: SyncStep[] = [
  'connecting',
  'searching',
  'processing',
  'extracting',
  'duplicates',
  'saving',
  'done',
];

export function useSync() {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentStep, setCurrentStep] = useState<SyncStep | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async (): Promise<SyncResult | null> => {
    if (!isAuthenticated) {
      const message = 'Connect Outlook to start extracting shipments.';
      setError(message);
      throw new Error(message);
    }

    setIsSyncing(true);
    setError(null);
    setResult(null);
    setCurrentStep('connecting');

    try {
      const syncResult = await syncOutlookEmails(getAccessToken, setCurrentStep);
      setResult(syncResult);
      return syncResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sync Outlook emails.';
      setError(message);
      throw err;
    } finally {
      setIsSyncing(false);
      setCurrentStep('done');
    }
  }, [getAccessToken, isAuthenticated]);

  const completedSteps = currentStep
    ? STEP_ORDER.indexOf(currentStep)
    : 0;

  return {
    sync,
    isSyncing,
    currentStep,
    completedSteps,
    result,
    error,
    clearResult: () => setResult(null),
  };
}
