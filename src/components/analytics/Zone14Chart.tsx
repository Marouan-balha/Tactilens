import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Compass, Flame, ShieldCheck, Play, Film } from 'lucide-react';
import { formatZone14Insights, type Zone14SummaryData } from '@/lib/zone14Utils';

interface Zone14ChartProps {
  summaryData?: Zone14SummaryData;
  outputBasePath?: string;
  onSelectClip?: (seconds: number, label: string) => void;
}

export function Zone14Chart({
  summaryData,
  outputBasePath = '/output/08fd33_4',
  onSelectClip
}: Zone14ChartProps) {
  const [selectedView, setSelectedView] = useState<'team0' | 'team1' | 'combined'>('team0');
  const insights = formatZone14Insights(summaryData);

  const team0Img = summaryData?.team0?.zone14Image ? `${outputBasePath}/${summaryData.team0.zone14Image}` : `${outputBasePath}/zone14_entries_team0.png`;
  const team1Img = summaryData?.team1?.zone14Image ? `${outputBasePath}/${summaryData.team1.zone14Image}` : `${outputBasePath}/zone14_entries_team1.png`;
  const combinedImg = `${outputBasePath}/zone14_entries_chart.png`;

  const activeImg = selectedView === 'team0' ? team0Img : selectedView === 'team1' ? team1Img : combinedImg;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-400" /> Zone 14 & Half-Space Attacking Entry Plot
            </CardTitle>
            <CardDescription className="text-xs">
              Pinpoints central build-up origin vectors right outside the penalty box (Zone 14) and half-spaces.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 bg-background/60 p-1 rounded-lg border border-border/50 text-xs">
            <button
              onClick={() => setSelectedView('team0')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                selectedView === 'team0'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Chelsea U18
            </button>
            <button
              onClick={() => setSelectedView('team1')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                selectedView === 'team1'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Arsenal U18
            </button>
            <button
              onClick={() => setSelectedView('combined')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                selectedView === 'combined'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Combined Match
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Python-Generated Pitch Diagram */}
        <div className="relative w-full rounded-lg border border-border/50 overflow-hidden bg-[#0e1726] p-2">
          <img
            src={activeImg}
            alt="Zone 14 and Half-Space Entry Vectors Diagram"
            className="w-full h-auto object-contain rounded-md shadow-lg"
          />
        </div>

        {/* Tactical Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
          {insights.map((item, idx) => {
            const clipSeconds = idx === 0 ? 1100.0 : 2648.0;
            const clipLabel = idx === 0 ? 'Chelsea: Min 18 Left Half-Space Penetration' : 'Arsenal: Min 44 Right Half-Space Transition';
            return (
              <div
                key={idx}
                className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-2 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                    <Target className="h-4 w-4 text-amber-400" /> {item.teamName}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-primary/20 text-primary border border-primary/30">
                    {item.primaryChannel}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
                  <div className="p-2 rounded bg-background/40 border border-border/40">
                    <span className="text-[11px] block text-muted-foreground">Zone 14 Volume</span>
                    <span className="text-base font-bold text-foreground">{item.zone14Volume} touches</span>
                  </div>
                  <div className="p-2 rounded bg-background/40 border border-border/40">
                    <span className="text-[11px] block text-muted-foreground">Half-Space Balance (L / R)</span>
                    <span className="text-xs font-semibold text-foreground">{item.halfSpaceRatio}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    Threat: <strong className="text-foreground">{item.threatRating}</strong>
                  </p>
                  {onSelectClip && (
                    <button
                      type="button"
                      onClick={() => onSelectClip(clipSeconds, clipLabel)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-secondary hover:bg-primary hover:text-primary-foreground text-primary text-[11px] font-medium transition-colors"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Seek Clip
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
