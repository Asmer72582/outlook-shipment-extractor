import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Inbox, Mail, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { fetchInboxPage, getEmailBody } from '@/services/graphService';
import { readConfiguration } from '@/db/repositories/configurationRepository';
import { formatDateTime } from '@/utils/date';
import { normalizeEmailBody } from '@/utils/htmlToText';
import type { GraphMessage } from '@/types/outlook';

export function InboxPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login, getAccessToken } = useAuth();
  const { toast } = useToast();
  const config = useLiveQuery(() => readConfiguration(), []);

  const [messages, setMessages] = useState<GraphMessage[]>([]);
  const [nextLink, setNextLink] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBody, setSelectedBody] = useState<string | null>(null);
  const [loadingBody, setLoadingBody] = useState(false);

  useEffect(() => {
    if (config && !config.enableInboxViewer) {
      navigate('/settings', { replace: true });
    }
  }, [config, navigate]);

  const loadInbox = useCallback(
    async (append = false, pageLink?: string) => {
      if (!isAuthenticated) return;

      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const token = await getAccessToken();
        const page = await fetchInboxPage(token, append ? pageLink : undefined);

        setMessages((prev) => (append ? [...prev, ...page.messages] : page.messages));
        setNextLink(page.nextLink);

        if (!append && page.messages.length > 0) {
          setSelectedId(page.messages[0].id);
        }
        if (!append && page.messages.length === 0) {
          setSelectedId(null);
        }
      } catch (err) {
        toast({
          title: 'Unable to load inbox',
          description: err instanceof Error ? err.message : undefined,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [getAccessToken, isAuthenticated, toast]
  );

  useEffect(() => {
    if (isAuthenticated && config?.enableInboxViewer) {
      void loadInbox(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, config?.enableInboxViewer]);

  const filteredMessages = useMemo(() => {
    if (!search.trim()) return messages;
    const q = search.toLowerCase();
    return messages.filter(
      (msg) =>
        msg.subject?.toLowerCase().includes(q) ||
        msg.from?.emailAddress?.address?.toLowerCase().includes(q) ||
        msg.from?.emailAddress?.name?.toLowerCase().includes(q) ||
        msg.bodyPreview?.toLowerCase().includes(q)
    );
  }, [messages, search]);

  const selectedMessage = filteredMessages.find((m) => m.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedMessage || !isAuthenticated) {
      setSelectedBody(null);
      return;
    }

    let cancelled = false;
    setLoadingBody(true);
    setSelectedBody(null);

    getAccessToken()
      .then((token) => getEmailBody(token, selectedMessage.id))
      .then((full) => {
        if (cancelled) return;
        const body = full.body;
        if (body) {
          setSelectedBody(normalizeEmailBody(body.content, body.contentType));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedBody(selectedMessage.bodyPreview || 'Unable to load email body.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBody(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMessage, getAccessToken, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Connect Outlook to view your inbox.</p>
          <Button onClick={() => login()}>Connect Outlook</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                Outlook Inbox
              </CardTitle>
              <CardDescription>
                Browse your Outlook inbox inside the portal. Messages are not stored locally.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadInbox(false)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inbox..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5 min-h-[520px] border rounded-lg overflow-hidden">
            <div className="lg:col-span-2 border-r bg-muted/20 overflow-y-auto max-h-[600px]">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No emails found.
                </div>
              ) : (
                <ul>
                  {filteredMessages.map((msg) => {
                    const active = msg.id === selectedId;
                    return (
                      <li key={msg.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(msg.id)}
                          className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-accent/50 ${
                            active ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm truncate ${msg.isRead === false ? 'font-semibold' : ''}`}>
                              {msg.from?.emailAddress?.name ||
                                msg.from?.emailAddress?.address ||
                                'Unknown sender'}
                            </p>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatDateTime(msg.receivedDateTime)}
                            </span>
                          </div>
                          <p className={`text-sm truncate mt-0.5 ${msg.isRead === false ? 'font-medium' : 'text-muted-foreground'}`}>
                            {msg.subject || '(No subject)'}
                          </p>
                          {msg.bodyPreview && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {msg.bodyPreview}
                            </p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {nextLink && !loading && (
                <div className="p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => loadInbox(true, nextLink)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading...' : 'Load more'}
                  </Button>
                </div>
              )}
            </div>

            <div className="lg:col-span-3 overflow-y-auto max-h-[600px] p-6">
              {!selectedMessage ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Select an email to read
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedMessage.subject || '(No subject)'}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      From:{' '}
                      <span className="text-foreground">
                        {selectedMessage.from?.emailAddress?.name
                          ? `${selectedMessage.from.emailAddress.name} <${selectedMessage.from.emailAddress.address}>`
                          : selectedMessage.from?.emailAddress?.address}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Received: {formatDateTime(selectedMessage.receivedDateTime)}
                    </p>
                  </div>
                  <div className="border-t pt-4">
                    {loadingBody ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                        {selectedBody || 'No content'}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
