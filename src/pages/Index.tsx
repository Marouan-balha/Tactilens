import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusIndicator } from '@/components/StatusIndicator';
import { AnalysisReport } from '@/components/AnalysisReport';
import { OppositionDashboard } from '@/components/dashboard/OppositionDashboard';
import { ThinkingTrace } from '@/components/ThinkingTrace';
import { Switch } from '@/components/ui/switch';
import { useOppositionAnalyst } from '@/hooks/useOppositionAnalyst';
import { Send, RotateCcw, Zap, Shield, Target, LayoutDashboard, MessageSquare, Database, BookOpen, Brain, Flame, Play } from 'lucide-react';
import teamsData from '@/data/teams.json';
import { WorldCupSection } from '@/components/WorldCupSection';
import { internationalTeams } from '@/lib/internationalTeams';
import { VideoEvidenceUpload } from '@/components/VideoEvidenceUpload';

const allTeams = [...teamsData, ...internationalTeams];

const QUICK_PROMPTS = [
  { label: 'Full Report', icon: Target, prompt: 'Generate a complete opposition analysis report for this team.', heatmap: true },
  { label: 'Weaknesses', icon: Shield, prompt: 'What are the key tactical weaknesses we can exploit against this team?', heatmap: true },
  { label: 'Counter Strategy', icon: Zap, prompt: 'Recommend a tactical game plan to beat this team, including formation, pressing triggers, and key matchups.', heatmap: false },
];

export default function Index() {
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [input, setInput] = useState('');
  const [showHeatmaps, setShowHeatmaps] = useState(false);
  const [showThinking, setShowThinking] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const { messages, status, error, analyze, reset, ragSources, thinking } = useOppositionAnalyst();

  const currentTeam = allTeams.find(t => t.id === selectedTeam);

  const handleSubmit = () => {
    if (!input.trim()) return;
    setActiveTab('report');
    analyze(input, selectedTeam || undefined);
    setInput('');
  };

  const handleQuickPrompt = (prompt: string, heatmap: boolean) => {
    if (!selectedTeam) return;
    setShowHeatmaps(heatmap);
    setActiveTab('report');
    analyze(prompt, selectedTeam);
  };

  const isLoading = status === 'thinking' || status === 'analyzing';

  return (
    <div className="min-h-screen bg-background dark">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                TactiLens<span className="text-primary">.ai</span>
              </h1>
              <p className="text-xs text-muted-foreground">Opposition Analyst Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/match-intelligence">
              <Button variant="default" size="sm" className="gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                <Play className="h-3.5 w-3.5 fill-current" />
                Match Intelligence
              </Button>
            </Link>
            <Link to="/knowledge">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Database className="h-3.5 w-3.5" />
                Knowledge Base
              </Button>
            </Link>
            <StatusIndicator status={status} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 min-h-[calc(100vh-120px)]">
          
          {/* Left Panel — Controls */}
          <div className="space-y-4">
            <VideoEvidenceUpload />
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Team Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Choose opponent..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Clubs</div>
                    {teamsData.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} — {team.league}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1 mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">International Teams</div>
                    {internationalTeams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} — {team.league}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedTeam && currentTeam && (
                  <div className="text-xs space-y-1.5 text-muted-foreground pt-1">
                    <div className="flex justify-between">
                      <span>Manager</span>
                      <span className="text-foreground font-medium">{currentTeam.manager}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Formation</span>
                      <span className="text-foreground font-medium">{currentTeam.formation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Style</span>
                      <span className="text-foreground font-medium text-right max-w-[160px]">{currentTeam.style}</span>
                    </div>
                    <div className="flex gap-1 pt-1">
                      {currentTeam.recent_form.map((r, i) => (
                        <span
                          key={i}
                          className={`h-5 w-5 rounded text-[10px] font-bold flex items-center justify-center ${
                            r === 'W' ? 'bg-primary/20 text-primary' :
                            r === 'D' ? 'bg-accent/20 text-accent' :
                            'bg-destructive/20 text-destructive'
                          }`}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {QUICK_PROMPTS.map(({ label, icon: Icon, prompt, heatmap }) => (
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 text-xs"
                    disabled={!selectedTeam || isLoading}
                    onClick={() => handleQuickPrompt(prompt, heatmap)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {messages.length > 0 && (
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                New Analysis
              </Button>
            )}
          </div>

          {/* Right Panel — Tabbed View */}
          <div className="flex flex-col gap-4 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
              <TabsList className="w-fit bg-card/80 border border-border/50 backdrop-blur-sm">
                <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="report" className="gap-1.5 text-xs">
                  <MessageSquare className="h-3.5 w-3.5" />
                  AI Report
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="flex-1 mt-4 overflow-y-auto">
                {currentTeam ? (
                  <OppositionDashboard teamData={currentTeam} />
                ) : (
                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full flex items-center justify-center min-h-[400px]">
                    <div className="text-center space-y-3">
                      <div className="text-5xl">📊</div>
                      <p className="text-lg font-medium text-foreground">Select a team to view dashboard</p>
                      <p className="text-sm text-muted-foreground">Analytics and tactical data will appear here</p>
                    </div>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="report" className="flex-1 mt-4 flex flex-col gap-4 min-h-0">
                <Card className="flex-1 border-border/50 bg-card/80 backdrop-blur-sm flex flex-col overflow-hidden">
                  <CardHeader className="pb-3 flex-shrink-0 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Analysis Report
                    </CardTitle>
                    <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
                      <Brain className="h-3.5 w-3.5" />
                      <span>Show reasoning</span>
                      <Switch checked={showThinking} onCheckedChange={setShowThinking} />
                    </label>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto space-y-3">
                    {showThinking && (
                      <ThinkingTrace
                        steps={thinking}
                        active={status === 'thinking' || status === 'analyzing'}
                      />
                    )}
                    {ragSources.length > 0 && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                        <BookOpen className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-primary mb-1">
                            Knowledge base · {ragSources.length} source{ragSources.length === 1 ? '' : 's'} used
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {ragSources.slice(0, 6).map((s) => (
                              <span
                                key={s.document_id}
                                title={`${s.title} (${s.source_type})`}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-background/60 border border-border/40 text-muted-foreground truncate max-w-[220px]"
                              >
                                {s.title}
                              </span>
                            ))}
                            {ragSources.length > 6 && (
                              <span className="text-[10px] text-muted-foreground">+{ragSources.length - 6} more</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <AnalysisReport
                      messages={messages}
                      selectedTeamId={selectedTeam}
                      teamData={currentTeam}
                      showHeatmaps={showHeatmaps && status === 'completed'}
                    />
                  </CardContent>
                </Card>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5">
                    {error}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Input — always visible */}
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={selectedTeam ? 'Ask the analyst agent...' : 'Select a team first...'}
                className="min-h-[52px] max-h-[120px] resize-none bg-card/80 backdrop-blur-sm text-sm"
                disabled={isLoading}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="h-[52px] px-5"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* World Cup 2026 */}
        <div className="mt-6">
          <WorldCupSection />
        </div>
      </div>
    </div>
  );
}
