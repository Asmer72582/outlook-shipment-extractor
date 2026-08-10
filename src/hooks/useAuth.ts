import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import { useCallback } from 'react';
import { graphScopes, loginRequest } from '@/auth/authConfig';
import { getRedirectUri } from '@/auth/msalConfig';

export function useAuth() {
  const { instance, accounts, inProgress } = useMsal();
  const account = accounts[0] ?? null;
  const isAuthenticated = !!account;

  const login = useCallback(async () => {
    await instance.loginRedirect(loginRequest);
  }, [instance]);

  const logout = useCallback(async () => {
    await instance.logoutRedirect({
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
        await instance.acquireTokenRedirect(graphScopes);
        throw new Error('Interactive login required');
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
