import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useIsAuthenticated } from '@azure/msal-react';
import { Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { consumeAuthError } from '@/auth/AuthProvider';
import { getMicrosoftAuthority, getRedirectUri } from '@/auth/msalConfig';

function getFriendlyAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes('useraudience') ||
    lower.includes('aadsts50020') ||
    (lower.includes('personal') && lower.includes('microsoft'))
  ) {
    return (
      'This work or school account cannot sign in with the current Microsoft app settings. ' +
      'Set VITE_MICROSOFT_AUTHORITY=common in your environment variables and redeploy. ' +
      'In Microsoft Entra, your app must support "Accounts in any organizational directory and personal Microsoft accounts".'
    );
  }

  if (lower.includes('useraudience') && lower.includes('/common/')) {
    return (
      'Your Microsoft app is registered for personal accounts only, but the app is using the /common/ sign-in endpoint. ' +
      'Either set VITE_MICROSOFT_AUTHORITY=consumers (personal only), or change your Entra app to support all account types and use common.'
    );
  }

  if (message.includes('50147') || lower.includes('session state cookie')) {
    return (
      'Microsoft login session is overloaded (AADSTS50147). Close other Microsoft login tabs, ' +
      'clear cookies for login.microsoftonline.com, then try again. Using a private/incognito window also helps.'
    );
  }

  if (lower.includes('popup') || lower.includes('blocked')) {
    return (
      'Sign-in popup was blocked. Allow popups for this site in your browser, then click Connect Outlook again.'
    );
  }

  if (message.includes('90023') || message.includes('redirect_uri')) {
    const redirectUri = getRedirectUri();
    return (
      `Redirect URI mismatch (AADSTS90023). Add this exact URI in Microsoft Entra → your app → Authentication → Single-page application redirect URIs: ${redirectUri} ` +
      '(no trailing slash). Then save and wait ~1 minute before trying again.'
    );
  }

  return message;
}

export function LoginPage() {
  const isAuthenticated = useIsAuthenticated();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const authError = consumeAuthError();
    if (authError) {
      setError(getFriendlyAuthError(authError));
    }
  }, []);

  const handleLogin = async () => {
    setError(null);
    setLoggingIn(true);
    try {
      await login();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Microsoft sign-in failed.';
      setError(getFriendlyAuthError(message));
    } finally {
      setLoggingIn(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const authority = getMicrosoftAuthority();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Truck className="h-7 w-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Shipment Mail Extractor</CardTitle>
            <CardDescription className="mt-2">
              Sign in with your work, school, or personal Microsoft account to read Outlook emails.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button className="w-full" size="lg" onClick={handleLogin} disabled={loggingIn}>
            {loggingIn ? 'Opening Microsoft sign-in...' : 'Connect Outlook'}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Your email content is processed locally in your browser. Only extracted shipment
            information is stored locally.
          </p>
          <p className="text-xs text-center text-muted-foreground">
            Sign-in endpoint: {authority.replace('https://login.microsoftonline.com/', '')}
          </p>
          <p className="text-xs text-center text-muted-foreground break-all">
            Redirect URI: {getRedirectUri()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
