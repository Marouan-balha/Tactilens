import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, ShieldAlert, ArrowDownCircle, ArrowUpCircle, Play } from 'lucide-react';
import { computeDefensiveLineStats, type TimeSeriesPoint } from '@/lib/defensiveLineUtils';

interface DefensiveLineChartProps {
  timeSeriesData?: TimeSeriesPoint[];
  chartImage?: string;
  onSelectClip?: (seconds: number, label: string) => void;
}

export function DefensiveLineChart({
  timeSeriesData = [],
  chartImage = '/output/08fd33_4/defensive_line_chart.png',
  onSelectClip
}: DefensiveLineChartProps) {
  const stats = computeDefensiveLineStats(timeSeriesData);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Defensive Line Height Over Time (0–90 Mins)
            </CardTitle>
            <CardDescription className="text-xs">
              Tracks 1-minute rolling average distance ($m$) of the defensive backline from goal.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
              Chelsea: {stats.team0Avg}m avg
            </span>
            <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 font-semibold border border-red-500/30">
              Arsenal: {stats.team1Avg}m avg
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Python Generated Matplotlib Time-Series Chart */}
        <div className="relative w-full rounded-lg border border-border/50 overflow-hidden bg-[#0e1726] p-2">
          <img
            src={chartImage}
            alt="Defensive Line Height Time-Series Plot"
            className="w-full h-auto object-contain rounded-md shadow-lg"
          />
        </div>

        {/* Tactical Breakdown Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-2.5 rounded-lg border border-border/50 bg-background/50 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-blue-400">
                <ArrowUpCircle className="h-4 w-4" />
                <span>Chelsea Max Press</span>
              </div>
              {onSelectClip && (
                <button
                  type="button"
                  onClick={() => onSelectClip(435.0, 'Chelsea: High Press Transition (Minute 7)')}
                  className="p-1 rounded bg-secondary hover:bg-primary hover:text-primary-foreground text-primary transition-colors"
                  title="Play Clip"
                >
                  <Play className="h-3 w-3 fill-current" />
                </button>
              )}
            </div>
            <p className="text-lg font-bold text-foreground">{stats.team0Max.height}m</p>
            <p className="text-[11px] text-muted-foreground">Reached at Min {stats.team0Max.minute}</p>
          </div>

          <div className="p-2.5 rounded-lg border border-border/50 bg-background/50 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-blue-400">
                <ArrowDownCircle className="h-4 w-4" />
                <span>Chelsea Deepest Drop</span>
              </div>
              {onSelectClip && (
                <button
                  type="button"
                  onClick={() => onSelectClip(1740.0, 'Chelsea: Low Block Defending (Minute 29)')}
                  className="p-1 rounded bg-secondary hover:bg-primary hover:text-primary-foreground text-primary transition-colors"
                  title="Play Clip"
                >
                  <Play className="h-3 w-3 fill-current" />
                </button>
              )}
            </div>
            <p className="text-lg font-bold text-foreground">{stats.team0Min.height}m</p>
            <p className="text-[11px] text-muted-foreground">Low block at Min {stats.team0Min.minute}</p>
          </div>

          <div className="p-2.5 rounded-lg border border-border/50 bg-background/50 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-red-400">
                <ArrowUpCircle className="h-4 w-4" />
                <span>Arsenal Max Press</span>
              </div>
              {onSelectClip && (
                <button
                  type="button"
                  onClick={() => onSelectClip(2640.0, 'Arsenal: High Counter Press (Minute 44)')}
                  className="p-1 rounded bg-secondary hover:bg-primary hover:text-primary-foreground text-primary transition-colors"
                  title="Play Clip"
                >
                  <Play className="h-3 w-3 fill-current" />
                </button>
              )}
            </div>
            <p className="text-lg font-bold text-foreground">{stats.team1Max.height}m</p>
            <p className="text-[11px] text-muted-foreground">Reached at Min {stats.team1Max.minute}</p>
          </div>

          <div className="p-2.5 rounded-lg border border-border/50 bg-background/50 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-red-400">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>Backline Vulnerability</span>
              </div>
              {onSelectClip && (
                <button
                  type="button"
                  onClick={() => onSelectClip(4280.0, 'Arsenal: Box Compression Breach (Minute 71)')}
                  className="p-1 rounded bg-secondary hover:bg-primary hover:text-primary-foreground text-primary transition-colors"
                  title="Play Clip"
                >
                  <Play className="h-3 w-3 fill-current" />
                </button>
              )}
            </div>
            <p className="text-lg font-bold text-foreground">
              {(stats.team0Avg - stats.team1Avg).toFixed(1)}m Delta
            </p>
            <p className="text-[11px] text-muted-foreground">Chelsea sits slightly deeper on average</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
