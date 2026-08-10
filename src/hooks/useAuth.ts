import { InteractionRequiredAuthError, BrowserAuthError } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import { useCallback } from 'react';
import { graphScopes, loginRequest } from '@/auth/authConfig';
import { getRedirectUri } from '@/auth/msalConfig';

function isUserCancelled(error: unknown): boolean {
  return (
    error instanceof BrowserAuthError &&
    (error.errorCode === 'user_cancelled' || error.errorCode === 'popup_window_error')
  );
}

export function useAuth() {
  const { instance, accounts, inProgress } = useMsal();
  const account = accounts[0] ?? null;
  const isAuthenticated = !!account;

  const login = useCallback(async () => {
    try {
      const result = await instance.loginPopup({
        ...loginRequest,
        redirectUri: getRedirectUri(),
      });
      if (result.account) {
        instance.setActiveAccount(result.account);
      }
    } catch (error) {
      if (isUserCancelled(error)) return;
      throw error;
    }
  }, [instance]);

  const logout = useCallback(async () => {
    await instance.logoutPopup({
      account: account ?? undefined,
      postLogoutRedirectUri: getRedirectUri(),
    });
  }, [instance, account]);

  const getAccessToken = useCallback(async (): Promise<string> => {
    const activeAccount = instance.getActiveAccount() ?? account;
    if (!activeAccount) {
      throw new Error('Not signed in to Microsoft');
    }

    try {
      const response = await instance.acquireTokenSilent({
        ...graphScopes,
        account: activeAccount,
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        const response = await instance.acquireTokenPopup({
          ...graphScopes,
          account: activeAccount,
          redirectUri: getRedirectUri(),
        });
        return response.accessToken;
      }
      throw error;
    }
  }, [instance, account]);

  return {
    account,
    isAuthenticated,
    inProgress,
    login,
    logout,
    getAccessToken,
  };
}
