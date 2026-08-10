import { Configuration } from '@azure/msal-browser';

/**
 * Resolves the Microsoft authority URL.
 *
 * VITE_MICROSOFT_AUTHORITY values:
 * - common        → All account types (requires Entra "Multitenant + personal" / All audience)
 * - consumers     → Personal Microsoft accounts only (Entra "Personal Microsoft accounts")
 * - organizations → Work/school accounts only
 * - {tenant-id}   → Single tenant
 * - Full URL      → Used as-is
 */
export function getMicrosoftAuthority(): string {
  const value = import.meta.env.VITE_MICROSOFT_AUTHORITY?.trim() || 'common';

  if (value.startsWith('https://')) {
    return value;
  }

  return `https://login.microsoftonline.com/${value}`;
}

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    authority: getMicrosoftAuthority(),
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};
