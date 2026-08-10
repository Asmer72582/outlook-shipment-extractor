import { useRef, useState } from 'react';
import { Upload, Search, Download, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { readConfiguration } from '@/db/repositories/configurationRepository';
import { parseContainerExcel, getParseSummary, type SheetInfo } from '@/utils/excelParser';
import { checkContainersAgainstEmails, type CheckProgress } from '@/services/containerChecker.service';
import { downloadContainerResultsCsv } from '@/utils/containerCsv';
import { formatDate, formatDateTime } from '@/utils/date';
import { formatContainerHawb } from '@/utils/containerDisplay';
import type { ContainerCheckResult, ExcelContainerRow } from '@/types/checkShipment';

const PAGE_SIZE = 50;

function StatusBadge({ status }: { status: ContainerCheckResult['status'] }) {
  if (status === 'found') return <Badge variant="success">Found in email</Badge>;
  if (status === 'already_in_excel') return <Badge variant="secondary">Already in Excel</Badge>;
  return <Badge variant="destructive">Not found</Badge>;
}

export function CheckShipmentPage() {
  const { isAuthenticated, login, getAccessToken } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [sheetName, setSheetName] = useState<string>('');
  const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
  const [rows, setRows] = useState<ExcelContainerRow[]>([]);
  const [results, setResults] = useState<ContainerCheckResult[]>([]);
  const [checkStats, setCheckStats] = useState<{
    emailsFetched: number;
    foundInEmail: number;
    notFound: number;
  } | null>(null);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState<CheckProgress | null>(null);
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsSearch, setResultsSearch] = useState('');

  const summary = rows.length ? getParseSummary(rows) : null;

  const filteredResults = results.filter((row) => {
    if (!resultsSearch.trim()) return true;
    const q = resultsSearch.toLowerCase();
    const combined = formatContainerHawb(row.containerNo, row.hawb).toLowerCase();
    return (
      combined.includes(q) ||
      row.emailSubject?.toLowerCase().includes(q) ||
      row.status.includes(q)
    );
  });

  const totalResultPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const paginatedResults = filteredResults.slice(
    (resultsPage - 1) * PAGE_SIZE,
    resultsPage * PAGE_SIZE
  );

  const loadSheet = (buffer: ArrayBuffer, selectedSheet?: string) => {
    const parsed = parseContainerExcel(buffer, selectedSheet);
    if (parsed.rows.length === 0) {
      toast({
        title: 'No containers found',
        description: 'Could not find ContainerNo/HAWB column in the selected sheet.',
        variant: 'destructive',
      });
      return false;
    }
    setSheetName(parsed.sheetName);
    setAvailableSheets(parsed.availableSheets);
    setRows(parsed.rows);
      setResults([]);
      setCheckStats(null);
      setResultsPage(1);
      return true;
  };

  const handleFileUpload = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);
      setFileName(file.name);
      const ok = loadSheet(buffer);
      if (ok) {
        const parsed = parseContainerExcel(buffer);
        toast({
          title: 'Excel loaded',
          description: `${parsed.rows.length} rows from "${parsed.sheetName}" (${parsed.availableSheets.length} sheets available).`,
        });
      }
    } catch {
      toast({ title: 'Failed to read Excel file', variant: 'destructive' });
    }
  };

  const handleSheetChange = (newSheet: string) => {
    if (!fileBuffer) return;
    if (loadSheet(fileBuffer, newSheet)) {
      const parsed = parseContainerExcel(fileBuffer, newSheet);
      toast({
        title: 'Sheet changed',
        description: `Loaded ${parsed.rows.length} rows from "${newSheet}".`,
      });
    }
  };

  const handleCheck = async () => {
    if (!isAuthenticated) {
      toast({ title: 'Connect Outlook first', variant: 'destructive' });
      return;
    }
    if (rows.length === 0) {
      toast({ title: 'Upload an Excel file first', variant: 'destructive' });
      return;
    }

    setChecking(true);
    setProgress(null);
    setResults([]);
    setCheckStats(null);
    setResultsPage(1);

    try {
      const token = await getAccessToken();
      const config = await readConfiguration();
      const { results: checkResults, stats } = await checkContainersAgainstEmails(
        token,
        rows,
        config,
        onlyMissing,
        setProgress
      );
      setResults(checkResults);
      setCheckStats({
        emailsFetched: stats.emailsFetched,
        foundInEmail: stats.foundInEmail,
        notFound: stats.notFound,
      });
      toast({
        title: 'Check complete',
        description: `Scanned ${stats.emailsFetched} emails · ${stats.foundInEmail} containers matched · ${stats.notFound} not found.`,
      });
    } catch (err) {
      toast({
        title: 'Check failed',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
      setProgress(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Connect Outlook to check container CIPL dates against emails.</p>
          <Button onClick={() => login()}>Connect Outlook</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Check Shipment — CIPL Date Received
          </CardTitle>
          <CardDescription>
            Upload your PRIMARK Excel file (<strong>PRM DATA</strong> sheet). Searches Outlook for
            invoice emails from <strong>FranchiseInvoices@primark.com</strong> — e.g. &quot;container
            number DEL00003301&quot;. CIPL date uses the email received date when the commercial
            invoice is attached.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
            }}
          />

          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Excel
            </Button>
            {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
          </div>

          {availableSheets.length > 1 && (
            <div className="space-y-2 max-w-sm">
              <Label htmlFor="sheetSelect">Excel sheet</Label>
              <select
                id="sheetSelect"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={sheetName}
                onChange={(e) => handleSheetChange(e.target.value)}
              >
                {availableSheets.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.containerCount} containers)
                  </option>
                ))}
              </select>
            </div>
          )}

          {summary && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Total rows</p>
                <p className="text-2xl font-semibold">{summary.total}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Unique containers</p>
                <p className="text-2xl font-semibold">{summary.uniqueContainers}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Missing CIPL date</p>
                <p className="text-2xl font-semibold text-amber-600">{summary.missingDocDate}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Already have CIPL date</p>
                <p className="text-2xl font-semibold text-green-600">{summary.hasDocDate}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-md border p-4">
            <input
              id="onlyMissing"
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={onlyMissing}
              onChange={(e) => setOnlyMissing(e.target.checked)}
            />
            <label htmlFor="onlyMissing" className="text-sm cursor-pointer">
              Only check rows <strong>missing CIPLDATERECEIVED</strong> in Excel (search Outlook for the rest)
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleCheck} disabled={checking || rows.length === 0}>
              <Search className={`h-4 w-4 mr-2 ${checking ? 'animate-pulse' : ''}`} />
              {checking ? 'Checking emails...' : 'Check against Outlook emails'}
            </Button>
            {results.length > 0 && (
              <Button variant="outline" onClick={() => downloadContainerResultsCsv(results)}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>

          {checking && progress && (
            <div className="rounded-md bg-muted/50 p-4 text-sm space-y-1">
              <p className="font-medium">
                {progress.phase === 'fetching'
                  ? 'Fetching emails from configured senders (all folders)...'
                  : 'Matching container numbers in email subject + body...'}
              </p>
              <p className="text-muted-foreground">
                Emails scanned: {progress.emailsChecked}
                {progress.phase === 'matching' && ` · Containers to check: ${progress.totalContainers}`}
              </p>
            </div>
          )}

          {checkStats && !checking && (
            <div className="rounded-md border p-4 text-sm space-y-1">
              <p className="font-medium">Email scan summary</p>
              <p className="text-muted-foreground">
                {checkStats.emailsFetched} emails fetched from configured senders ·{' '}
                {checkStats.foundInEmail} containers matched · {checkStats.notFound} not found in any email
              </p>
              {checkStats.emailsFetched === 0 && (
                <p className="text-destructive">
                  No emails returned. Confirm sender addresses in Settings match the From address exactly,
                  and that shipment notifications exist in your mailbox.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {checking && !results.length && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Missing CIPL Date — Results ({filteredResults.length} containers)
            </CardTitle>
            <CardDescription>
              All containers missing CIPLDATERECEIVED in Excel, cross-checked against Outlook emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search container / HAWB..."
                className="pl-9"
                value={resultsSearch}
                onChange={(e) => {
                  setResultsSearch(e.target.value);
                  setResultsPage(1);
                }}
              />
            </div>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Container No / HAWB</TableHead>
                  <TableHead>CIPL Date (Excel)</TableHead>
                  <TableHead>CIPL Date (Email)</TableHead>
                  <TableHead>Email Received</TableHead>
                  <TableHead>Email Subject</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedResults.map((row) => (
                  <TableRow key={`${row.rowIndex}-${row.containerNo}`}>
                    <TableCell className="font-mono text-sm">
                      {formatContainerHawb(row.containerNo, row.hawb)}
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      {row.status === 'found' && row.ciplDateReceived
                        ? formatDate(row.ciplDateReceived)
                        : row.status === 'found' && row.emailReceivedAt
                          ? formatDate(row.emailReceivedAt)
                          : '—'}
                    </TableCell>
                    <TableCell>
                      {row.emailReceivedAt ? formatDateTime(row.emailReceivedAt) : '—'}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm">
                      {row.emailSubject || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            {totalResultPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Page {resultsPage} of {totalResultPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={resultsPage <= 1}
                    onClick={() => setResultsPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={resultsPage >= totalResultPages}
                    onClick={() => setResultsPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
