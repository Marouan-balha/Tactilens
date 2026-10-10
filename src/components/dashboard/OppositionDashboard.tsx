import { useState } from 'react';
import { KPICard } from './KPICard';
import { TacticalRadar } from './TacticalRadar';
import { MatchStatsChart } from './MatchStatsChart';
import { StrengthWeaknessPanel } from './StrengthWeaknessPanel';
import { KeyPlayersTable } from './KeyPlayersTable';
import { FormStrip } from './FormStrip';
import { PitchHeatmap } from '@/components/PitchHeatmap';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Users, Swords, TrendingUp, Target, Download, FileText, Loader2, BookOpen, ShieldCheck } from 'lucide-react';
import matchesData from '@/data/matches.json';
import { internationalMatches } from '@/lib/internationalTeams';
import { generateReport, type MatchData, type TeamData as ReportTeamData } from '@/lib/generateReport';
import { getFifaProfile } from '@/data/fifaTacticalProfiles';
import { generateFifaReport } from '@/lib/generateFifaReport';

const allMatches = [...matchesData, ...internationalMatches];

type TeamData = ReportTeamData;

interface OppositionDashboardProps {
  teamData: TeamData;
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5 pt-2 pb-1">
      <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

export function OppositionDashboard({ teamData }: OppositionDashboardProps) {
  const [exportingType, setExportingType] = useState<'summary' | 'detailed' | null>(null);

  const teamMatches = allMatches.filter(
    m => m.home_team === teamData.id || m.away_team === teamData.id
  );

  const wins = teamData.recent_form.filter(r => r === 'W').length;
  const winRate = Math.round((wins / teamData.recent_form.length) * 100);

  const avgXG = teamMatches.length > 0
    ? (teamMatches.reduce((sum, m) => {
        const isHome = m.home_team === teamData.id;
        return sum + (isHome ? m.xg.home : m.xg.away);
      }, 0) / teamMatches.length).toFixed(2)
    : '—';

  const avgPossession = teamMatches.length > 0
    ? Math.round(teamMatches.reduce((sum, m) => {
        const isHome = m.home_team === teamData.id;
        return sum + (isHome ? m.possession.home : m.possession.away);
      }, 0) / teamMatches.length)
    : 0;

  const handleExport = async (type: 'summary' | 'detailed') => {
    setExportingType(type);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      generateReport(teamData as ReportTeamData, allMatches as MatchData[], type);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExportingType(null);
    }
  };

  const fifaProfile = getFifaProfile(teamData.id);
  const handleFifaExport = async () => {
    setExportingType('detailed');
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (fifaProfile) generateFifaReport(fifaProfile);
    } catch (err) {
      console.error('PFSA report export failed:', err);
    } finally {
      setExportingType(null);
    }
  };

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-3">
      {/* Export Controls */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => handleExport('summary')}
          disabled={exportingType !== null}
        >
          {exportingType === 'summary' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {exportingType === 'summary' ? 'Generating…' : 'Summary PDF'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs border-accent/30 text-accent hover:bg-accent/10"
          onClick={() => handleExport('detailed')}
          disabled={exportingType !== null}
        >
          {exportingType === 'detailed' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
          {exportingType === 'detailed' ? 'Generating…' : 'Tactical Report'}
        </Button>
        {fifaProfile && (
          <Button
            variant="default"
            size="sm"
            className="gap-2 text-xs"
            onClick={handleFifaExport}
            disabled={exportingType !== null}
          >
            {exportingType === 'detailed' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            PFSA Report
          </Button>
        )}
      </div>

      {/* Report Body */}
      <div className="space-y-5 bg-background rounded-xl p-5 border border-border/40">
        {/* Report Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  Opposition Analysis Report
                </span>
              </div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {teamData.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {teamData.league} · {teamData.formation} · {teamData.style}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <img
                src="/analyst-profile.jpg"
                alt="Opposition Analyst"
                className="h-14 w-14 rounded-full object-cover border-2 border-primary/30 ring-2 ring-primary/10"
                loading="lazy"
                width={56}
                height={56}
              />
              <div className="text-right space-y-0.5">
                <p className="text-[10px] text-muted-foreground font-mono">{today}</p>
                <p className="text-[10px] text-muted-foreground">Manager: <span className="text-foreground font-medium">{teamData.manager}</span></p>
                <div className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full mt-1">
                  <Target className="h-2.5 w-2.5" />
                  TACTIVISION.AI
                </div>
              </div>
            </div>
          </div>
          <Separator className="bg-border/50" />
        </div>

        {/* Section 1: Key Metrics */}
        <div>
          <SectionHeader icon={TrendingUp} title="Performance Overview" subtitle="Key metrics from recent fixtures" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <KPICard title="Win Rate" value={`${winRate}%`} subtitle={`Last ${teamData.recent_form.length} games`} icon={TrendingUp} trend={winRate >= 60 ? 'up' : winRate >= 40 ? 'neutral' : 'down'} />
            <KPICard title="Avg xG" value={avgXG} subtitle="Per match" icon={Target} accentColor="hsl(var(--accent))" />
            <KPICard title="Avg Possession" value={`${avgPossession}%`} subtitle="Per match" icon={Swords} accentColor="hsl(var(--chart-3))" />
            <KPICard title="Squad" value={teamData.key_players.length} subtitle="Key players tracked" icon={Users} accentColor="hsl(var(--chart-4))" />
          </div>
        </div>

        {/* Section 2: Tactical Analysis */}
        <div>
          <SectionHeader icon={Target} title="Tactical Analysis" subtitle="Radar profile and match-by-match xG" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <TacticalRadar teamData={teamData} />
            <MatchStatsChart matches={teamMatches} teamId={teamData.id} />
          </div>
        </div>

        {/* Section 3: Form & SWOT */}
        <div>
          <SectionHeader icon={Swords} title="Form & SWOT Analysis" subtitle="Recent results and tactical traits" />
          <div className="mt-3 space-y-4">
            <FormStrip form={teamData.recent_form} teamName={teamData.name} />
            <StrengthWeaknessPanel strengths={teamData.strengths} weaknesses={teamData.weaknesses} />
          </div>
        </div>

        {/* Section 4: Key Players */}
        <div>
          <SectionHeader icon={Users} title="Key Personnel" subtitle="Players to watch and individual traits" />
          <div className="mt-3">
            <KeyPlayersTable players={teamData.key_players} />
          </div>
        </div>

        {/* Section 5: Heatmaps */}
        <div>
          <SectionHeader icon={Target} title="Spatial Analysis" subtitle="Zone dominance and vulnerability mapping" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <PitchHeatmap teamId={teamData.id} mode="attacking" teamData={teamData} />
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <PitchHeatmap teamId={teamData.id} mode="defensive" teamData={teamData} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tactical Breakdown */}
        <div>
          <SectionHeader icon={FileText} title="Tactical Patterns" subtitle="Detailed phase-of-play breakdown" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {Object.entries(teamData.tactical_patterns).map(([phase, description]) => (
              <Card key={phase} className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-4 space-y-1.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    {phase.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-xs text-foreground/80 leading-relaxed">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Report Footer */}
        <Separator className="bg-border/50" />
        <div className="flex items-center justify-between text-[9px] text-muted-foreground/50">
          <span>Generated by Tactivision.ai · Confidential</span>
          <span>{today}</span>
        </div>
      </div>
    </div>
  );
}
