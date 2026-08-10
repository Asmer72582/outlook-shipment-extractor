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

/**
 * OAuth redirect URI sent to Microsoft. Must exactly match a SPA redirect URI
 * registered in Microsoft Entra (no trailing slash).
 */
export function getRedirectUri(): string {
  const configured = import.meta.env.VITE_MICROSOFT_REDIRECT_URI?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  return window.location.origin;
}

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    authority: getMicrosoftAuthority(),
    redirectUri: getRedirectUri(),
    postLogoutRedirectUri: getRedirectUri(),
    // React Router handles navigation — avoids extra redirect state (AADSTS50147)
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    allowRedirectInIframe: false,
  },
};
