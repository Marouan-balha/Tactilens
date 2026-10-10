import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ingestPdf, ingestYoutube, listDocuments, fetchFootballContent, syncFootballStats, ingestKaggleKernel, ingestFifaReports, type RagDocument, type SyncStatsResult, type KaggleIngestResult, type FifaReportIngestResult } from '@/lib/rag-api';
import { Upload, Youtube, FileText, Database, Loader2, CheckCircle, XCircle, ArrowLeft, RefreshCw, Globe, Rss, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // PDF form
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfTags, setPdfTags] = useState('');
  const [pdfUploading, setPdfUploading] = useState(false);

  // YouTube form
  const [ytUrl, setYtUrl] = useState('');
  const [ytTitle, setYtTitle] = useState('');
  const [ytTags, setYtTags] = useState('');
  const [ytIngesting, setYtIngesting] = useState(false);

  // Auto-fetch
  const [autoFetching, setAutoFetching] = useState(false);
  const [fetchResults, setFetchResults] = useState<{ title: string; source: string; chunks: number }[]>([]);

  // Stats sync
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncStatsResult[]>([]);

  // Kaggle ingest
  const [kaggleRef, setKaggleRef] = useState('swaptr/fifa-world-cup-2026-exploratory-data-analysis');
  const [kaggleIngesting, setKaggleIngesting] = useState(false);
  const [kaggleResults, setKaggleResults] = useState<KaggleIngestResult[]>([]);

  // FIFA report ingest
  const [fifaTeam, setFifaTeam] = useState('France');
  const [fifaIngesting, setFifaIngesting] = useState(false);
  const [fifaResults, setFifaResults] = useState<FifaReportIngestResult[]>([]);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (e: unknown) {
      console.error('Failed to fetch documents:', e);
      const message = e instanceof Error ? e.message : '';
      const msg = message.includes('Failed to fetch')
        ? 'Backend temporarily unavailable. Please retry in a moment.'
        : (message || 'Could not load documents.');
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return toast.error('Please select a PDF file');
    if (!pdfTitle.trim()) return toast.error('Please enter a title');

    setPdfUploading(true);
    try {
      const result = await ingestPdf(pdfFile, pdfTitle, pdfTags);
      if (result.success) {
        toast.success(`PDF ingested: ${result.chunks_created} chunks created`);
        setPdfFile(null);
        setPdfTitle('');
        setPdfTags('');
        fetchDocs();
      } else {
        toast.error(result.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setPdfUploading(false);
    }
  };

  const handleYoutubeIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytUrl.trim()) return toast.error('Please enter a YouTube URL');

    setYtIngesting(true);
    try {
      const result = await ingestYoutube(ytUrl, ytTitle, ytTags);
      if (result.success) {
        toast.success(result.transcript_available
          ? `Video transcript ingested: ${result.chunks_created} chunks created`
          : 'Video saved as a reference because no transcript was available');
        setYtUrl('');
        setYtTitle('');
        setYtTags('');
        fetchDocs();
      } else {
        toast.error(result.error || 'Ingestion failed');
      }
    } catch {
      toast.error('Ingestion failed');
    } finally {
      setYtIngesting(false);
    }
  };

  const handleAutoFetch = async () => {
    setAutoFetching(true);
    setFetchResults([]);
    try {
      const result = await fetchFootballContent(15);
      if (result.success) {
        toast.success(`Fetched ${result.articles_ingested} new articles from football sources`);
        setFetchResults(result.results || []);
        fetchDocs();
      } else {
        toast.error(result.error || 'Auto-fetch failed');
      }
    } catch {
      toast.error('Auto-fetch failed');
    } finally {
      setAutoFetching(false);
    }
  };

  const handleStatsSync = async () => {
    setSyncing(true);
    setSyncResults([]);
    try {
      const result = await syncFootballStats();
      if (result.success) {
        const ingested = (result.results || []).filter(r => r.status === 'ingested').length;
        toast.success(`Stats sync complete: ${ingested} new snapshots`);
        setSyncResults(result.results || []);
        fetchDocs();
      } else {
        toast.error(result.error || 'Stats sync failed');
      }
    } catch {
      toast.error('Stats sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleKaggleIngest = async () => {
    setKaggleIngesting(true);
    setKaggleResults([]);
    try {
      const result = await ingestKaggleKernel(kaggleRef.trim() || undefined, true);
      if (result.success) {
        const ingested = (result.results || []).filter(r => r.status === 'ingested').length;
        toast.success(`Kaggle ingest complete: ${ingested} document(s)`);
        setKaggleResults(result.results || []);
        fetchDocs();
      } else {
        toast.error(result.error || 'Kaggle ingest failed');
      }
    } catch {
      toast.error('Kaggle ingest failed');
    } finally {
      setKaggleIngesting(false);
    }
  };

  const handleFifaReportIngest = async () => {
    setFifaIngesting(true);
    setFifaResults([]);
    try {
      const result = await ingestFifaReports({ team: fifaTeam.trim() || undefined, maxReports: fifaTeam.trim() ? 8 : 16, force: false });
      if (result.success) {
        const ingested = (result.results || []).filter(r => r.status === 'ingested').length;
        toast.success(`FIFA reports imported: ${ingested} document(s)`);
        setFifaResults(result.results || []);
        fetchDocs();
      } else {
        toast.error(result.error || 'FIFA report import failed');
      }
    } catch {
      toast.error('FIFA report import failed');
    } finally {
      setFifaIngesting(false);
    }
  };

  const sourceIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'youtube': return <Youtube className="h-4 w-4" />;
      case 'article': return <Globe className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'ready': return <Badge variant="default" className="bg-primary/20 text-primary border-primary/30"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>;
      case 'processing': return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'error': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background dark">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5" />Back</Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Knowledge Base
            </h1>
            <p className="text-xs text-muted-foreground">Ingest football content for the analyst agent</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Auto-Fetch Card */}
        <Card className="border-primary/30 bg-primary/5 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Rss className="h-4 w-4 text-primary" />
              Auto-Fetch Football Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Automatically fetch the latest articles, analysis, and insights from BBC Sport, The Guardian, ESPN, The Athletic, StatsBomb, and more.
            </p>
            <Button onClick={handleAutoFetch} disabled={autoFetching} className="w-full">
              {autoFetching ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Fetching from football sources...</>
              ) : (
                <><Rss className="h-4 w-4 mr-2" />Fetch Latest Football Content</>
              )}
            </Button>
            {fetchResults.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Just fetched:</p>
                {fetchResults.map((r, i) => (
                  <div key={i} className="text-xs flex items-start gap-2 p-2 rounded bg-background/50 border border-border/30">
                    <Globe className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{r.title}</p>
                      <p className="text-muted-foreground">{r.source} · {r.chunks} chunks</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Sync Card */}
        <Card className="border-accent/30 bg-accent/5 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Sync Match Stats (Official league sites via Firecrawl)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Pulls live standings, fixtures and results directly from the official sites: uefa.com (UCL), premierleague.com, bundesliga.com, legaseriea.it, laliga.com, ligue1.com. Scraped via Firecrawl (handles JS rendering). Runs daily at 06:00 UTC; use this button to trigger manually.
            </p>
            <Button onClick={handleStatsSync} disabled={syncing} className="w-full" variant="secondary">
              {syncing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scraping & ingesting...</>
              ) : (
                <><BarChart3 className="h-4 w-4 mr-2" />Sync Stats Now</>
              )}
            </Button>
            {syncResults.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sync results:</p>
                {syncResults.map((r, i) => (
                  <div key={i} className="text-xs flex items-center justify-between gap-2 p-2 rounded bg-background/50 border border-border/30">
                    <span className="font-medium text-foreground truncate">{r.competition}</span>
                    <span className={`text-xs ${r.status === 'ingested' ? 'text-primary' : 'text-muted-foreground'}`}>
                      {r.status}{r.chunks ? ` · ${r.chunks} chunks` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kaggle Ingest Card */}
        <Card className="border-primary/30 bg-primary/5 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Import Kaggle Analysis (kernel + dataset)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Pulls a Kaggle notebook's analysis narrative, code, and any input/output datasets, then ingests them into the knowledge base. Enter a kernel ref as <code className="font-mono">owner/kernel-slug</code>.
            </p>
            <Input
              value={kaggleRef}
              onChange={(e) => setKaggleRef(e.target.value)}
              placeholder="owner/kernel-slug"
              className="font-mono text-xs"
            />
            <Button onClick={handleKaggleIngest} disabled={kaggleIngesting || !kaggleRef.trim()} className="w-full" variant="secondary">
              {kaggleIngesting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Pulling & ingesting...</>
              ) : (
                <><Database className="h-4 w-4 mr-2" />Import from Kaggle</>
              )}
            </Button>
            {kaggleResults.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Import results:</p>
                {kaggleResults.map((r, i) => (
                  <div key={i} className="text-xs flex items-center justify-between gap-2 p-2 rounded bg-background/50 border border-border/30">
                    <span className="font-medium text-foreground truncate">{r.part}</span>
                    <span className={`text-xs ${r.status === 'ingested' ? 'text-primary' : 'text-muted-foreground'}`}>
                      {r.status}{r.chunks ? ` · ${r.chunks} chunks` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* FIFA Report Ingest Card */}
        <Card className="border-accent/30 bg-accent/5 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Import FIFA World Cup Match Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Pulls FIFA Training Centre group-stage post-match summary reports and stores team-tagged match examples for international-team analysis. Leave the team empty to import the first batch.
            </p>
            <Input
              value={fifaTeam}
              onChange={(e) => setFifaTeam(e.target.value)}
              placeholder="Team name (e.g. France)"
              className="text-xs"
            />
            <Button onClick={handleFifaReportIngest} disabled={fifaIngesting} className="w-full" variant="secondary">
              {fifaIngesting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Pulling FIFA reports...</>
              ) : (
                <><FileText className="h-4 w-4 mr-2" />Import FIFA Reports</>
              )}
            </Button>
            {fifaResults.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">FIFA import results:</p>
                {fifaResults.map((r, i) => (
                  <div key={i} className="text-xs flex items-center justify-between gap-2 p-2 rounded bg-background/50 border border-border/30">
                    <span className="font-medium text-foreground truncate">{r.report}</span>
                    <span className={`text-xs ${r.status === 'ingested' ? 'text-primary' : 'text-muted-foreground'}`}>
                      {r.status}{r.chunks ? ` · ${r.chunks} chunks` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>


        {/* Manual Ingestion */}
        <Tabs defaultValue="pdf" className="w-full">
          <TabsList className="bg-card/80 border border-border/50">
            <TabsTrigger value="pdf" className="gap-1.5 text-xs">
              <Upload className="h-3.5 w-3.5" />PDF Upload
            </TabsTrigger>
            <TabsTrigger value="youtube" className="gap-1.5 text-xs">
              <Youtube className="h-3.5 w-3.5" />YouTube
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdf">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Upload Football PDF</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePdfUpload} className="space-y-3">
                  <Input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="bg-background/50 text-sm" />
                  <Input placeholder="Document title (e.g. 'Bayern München Scouting Report')" value={pdfTitle} onChange={e => setPdfTitle(e.target.value)} className="bg-background/50 text-sm" />
                  <Input placeholder="Team tags, comma-separated (e.g. 'bayern münchen, real madrid')" value={pdfTags} onChange={e => setPdfTags(e.target.value)} className="bg-background/50 text-sm" />
                  <Button type="submit" disabled={pdfUploading || !pdfFile} className="w-full">
                    {pdfUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><Upload className="h-4 w-4 mr-2" />Upload & Ingest</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="youtube">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Ingest YouTube Video</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleYoutubeIngest} className="space-y-3">
                  <Input placeholder="YouTube URL (e.g. https://youtube.com/watch?v=...)" value={ytUrl} onChange={e => setYtUrl(e.target.value)} className="bg-background/50 text-sm" />
                  <Input placeholder="Title (recommended if captions are unavailable)" value={ytTitle} onChange={e => setYtTitle(e.target.value)} className="bg-background/50 text-sm" />
                  <Input placeholder="Team tags, comma-separated (e.g. 'liverpool, arsenal')" value={ytTags} onChange={e => setYtTags(e.target.value)} className="bg-background/50 text-sm" />
                  <Button type="submit" disabled={ytIngesting || !ytUrl.trim()} className="w-full">
                    {ytIngesting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Ingesting...</> : <><Youtube className="h-4 w-4 mr-2" />Ingest Video</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Document List */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Ingested Documents ({documents.length})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchDocs} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {loading && documents.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading...
              </div>
            ) : fetchError && documents.length === 0 ? (
              <div className="text-center py-8 text-sm space-y-2">
                <XCircle className="h-8 w-8 mx-auto mb-2 text-destructive opacity-70" />
                <p className="text-destructive">{fetchError}</p>
                <Button variant="outline" size="sm" onClick={fetchDocs}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Retry
                </Button>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No documents ingested yet</p>
                <p className="text-xs mt-1">Use Auto-Fetch or upload PDFs/YouTube videos to build the knowledge base</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
                    <div className="text-muted-foreground">{sourceIcon(doc.source_type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground capitalize">{doc.source_type}</span>
                        {doc.team_tags && doc.team_tags.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            · {doc.team_tags.join(', ')}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          · {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {statusBadge(doc.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
