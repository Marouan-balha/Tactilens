import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, ShieldAlert, Gauge, Activity, Flame } from 'lucide-react';
import { formatPpdaInsights, type PpdaSummaryData } from '@/lib/ppdaUtils';

interface PpdaGaugeChartProps {
  summaryData?: PpdaSummaryData;
  chartImage?: string;
}

export function PpdaGaugeChart({
  summaryData,
  chartImage = '/output/08fd33_4/ppda_gauge_chart.png'
}: PpdaGaugeChartProps) {
  const insights = formatPpdaInsights(summaryData);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" /> Pressing Intensity (PPDA) Gauge & Trend Analysis
            </CardTitle>
            <CardDescription className="text-xs">
              Passes Allowed Per Defensive Action in attacking 60% of pitch. Lower PPDA = Higher Pressing Intensity.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" /> High Press: &lt;10 PPDA
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> Mid-Block: 10–14 PPDA
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Python-Generated PPDA Dual-Panel Speedo/Bar & Trend Chart */}
        <div className="relative w-full rounded-lg border border-border/50 overflow-hidden bg-[#0e1726] p-2">
          <img
            src={chartImage}
            alt="Pressing Intensity PPDA Gauge & 15-Min Trend Chart"
            className="w-full h-auto object-contain rounded-md shadow-lg"
          />
        </div>

        {/* Tactical Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
          {insights.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                  <Gauge className="h-4 w-4 text-primary" /> {item.teamName}
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${item.badgeColor}`}>
                  {item.pressingCategory}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{item.score}</span>
                <span className="text-xs text-muted-foreground font-medium">Passes Allowed / Def. Action</span>
              </div>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Tactical Context Footnote */}
        <div className="p-3 rounded-lg border border-border/50 bg-secondary/30 text-xs text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary shrink-0" />
          <span>
            <strong>Tactical Rule:</strong> Teams with PPDA &lt; 10.0 rely on aggressive counter-pressing (Gegenpressing) to force turnovers in the opposition build-up third.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
