import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Database, Activity, Shield, Flame, Play, FileVideo, Layers, ArrowLeft, Network, Zap, Compass, Radio, TrendingUp } from 'lucide-react';
import { StatusIndicator } from '@/components/StatusIndicator';
import { DefensiveLineChart } from '@/components/analytics/DefensiveLineChart';
import { PassingNetworkChart } from '@/components/analytics/PassingNetworkChart';
import { PpdaGaugeChart } from '@/components/analytics/PpdaGaugeChart';
import { Zone14Chart } from '@/components/analytics/Zone14Chart';
import { SyncedRadarPlayer } from '@/components/analytics/SyncedRadarPlayer';
import { XgFlowChart } from '@/components/analytics/XgFlowChart';
import type { TimeSeriesPoint } from '@/lib/defensiveLineUtils';
import type { ShotEvent, XgTimeSeriesPoint } from '@/lib/xgUtils';

interface AnalyticsSummary {
  status: string;
  teams: {
    team0?: {
      name: string;
      defensiveLineHeightMeters: number;
      compactnessMetersSq: number;
      zone14Entries: number;
      leftHalfSpaceEntries?: number;
      rightHalfSpaceEntries?: number;
      heatmapImage: string;
      passingNetworkImage: string;
      zone14Image?: string;
      topChannel: string;
      topChannelPasses: number;
      playmakingHub: string;
      xgTotal?: number;
      goalsScored?: number;
      topXaCreator?: string;
      topXaValue?: number;
      ppda?: {
        score: number;
        zone: string;
        passesAllowed: number;
        defensiveActions: number;
        trend: number[];
      };
    };
    team1?: {
      name: string;
      defensiveLineHeightMeters: number;
      compactnessMetersSq: number;
      zone14Entries: number;
      leftHalfSpaceEntries?: number;
      rightHalfSpaceEntries?: number;
      heatmapImage: string;
      passingNetworkImage: string;
      zone14Image?: string;
      topChannel: string;
      topChannelPasses: number;
      playmakingHub: string;
      xgTotal?: number;
      goalsScored?: number;
      topXaCreator?: string;
      topXaValue?: number;
      ppda?: {
        score: number;
        zone: string;
        passesAllowed: number;
        defensiveActions: number;
        trend: number[];
      };
    };
  };
  ball: {
    heatmapImage: string;
  };
  defensiveLineChartImage?: string;
  defensiveLineTimeSeries?: TimeSeriesPoint[];
  ppdaChartImage?: string;
  ppdaIntervals?: string[];
  zone14ChartImage?: string;
  xgChartImage?: string;
  xgTimeSeries?: XgTimeSeriesPoint[];
  shots?: ShotEvent[];
}

