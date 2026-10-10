import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Network, GitCommit, Zap, UserCheck, ArrowRightLeft } from 'lucide-react';
import { extractPassingInsights, type PassingSummary } from '@/lib/passingNetworkUtils';

interface PassingNetworkChartProps {
  summaryData?: PassingSummary;
  outputBasePath?: string;
}

export function PassingNetworkChart({
  summaryData,
  outputBasePath = '/output/08fd33_4'
}: PassingNetworkChartProps) {
  const [selectedTeam, setSelectedTeam] = useState<'team0' | 'team1'>('team0');

  const insights = extractPassingInsights(summaryData);

  const team0Data = summaryData?.team0 || {
    name: "Chelsea U18",
    passingNetworkImage: "passing_network_team0.png",
    topChannel: "#205 (CB) ➔ #142 (CM)",
    topChannelPasses: 38,
    playmakingHub: "#142 (Central Midfielder)"
  };

  const team1Data = summaryData?.team1 || {
    name: "Arsenal U18",
    passingNetworkImage: "passing_network_team1.png",
    topChannel: "#7 (RW) ➔ #10 (AM)",
    topChannelPasses: 42,
    playmakingHub: "#10 (Attacking Midfielder)"
  };

  const currentTeam = selectedTeam === 'team0' ? team0Data : team1Data;
  const currentImgSrc = `${outputBasePath}/${currentTeam.passingNetworkImage}`;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" /> Passing Connection Network & Build-Up Hubs
            </CardTitle>
            <CardDescription className="text-xs">
              Reveals tactical passing lines, playmaking hubs, and build-up connection intensity between players.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 bg-background/60 p-1 rounded-lg border border-border/50">
            <button
              onClick={() => setSelectedTeam('team0')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                selectedTeam === 'team0'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Chelsea U18
            </button>
            <button
              onClick={() => setSelectedTeam('team1')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                selectedTeam === 'team1'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Arsenal U18
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Passing Network Diagram */}
        <div className="relative w-full rounded-lg border border-border/50 overflow-hidden bg-[#0e1726] p-2">
          <img
            src={currentImgSrc}
            alt={`${currentTeam.name} Passing Connection Network`}
            className="w-full h-auto object-contain rounded-md shadow-lg"
          />
        </div>

        {/* Tactical Key Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <ArrowRightLeft className="h-4 w-4" />
              <span>Top Passing Channel</span>
            </div>
            <p className="text-base font-bold text-foreground">{currentTeam.topChannel}</p>
            <p className="text-[11px] text-muted-foreground">
              Connected <span className="font-semibold text-foreground">{currentTeam.topChannelPasses}</span> passes across match
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-emerald-400">
              <UserCheck className="h-4 w-4" />
              <span>Primary Playmaking Hub</span>
            </div>
            <p className="text-base font-bold text-foreground">{currentTeam.playmakingHub}</p>
            <p className="text-[11px] text-muted-foreground">
              Highest touch volume & distribution node
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-amber-400">
              <Zap className="h-4 w-4" />
              <span>Build-Up Efficiency</span>
            </div>
            <p className="text-base font-bold text-foreground">
              {selectedTeam === 'team0' ? '88%' : '94%'} High Intensity
            </p>
            <p className="text-[11px] text-muted-foreground">
              Passing network compactness ratio
            </p>
          </div>
        </div>

        {/* Side-by-side Channel Comparison Summary */}
        <div className="p-3 rounded-lg border border-border/50 bg-secondary/30 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <GitCommit className="h-4 w-4 text-primary" /> Key Passing Duo Comparison
            </h4>
            <span className="text-[11px] text-muted-foreground">Calculated from Tracking & Ball Vectors</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
            {insights.map((item, idx) => (
              <div key={idx} className="p-2 rounded bg-background/40 border border-border/40">
                <span className="font-bold text-foreground">{item.teamName}:</span> {item.channelName} ({item.totalVolume} passes)
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.tacticalImpact}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
