import { PublicClientApplication, EventType, type AccountInfo } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { useEffect, useState } from 'react';
import { msalConfig } from './msalConfig';

export const msalInstance = new PublicClientApplication(msalConfig);

export const AUTH_ERROR_KEY = 'shipment-mail-extractor:auth-error';

let initialized = false;

function storeAuthError(message: string): void {
  sessionStorage.setItem(AUTH_ERROR_KEY, message);
}

export function consumeAuthError(): string | null {
  const message = sessionStorage.getItem(AUTH_ERROR_KEY);
  if (message) {
    sessionStorage.removeItem(AUTH_ERROR_KEY);
  }
  return message;
}

export async function initializeMsal(): Promise<void> {
  if (initialized) return;
  await msalInstance.initialize();

  try {
    await msalInstance.handleRedirectPromise();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Microsoft sign-in failed. Please try again.';
    storeAuthError(message);
  }

  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as { account: AccountInfo };
      msalInstance.setActiveAccount(payload.account);
    }
  });

  initialized = true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeMsal()
      .then(() => setReady(true))
      .catch((error) => {
        storeAuthError(error instanceof Error ? error.message : 'Failed to initialize sign-in.');
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
