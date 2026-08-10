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
  if (message.includes("userAudience") && message.includes('/common/')) {
    return (
      'Your Microsoft app is registered for personal accounts only, but the app is using the /common/ sign-in endpoint. ' +
      'Set VITE_MICROSOFT_AUTHORITY=consumers in your environment variables and redeploy, ' +
      'or change your Entra app to support "All account types".'
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

  useEffect(() => {
    const authError = consumeAuthError();
    if (authError) {
      setError(getFriendlyAuthError(authError));
    }
  }, []);

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
              Automatically extract shipment details from Outlook emails.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button className="w-full" size="lg" onClick={() => login()}>
            Connect Outlook
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
