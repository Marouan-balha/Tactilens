import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, TrendingUp, Sparkles, Award, ShieldAlert, BarChart3, ListFilter, Play, Film } from 'lucide-react';
import { computeXgStats, DEFAULT_MATCH_SHOTS, type ShotEvent, type XgSummaryData } from '@/lib/xgUtils';

interface XgFlowChartProps {
  summaryData?: XgSummaryData;
  shotsData?: ShotEvent[];
  chartImage?: string;
  onSelectShot?: (shot: ShotEvent) => void;
  activeShotId?: number;
}

export function XgFlowChart({
  summaryData,
  shotsData,
  chartImage = '/output/08fd33_4/xg_flow_chart.png',
  onSelectShot,
  activeShotId,
}: XgFlowChartProps) {
  const [activeView, setActiveView] = useState<'chart' | 'shots'>('shots');
  const [filterTeam, setFilterTeam] = useState<'all' | '0' | '1'>('all');

  const resolvedShots = (shotsData && shotsData.length > 0) ? shotsData : DEFAULT_MATCH_SHOTS;
  const stats = computeXgStats(summaryData, resolvedShots);

  const filteredShots = resolvedShots.filter((shot) => {
    if (filterTeam === 'all') return true;
    return String(shot.team) === filterTeam;
  });

  const getOutcomeBadge = (outcome: ShotEvent['outcome']) => {
    switch (outcome) {
      case 'goal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            ★ GOAL
          </span>
        );
      case 'saved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            SAVED
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
            BLOCKED
          </span>
        );
      case 'missed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30">
            OFF TARGET
          </span>
        );
    }
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-400" /> Expected Goals (xG) & Threat Progression
            </CardTitle>
            <CardDescription className="text-xs">
              Step-function cumulative threat curve and granular 10-shot classified occurrence table.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-background/60 p-1 rounded-lg border border-border/50 text-xs">
              <button
                onClick={() => setActiveView('chart')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                  activeView === 'chart'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" /> Flow Chart
              </button>
              <button
                onClick={() => setActiveView('shots')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                  activeView === 'shots'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ListFilter className="h-3.5 w-3.5" /> Shot Matrix ({resolvedShots.length})
              </button>
            </div>
          </div>
        </div>

        {/* Live Score & xG Header Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="font-bold text-foreground">{stats.team0Name}</span>
            <span className="text-muted-foreground">|</span>
            <span className="font-bold text-blue-400">{stats.team0Goals} Goals</span>
            <span className="text-[11px] text-muted-foreground">({stats.team0Xg} xG)</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="font-bold text-foreground">{stats.team1Name}</span>
            <span className="text-muted-foreground">|</span>
            <span className="font-bold text-red-400">{stats.team1Goals} Goal</span>
            <span className="text-[11px] text-muted-foreground">({stats.team1Xg} xG)</span>
          </div>

          <div className="ml-auto text-xs text-muted-foreground hidden md:block">
            xG Delta: <span className="font-bold text-emerald-400">+{(stats.team0Xg - stats.team1Xg).toFixed(2)} Chelsea</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {activeView === 'chart' ? (
          /* Python Generated Matplotlib Cumulative xG Chart */
          <div className="relative w-full rounded-lg border border-border/50 overflow-hidden bg-[#0e1726] p-2">
            <img
              src={chartImage}
              alt="90-Minute Cumulative Expected Goals Flow Chart"
              className="w-full h-auto object-contain rounded-md shadow-lg"
            />
          </div>
        ) : (
          /* Detailed Shot Matrix Table */
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 text-primary" />
                Click any shot row to <span className="text-primary font-bold">seek match video clip</span>
              </span>
              <div className="flex items-center gap-1 bg-background/50 p-1 rounded border border-border/40">
                <button
                  onClick={() => setFilterTeam('all')}
                  className={`px-2 py-0.5 rounded text-[11px] ${filterTeam === 'all' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterTeam('0')}
                  className={`px-2 py-0.5 rounded text-[11px] ${filterTeam === '0' ? 'bg-blue-600 text-white font-bold' : 'text-muted-foreground'}`}
                >
                  Chelsea
                </button>
                <button
                  onClick={() => setFilterTeam('1')}
                  className={`px-2 py-0.5 rounded text-[11px] ${filterTeam === '1' ? 'bg-red-600 text-white font-bold' : 'text-muted-foreground'}`}
                >
                  Arsenal
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/50 bg-[#0e1726]">
              <table className="w-full text-left text-xs">
                <thead className="bg-card/70 border-b border-border/50 text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3 w-10">Clip</th>
                    <th className="p-3">Min</th>
                    <th className="p-3">Team</th>
                    <th className="p-3">Shooter</th>
                    <th className="p-3">Assister (xA)</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">xG Probability</th>
                    <th className="p-3 text-right">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredShots.map((shot, idx) => {
                    const isSelected = activeShotId === (shot.id ?? idx);
                    return (
                      <tr
                        key={idx}
                        onClick={() => onSelectShot?.(shot)}
                        className={`cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-primary/20 border-l-4 border-primary'
                            : 'hover:bg-card/40'
                        }`}
                      >
                        <td className="p-3">
                          <button
                            type="button"
                            className={`p-1.5 rounded-full transition-transform active:scale-95 ${
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary/70 hover:bg-primary hover:text-primary-foreground text-primary'
                            }`}
                            title="Play clip evidence"
                          >
                            <Play className="h-3 w-3 fill-current" />
                          </button>
                        </td>
                        <td className="p-3 font-mono font-bold text-foreground">
                          {shot.minute}&apos;
                          {(() => {
                            const sec = (shot.clipStartSeconds !== undefined && shot.clipStartSeconds > 0)
                              ? shot.clipStartSeconds
                              : (shot.minute ? shot.minute * 60 : 0);
                            const m = Math.floor(sec / 60);
                            const s = Math.floor(sec % 60);
                            return (
                              <span className="block text-[10px] text-muted-foreground font-normal">
                                {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            shot.team === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {shot.team === 0 ? 'Chelsea' : 'Arsenal'}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-foreground">
                          {shot.player}
                          {shot.description && (
                            <span className="block text-[10px] text-muted-foreground font-normal truncate max-w-[180px]">
                              {shot.description}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {shot.assister} <span className="text-[10px] text-emerald-400 font-bold">({shot.xa} xA)</span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {shot.isHeader ? 'Header' : 'Right/Left Foot'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-background/60 rounded-full h-2 overflow-hidden border border-border/40">
                              <div
                                className={`h-full rounded-full ${
                                  shot.xg >= 0.7
                                    ? 'bg-emerald-500'
                                    : shot.xg >= 0.4
                                      ? 'bg-amber-500'
                                      : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(100, shot.xg * 100)}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-foreground">{shot.xg}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right">{getOutcomeBadge(shot.outcome)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tactical Shot KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <Award className="h-4 w-4" />
              <span>Highest Quality Chance</span>
            </div>
            <p className="text-base font-bold text-foreground">
              {stats.bestShot?.player ?? '#9 (ST)'} — {stats.bestShot?.xg ?? 0.88} xG
            </p>
            <p className="text-[11px] text-muted-foreground">
              Minute {stats.bestShot?.minute}&apos; ({stats.bestShot?.isHeader ? 'Header' : 'Foot'}) • {stats.bestShot?.outcome.toUpperCase()}
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Leading Creator (xA)</span>
            </div>
            <p className="text-base font-bold text-foreground">{stats.topCreator.player}</p>
            <p className="text-[11px] text-muted-foreground">
              Created {stats.topCreator.xa} xA for {stats.topCreator.team}
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-blue-400">
              <Target className="h-4 w-4" />
              <span>Chelsea Conversion Delta</span>
            </div>
            <p className="text-base font-bold text-foreground">
              {stats.team0Diff > 0 ? `+${stats.team0Diff}` : stats.team0Diff} Delta
            </p>
            <p className="text-[11px] text-muted-foreground">
              {stats.team0Goals} Goals vs {stats.team0Xg} Expected Goals
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-red-400">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span>Arsenal Conversion Delta</span>
            </div>
            <p className="text-base font-bold text-foreground">
              {stats.team1Diff > 0 ? `+${stats.team1Diff}` : stats.team1Diff} Delta
            </p>
            <p className="text-[11px] text-muted-foreground">
              {stats.team1Goals} Goal vs {stats.team1Xg} Expected Goals
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