export default function MatchIntelligence() {
  const [activeTab, setActiveTab] = useState<'heatmaps' | 'defensive_line' | 'passing_network' | 'ppda' | 'zone14' | 'xg' | 'radar'>('heatmaps');
  const [heatmapType, setHeatmapType] = useState<'team1' | 'ball' | 'team0'>('team1');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    fetch('/output/08fd33_4/analytics_summary.json')
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .catch((err) => console.error('Failed to load analytics summary:', err));
  }, []);

  return (
    <div className="min-h-screen bg-background dark">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mr-2">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                TactiLens<span className="text-primary">.ai</span> — Match Intelligence
              </h1>
              <p className="text-xs text-muted-foreground">Computer Vision Heatmaps & Tactical Spatial Metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                Opposition Scouting
              </Button>
            </Link>
            <Link to="/knowledge">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Database className="h-3.5 w-3.5" />
                Knowledge Base
              </Button>
            </Link>
            <StatusIndicator status="completed" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Match Info Banner */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileVideo className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Full Match: Chelsea U18 vs Arsenal U18 (Premier League U18)
                </h2>
                <p className="text-xs text-muted-foreground">
                  GPU Pipeline Run • 120,603 Frames Analyzed • CUDA Accelerated
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary font-medium">
                AWS Batch Completed
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Spatial KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" /> Defensive Line Height
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {analytics?.teams.team1?.defensiveLineHeightMeters ?? 52.3} <span className="text-sm font-normal text-muted-foreground">meters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                High pressing block. Defense steps up to midfield line during build-up phase.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-accent" /> Spatial Compactness
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {analytics?.teams.team1?.compactnessMetersSq ?? 1380.9} <span className="text-sm font-normal text-muted-foreground">m²</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Spread out shape during possession phases to stretch opposition lines.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-destructive" /> Zone 14 Infiltration
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {analytics?.teams.team1?.zone14Entries ?? 2444} <span className="text-sm font-normal text-muted-foreground">frame touches</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                High concentration of central touches outside penalty box in half-spaces.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Expected Goals (xG)
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground flex items-baseline gap-1.5">
                <span>{analytics?.teams.team0?.xgTotal ?? 3.79}</span>
                <span className="text-xs font-normal text-muted-foreground">vs</span>
                <span>{analytics?.teams.team1?.xgTotal ?? 2.66}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Chelsea (2 goals) vs Arsenal (1 goal). Cumulative high-quality threat volume.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Section: Video & Interactive Heatmaps */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Annotated Video Player */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" /> Tracked Match Footage
                </CardTitle>
                <CardDescription className="text-xs">
                  Annotated video with player & ball bounding box overlays.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <video
                  src="/output/08fd33_4/tracked.mp4"
                  controls
                  className="w-full rounded-lg border border-border/50 bg-black aspect-video object-cover"
                />
                <a
                  className="inline-block text-primary underline text-xs"
                  href="/output/08fd33_4/tracked.mp4"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open tracked.mp4 in new window
                </a>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Tracking Datasets (Raw JSON)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-xs">
                <a href="/output/08fd33_4/run.json" target="_blank" rel="noreferrer" className="p-2 rounded bg-secondary/50 hover:bg-secondary text-primary font-mono transition-colors">
                  📄 run.json
                </a>
                <a href="/output/08fd33_4/ball_observations.json" target="_blank" rel="noreferrer" className="p-2 rounded bg-secondary/50 hover:bg-secondary text-primary font-mono transition-colors">
                  ⚽ ball_obs.json
                </a>
                <a href="/output/08fd33_4/tracked_ball.json" target="_blank" rel="noreferrer" className="p-2 rounded bg-secondary/50 hover:bg-secondary text-primary font-mono transition-colors">
                  🎯 tracked_ball.json
                </a>
                <a href="/output/08fd33_4/tracks_with_teams.json" target="_blank" rel="noreferrer" className="p-2 rounded bg-secondary/50 hover:bg-secondary text-primary font-mono transition-colors">
                  👥 teams_tracks.json
                </a>
                <a href="/output/08fd33_4/baseline_report.json" target="_blank" rel="noreferrer" className="p-2 rounded bg-secondary/50 hover:bg-secondary text-primary font-mono transition-colors col-span-2">
                  📊 tl06_cv_benchmark.json
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Heatmap & Defensive Line Workspace */}
          <div className="lg:col-span-7">
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'heatmaps' | 'defensive_line' | 'passing_network' | 'ppda' | 'zone14' | 'xg' | 'radar')} className="w-full flex flex-col h-full space-y-4">
              <TabsList className="w-full sm:w-fit bg-card/80 border border-border/50 backdrop-blur-sm grid grid-cols-2 sm:flex sm:flex-wrap gap-1 p-1">
                <TabsTrigger
                  value="heatmaps"
                  className="gap-1.5 text-xs font-semibold px-3 py-1.5"
                  title="Pitch & Player Positional Heatmaps"
                >
                  <Flame className="h-3.5 w-3.5 text-primary" /> Heatmaps
                </TabsTrigger>
                <TabsTrigger
                  value="defensive_line"
                  className="gap-1.5 text-xs font-semibold px-3 py-1.5"
                  title="Defensive Backline Height Over Time (0–90 Mins)"
                >
                  <Activity className="h-3.5 w-3.5 text-primary" /> Line Height
                </TabsTrigger>
                <TabsTrigger
                  value="passing_network"
                  className="gap-1.5 text-xs font-semibold px-3 py-1.5"
                  title="Passing Connection Network & Build-Up Hubs"
                >
                  <Network className="h-3.5 w-3.5 text-primary" /> Pass Network
                </TabsTrigger>
                <TabsTrigger
                  value="ppda"
                  className="gap-1.5 text-xs font-semibold px-3 py-1.5"
                  title="Pressing Intensity (Passes Allowed Per Defensive Action)"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-400" /> PPDA Press
                </TabsTrigger>
                <TabsTrigger
                  value="zone14"
                  className="gap-1.5 text-xs font-semibold px-3 py-1.5"
                  title="Zone 14 & Half-Space Attacking Entry Vectors"
                >
                  <Target className="h-3.5 w-3.5 text-amber-400" /> Zone 14
                </TabsTrigger>
                <TabsTrigger
                  value="xg"
                  className="gap-1.5 text-xs font-semibold px-3 py-1.5"
                  title="Expected Goals (xG) Flow & Shot Threat Matrix"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> xG Threat Flow
                </TabsTrigger>
                <TabsTrigger
                  value="radar"
                  className="gap-1.5 text-xs font-semibold px-3 py-1.5"
                  title="Synced 2D Tactical Radar + Video Player"
                >
                  <Radio className="h-3.5 w-3.5 text-primary" /> 2D Radar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="heatmaps" className="flex-1 mt-0">
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Flame className="h-5 w-5 text-primary" /> Python `mplsoccer` Pitch Heatmap
                        </CardTitle>
                        <CardDescription className="text-xs">
                          2D Kernel Density Estimation (KDE) generated from tracking coordinates.
                        </CardDescription>
                      </div>

                      {/* Heatmap Type Controls */}
                      <div className="flex items-center gap-1 bg-background/60 p-1 rounded-lg border border-border/50 text-xs">
                        <button
                          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${heatmapType === 'team0' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                          onClick={() => setHeatmapType('team0')}
                        >
                          Chelsea U18
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${heatmapType === 'team1' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                          onClick={() => setHeatmapType('team1')}
                        >
                          Arsenal U18
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${heatmapType === 'ball' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                          onClick={() => setHeatmapType('ball')}
                        >
                          Ball Traffic
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="relative w-full rounded-lg border border-border/50 overflow-hidden bg-[#0e1726] p-2">
                      <img
                        src={
                          heatmapType === 'team0'
                            ? '/output/08fd33_4/heatmap_team0.png'
                            : heatmapType === 'team1'
                              ? '/output/08fd33_4/heatmap_team1.png'
                              : '/output/08fd33_4/heatmap_ball.png'
                        }
                        alt="Tactical Pitch Heatmap"
                        className="w-full h-auto object-contain rounded-md shadow-lg"
                      />
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground text-center">
                      Density legend: <span className="text-blue-400 font-semibold">Low Traffic</span> ➔ <span className="text-yellow-400 font-semibold">Moderate Pressure</span> ➔ <span className="text-red-500 font-semibold">High Intensity Zone</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="defensive_line" className="flex-1 mt-0">
                <DefensiveLineChart
                  timeSeriesData={analytics?.defensiveLineTimeSeries}
                  chartImage={analytics?.defensiveLineChartImage ? `/output/08fd33_4/${analytics.defensiveLineChartImage}` : '/output/08fd33_4/defensive_line_chart.png'}
                />
              </TabsContent>

              <TabsContent value="passing_network" className="flex-1 mt-0">
                <PassingNetworkChart
                  summaryData={analytics?.teams as any}
                  outputBasePath="/output/08fd33_4"
                />
              </TabsContent>

              <TabsContent value="ppda" className="flex-1 mt-0">
                <PpdaGaugeChart
                  summaryData={analytics?.teams as any}
                  chartImage={analytics?.ppdaChartImage ? `/output/08fd33_4/${analytics.ppdaChartImage}` : '/output/08fd33_4/ppda_gauge_chart.png'}
                />
              </TabsContent>

              <TabsContent value="zone14" className="flex-1 mt-0">
                <Zone14Chart
                  summaryData={analytics?.teams as any}
                  outputBasePath="/output/08fd33_4"
                />
              </TabsContent>

              <TabsContent value="xg" className="flex-1 mt-0">
                <XgFlowChart
                  summaryData={analytics?.teams as any}
                  shotsData={analytics?.shots}
                  chartImage={analytics?.xgChartImage ? `/output/08fd33_4/${analytics.xgChartImage}` : '/output/08fd33_4/xg_flow_chart.png'}
                />
              </TabsContent>

              <TabsContent value="radar" className="flex-1 mt-0">
                <SyncedRadarPlayer
                  videoUrl="/output/08fd33_4/tracked.mp4"
                  radarDataUrl="/output/08fd33_4/radar_frames.json"
                />
              </TabsContent>
            </Tabs>
          </div>

        </div>

      </div>
    </div>
  );
}
