import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Target, Database, Activity, Shield, Flame, Play, FileVideo, Layers, ArrowLeft,
  Network, Zap, Compass, Radio, TrendingUp, RotateCcw, FastForward, Rewind, Gauge,
  CheckCircle2, Film
} from 'lucide-react';
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

export interface ActiveEvidenceClip {
  id?: number;
  title: string;
  category: 'shot' | 'zone14' | 'defensive_line' | 'pressing';
  timestampSeconds: number;
  startSeconds: number;
  endSeconds: number;
  team: string;
  metadata?: string;
  provenance: string;
}

export interface MatchProfile {
  id: string;
  name: string;
  badge: string;
  durationLabel: string;
  score: string;
  description: string;
  outputPath: string;
  fps: number;
  totalBoxes: string;
  calibrationInfo: string;
  durationSeconds: number;
}

export const AVAILABLE_MATCHES: MatchProfile[] = [
  {
    id: 'video_project_3',
    name: 'New Upload: Video Project 3 (AWS GPU Processed)',
    badge: 'AWS GPU Run — Complete',
    durationLabel: '4:15 Min Condensed Clip • 7,661 Frames • 30 FPS',
    score: 'Team A (Blue) 1 – 0 Team B (Red)',
    description: 'Fresh footage processed via AWS Batch GPU worker (1x GPU, 4 vCPUs). 97 persistent unique tracks, jersey color clustered, faststart H.264 stream. Duration-scaled tactical analysis.',
    outputPath: '/output/video_project_3',
    fps: 30,
    totalBoxes: '11,406 Track IDs (7,661 frames)',
    calibrationInfo: 'Pitch Radar Synced (30 FPS)',
    durationSeconds: 255.3,
  },
  {
    id: '08fd33_4',
    name: 'Chelsea U18 vs Arsenal U18 (Match 08fd33_4)',
    badge: 'Match 08fd33_4 — Baseline CV Run',
    durationLabel: '5-Minute Evaluation Footage • 25 FPS',
    score: 'Chelsea U18 2 – 1 Arsenal U18',
    description: 'Automated offline tracking baseline with BoT-SORT player trajectories, bounded ball interpolation, and explicit homography pitch calibration (Gate 4 & Gate 5 validated).',
    outputPath: '/output/08fd33_4',
    fps: 25,
    totalBoxes: '64,853 Players (85.1% conf)',
    calibrationInfo: '0.371m RMSE (< 1.8m gate)',
    durationSeconds: 295.0,
  },
];

export default function MatchIntelligence() {
  const [selectedMatchId, setSelectedMatchId] = useState<string>('video_project_3');
  const currentMatch = AVAILABLE_MATCHES.find((m) => m.id === selectedMatchId) || AVAILABLE_MATCHES[0];

  const [activeTab, setActiveTab] = useState<'heatmaps' | 'defensive_line' | 'passing_network' | 'ppda' | 'zone14' | 'xg' | 'radar'>('xg');
  const [heatmapType, setHeatmapType] = useState<'team1' | 'ball' | 'team0'>('team1');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  // Interactive Video Player & Evidence Clip Seeking
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [activeClip, setActiveClip] = useState<ActiveEvidenceClip | null>({
    id: 1,
    title: 'Match Kickoff & Tactical Shape',
    category: 'defensive_line',
    timestampSeconds: 0,
    startSeconds: 0,
    endSeconds: 15.0,
    team: 'Chelsea U18',
    metadata: 'High press formation & mid-block defensive transition',
    provenance: 'CV Tracking Verified (BoT-SORT & Homography Calibrated)'
  });

  useEffect(() => {
    fetch(`${currentMatch.outputPath}/analytics_summary.json`)
      .then((res) => res.json())
      .then((data) => {
        setAnalytics(data);
        if (data?.shots && data.shots.length > 0) {
          const firstShot = data.shots[0];
          const t0Name = data?.teams?.team0?.name || 'Team A';
          const t1Name = data?.teams?.team1?.name || 'Team B';
          const teamName = firstShot.team === 0 ? t0Name : t1Name;
          setActiveClip({
            id: firstShot.id,
            title: `${teamName} #${firstShot.player} — ${String(firstShot.outcome || '').toUpperCase()} (${firstShot.xg} xG)`,
            category: 'shot',
            timestampSeconds: firstShot.clipStartSeconds ?? (firstShot.minute * 60),
            startSeconds: firstShot.clipStartSeconds ?? (firstShot.minute * 60),
            endSeconds: firstShot.clipEndSeconds ?? ((firstShot.minute * 60) + 12),
            team: teamName,
            metadata: `Minute ${firstShot.minute}’ • ${firstShot.isHeader ? 'Header' : 'Foot'} • Assister: ${firstShot.assister} (${firstShot.xa} xA)`,
            provenance: 'TL-04 Evidence Schema • Verified Video Occurrence',
          });
        }
      })
      .catch((err) => console.error('Failed to load analytics summary:', err));
  }, [currentMatch.outputPath]);

  const handleSeekClip = (clip: ActiveEvidenceClip) => {
    setActiveClip(clip);
    const vid = videoRef.current;
    if (!vid) return;

    let targetSeconds = clip.startSeconds;
    const dur = vid.duration;

    // Adapt if video loaded is a 5-minute condensed clip vs 95-minute full match
    if (dur && !isNaN(dur) && dur < 600 && targetSeconds > dur) {
      targetSeconds = (targetSeconds / 5400) * dur;
    } else if (dur && !isNaN(dur)) {
      targetSeconds = Math.min(Math.max(0, targetSeconds), Math.max(0, dur - 1));
    }

    const performSeek = () => {
      try {
        vid.currentTime = targetSeconds;
        vid.playbackRate = playbackRate;
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => console.warn('Autoplay notice:', e));
        }
      } catch (err) {
        console.warn('Seek error:', err);
      }
    };

    if (vid.readyState >= 1) {
      performSeek();
    } else {
      const onLoaded = () => {
        performSeek();
        vid.removeEventListener('loadedmetadata', onLoaded);
      };
      vid.addEventListener('loadedmetadata', onLoaded);
    }
  };

  const handleSeekShot = (shot: ShotEvent) => {
    const startSec = (shot.clipStartSeconds !== undefined && shot.clipStartSeconds > 0)
      ? shot.clipStartSeconds
      : (shot.minute ? shot.minute * 60 : 0);
    const endSec = (shot.clipEndSeconds !== undefined && shot.clipEndSeconds > startSec)
      ? shot.clipEndSeconds
      : (startSec + 15);

    const t0Name = analytics?.teams?.team0?.name || 'Team A';
    const t1Name = analytics?.teams?.team1?.name || 'Team B';
    const teamName = shot.team === 0 ? t0Name : t1Name;

    const clip: ActiveEvidenceClip = {
      id: shot.id,
      title: `${teamName} ${shot.player} — ${shot.outcome.toUpperCase()} (${shot.xg} xG)`,
      category: 'shot',
      timestampSeconds: startSec,
      startSeconds: startSec,
      endSeconds: endSec,
      team: teamName,
      metadata: `Minute ${shot.minute}’ • ${shot.isHeader ? 'Header' : 'Foot'} • Assister: ${shot.assister} (${shot.xa} xA)${shot.description ? ` • ${shot.description}` : ''}`,
      provenance: 'TL-04 Evidence Schema • Verified Video Occurrence'
    };
    handleSeekClip(clip);
  };

  const handleSeekSector = (seconds: number, label: string) => {
    const clip: ActiveEvidenceClip = {
      title: label,
      category: 'zone14',
      timestampSeconds: seconds,
      startSeconds: seconds,
      endSeconds: seconds + 14.0,
      team: label.includes('Chelsea') ? 'Chelsea U18' : 'Arsenal U18',
      metadata: 'Zonal transition from build-up channel into central penalty area',
      provenance: 'CV Spatial Heatmap Landmark Vectors'
    };
    handleSeekClip(clip);
  };

  const handleSeekDefLine = (seconds: number, label: string) => {
    const clip: ActiveEvidenceClip = {
      title: label,
      category: 'defensive_line',
      timestampSeconds: seconds,
      startSeconds: seconds,
      endSeconds: seconds + 12.0,
      team: label.includes('Chelsea') ? 'Chelsea U18' : 'Arsenal U18',
      metadata: 'Defensive phase compaction & pressing transition',
      provenance: 'CV Pitch Coordinate Rolling Mean (105m Grid)'
    };
    handleSeekClip(clip);
  };

  const handleSetSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleReplayCurrentClip = () => {
    if (videoRef.current && activeClip) {
      videoRef.current.currentTime = activeClip.startSeconds;
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleSkipSeconds = (delta: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + delta);
    }
  };

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
              <p className="text-xs text-muted-foreground">Computer Vision Heatmaps, Evidence Video Clips & Tactical Matrices</p>
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
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Match Header Bar with Match Selector */}
        <div className="rounded-xl border border-border/50 bg-gradient-to-r from-card/80 via-card/50 to-background p-5 backdrop-blur-sm shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {currentMatch.badge}
              </span>
              <span className="text-xs text-muted-foreground">• {currentMatch.durationLabel}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              {currentMatch.score}
            </h2>
            <p className="text-xs text-muted-foreground max-w-2xl">
              {currentMatch.description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Match Selector Dropdown */}
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] uppercase font-bold text-primary tracking-wider flex items-center gap-1">
                <FileVideo className="h-3 w-3" /> Select Match Video
              </label>
              <select
                value={selectedMatchId}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="bg-card/90 border border-primary/40 text-foreground text-xs rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
              >
                {AVAILABLE_MATCHES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/60 border border-border/50 text-xs">
                <Activity className="h-4 w-4 text-primary" />
                <div>
                  <span className="text-[10px] text-muted-foreground block">YOLO Detections</span>
                  <span className="font-semibold text-foreground">{currentMatch.totalBoxes}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/60 border border-border/50 text-xs">
                <Shield className="h-4 w-4 text-emerald-400" />
                <div>
                  <span className="text-[10px] text-muted-foreground block">Homography</span>
                  <span className="font-semibold text-emerald-400">{currentMatch.calibrationInfo}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Tactical Matrices Summary Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <Card className="border-border/50 bg-card/60 p-3">
            <CardContent className="p-0 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-primary" /> Heatmaps
                </span>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded">Matrix 1</span>
              </div>
              <p className="text-base font-bold text-foreground">KDE Density</p>
              <p className="text-[11px] text-muted-foreground">Chelsea vs Arsenal positional occupy</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 p-3">
            <CardContent className="p-0 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 text-blue-400" /> Line Height
                </span>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 rounded">Matrix 2</span>
              </div>
              <p className="text-base font-bold text-foreground">51.2m vs 52.5m</p>
              <p className="text-[11px] text-muted-foreground">0–90 min rolling average backline depth</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 p-3">
            <CardContent className="p-0 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold flex items-center gap-1">
                  <Network className="h-3.5 w-3.5 text-emerald-400" /> Pass Networks
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 rounded">Matrix 3</span>
              </div>
              <p className="text-base font-bold text-foreground">#142 &amp; #10 Hubs</p>
              <p className="text-[11px] text-muted-foreground">Spatial connection nodes &amp; link widths</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 p-3">
            <CardContent className="p-0 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-amber-400" /> PPDA Pressing
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 rounded">Matrix 4</span>
              </div>
              <p className="text-base font-bold text-foreground">6.5 PPDA</p>
              <p className="text-[11px] text-muted-foreground">Aggressive high press (Gegenpressing)</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 p-3">
            <CardContent className="p-0 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold flex items-center gap-1">
                  <Compass className="h-3.5 w-3.5 text-indigo-400" /> Zone 14
                </span>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 rounded">Matrix 5</span>
              </div>
              <p className="text-base font-bold text-foreground">538 vs 386</p>
              <p className="text-[11px] text-muted-foreground">Central &amp; half-space entry vectors</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 p-3">
            <CardContent className="p-0 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-red-400" /> xG Threat
                </span>
                <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 rounded">Matrix 6</span>
              </div>
              <p className="text-base font-bold text-foreground">3.79 vs 2.66 xG</p>
              <p className="text-[11px] text-muted-foreground">Chelsea (2G) vs Arsenal (1G) threat flow</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Section: Video Player & Tactical Workstation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Interactive Video & Clip Inspector */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Play className="h-4 w-4 text-primary" /> Tracked Match Footage
                  </CardTitle>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    CV Bounding Boxes Active
                  </span>
                </div>
                <CardDescription className="text-xs">
                  Synchronized with tactical events. Click any shot or breakthrough to seek clip.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* Video Player */}
                <div className="relative rounded-lg overflow-hidden border border-border/50 bg-black aspect-video">
                  <video
                    key={currentMatch.outputPath}
                    ref={videoRef}
                    src={`${currentMatch.outputPath}/tracked.mp4`}
                    controls
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Active Evidence Clip Inspector Banner (TL-04 / TL-07 / TL-10) */}
                {activeClip && (
                  <div className="p-3 rounded-lg border border-primary/40 bg-primary/5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            String(activeClip.team || '').includes('Chelsea') ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
                          }`}>
                            {String(activeClip.team || 'Match Footage')}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/20">
                            [{Math.floor(activeClip.startSeconds / 60)}:{(Math.floor(activeClip.startSeconds % 60)).toString().padStart(2, '0')} – {Math.floor(activeClip.endSeconds / 60)}:{(Math.floor(activeClip.endSeconds % 60)).toString().padStart(2, '0')}]
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-foreground pt-1 flex items-center gap-1.5">
                          <Film className="h-3.5 w-3.5 text-primary" />
                          {activeClip.title}
                        </h4>
                      </div>

                      {/* Quick Replay Button */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleReplayCurrentClip}
                        className="h-7 text-xs gap-1 px-2.5 text-primary hover:bg-primary hover:text-primary-foreground font-semibold"
                        title="Replay from clip start"
                      >
                        <RotateCcw className="h-3 w-3" /> Replay
                      </Button>
                    </div>

                    {activeClip.metadata && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {activeClip.metadata}
                      </p>
                    )}

                    {/* Playback Controls & Speed Toggle for Coaches */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px]">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSkipSeconds(-5)}
                          className="px-2 py-1 rounded bg-card hover:bg-secondary text-muted-foreground hover:text-foreground text-[10px] font-mono border border-border/40"
                          title="Skip back 5 seconds"
                        >
                          -5s
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSkipSeconds(5)}
                          className="px-2 py-1 rounded bg-card hover:bg-secondary text-muted-foreground hover:text-foreground text-[10px] font-mono border border-border/40"
                          title="Skip forward 5 seconds"
                        >
                          +5s
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground mr-1 flex items-center gap-0.5">
                          <Gauge className="h-3 w-3" /> Speed:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSetSpeed(0.5)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            playbackRate === 0.5 ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground border border-border/40'
                          }`}
                          title="0.5x Slow-Motion for tactical review"
                        >
                          0.5x Slow-Mo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetSpeed(1.0)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            playbackRate === 1.0 ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground border border-border/40'
                          }`}
                        >
                          1.0x Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetSpeed(1.5)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            playbackRate === 1.5 ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground border border-border/40'
                          }`}
                        >
                          1.5x
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-0.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span>Provenance: {activeClip.provenance}</span>
                    </div>
                  </div>
                )}

                <div className="pt-1 flex items-center justify-between text-xs">
                  <a
                    className="inline-block text-primary underline text-xs"
                    href={`${currentMatch.outputPath}/tracked.mp4`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open tracked.mp4 in new window
                  </a>
                  <span className="text-muted-foreground text-[11px]">{currentMatch.durationLabel}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tracking Datasets Provenance */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Tracking Datasets (Raw JSON)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-xs">
                <a href={`${currentMatch.outputPath}/run.json`} target="_blank" rel="noreferrer" className="p-2 rounded bg-secondary/50 hover:bg-secondary text-primary font-mono transition-colors">
                  📄 run.json
                </a>
                <a href={`${currentMatch.outputPath}/ball_observations.json`} target="_blank" rel="noreferrer" className="p-2 rounded bg-secondary/50 hover:bg-secondary text-primary font-mono transition-colors">
                  ⚽ ball_obs.json
                </a>
                <a href={`${currentMatch.outputPath}/tracked_ball.json`} target="_blank" rel="noreferrer" className="p-2 rounded bg-secondary/50 hover:bg-secondary text-primary font-mono transition-colors">
                  🎯 tracked_ball.json
                </a>
                <a href={`${currentMatch.outputPath}/tracks_with_teams.json`} target="_blank" rel="noreferrer" className="p-2 rounded bg-secondary/50 hover:bg-secondary text-primary font-mono transition-colors">
                  👥 teams_tracks.json
                </a>
                <a href={`${currentMatch.outputPath}/baseline_report.json`} target="_blank" rel="noreferrer" className="p-2 rounded bg-secondary/50 hover:bg-secondary text-primary font-mono transition-colors col-span-2">
                  📊 tl06_cv_benchmark.json
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Tactical Workstation & Seekable Matrices */}
          <div className="lg:col-span-7">
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full flex flex-col h-full space-y-4">
              <TabsList className="w-full sm:w-fit bg-card/80 border border-border/50 backdrop-blur-sm grid grid-cols-2 sm:flex sm:flex-wrap gap-1 p-1">
                <TabsTrigger
                  value="xg"
                  className="gap-1.5 text-xs font-semibold px-3 py-1.5"
                  title="Cumulative xG threat progression & 10-shot classified table"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-red-400" /> xG Threat &amp; Shots
                </TabsTrigger>
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
                  title="Player Passing Connection Networks"
                >
                  <Network className="h-3.5 w-3.5 text-primary" /> Passing Network
                </TabsTrigger>
                <TabsTrigger
                  value="ppda"
                  className="gap-1.5 text-xs font-semibold px-3 py-1.5"
                  title="Pressing Intensity (PPDA) Gauge & Trend"
                >
                  <Zap className="h-3.5 w-3.5 text-primary" /> PPDA Gauge
                </TabsTrigger>
                <TabsTrigger
                  value="zone14"
                  className="gap-1.5 text-xs font-semibold px-3 py-1.5"
                  title="Zone 14 & Half-Space Infiltration Plot"
                >
                  <Compass className="h-3.5 w-3.5 text-primary" /> Zone 14
                </TabsTrigger>
                <TabsTrigger
                  value="radar"
                  className="gap-1.5 text-xs font-semibold px-3 py-1.5"
                  title="2D Top-Down Tactical Pitch Player Radar Synchronized with Video"
                >
                  <Radio className="h-3.5 w-3.5 text-emerald-400" /> 2D Radar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="xg" className="flex-1 mt-0">
                <XgFlowChart
                  summaryData={analytics?.teams as any}
                  shotsData={analytics?.shots}
                  chartImage={analytics?.xgChartImage ? `${currentMatch.outputPath}/${analytics.xgChartImage}` : `${currentMatch.outputPath}/xg_flow_chart.png`}
                  onSelectShot={handleSeekShot}
                  activeShotId={activeClip?.id}
                />
              </TabsContent>

              <TabsContent value="heatmaps" className="flex-1 mt-0">
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Flame className="h-5 w-5 text-primary" /> Match Positional Heatmaps
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Density distributions extracted from tracking frames ({currentMatch.durationLabel}).
                        </CardDescription>
                      </div>

                      {/* Heatmap Layer Selector */}
                      <div className="flex items-center gap-1 bg-background/60 p-1 rounded-lg border border-border/50 text-xs">
                        <button
                          onClick={() => setHeatmapType('team0')}
                          className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                            heatmapType === 'team0'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Chelsea (Team A)
                        </button>
                        <button
                          onClick={() => setHeatmapType('team1')}
                          className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                            heatmapType === 'team1'
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Arsenal (Team B)
                        </button>
                        <button
                          onClick={() => setHeatmapType('ball')}
                          className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                            heatmapType === 'ball'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Ball Occupancy
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative w-full rounded-lg border border-border/50 overflow-hidden bg-[#0e1726] p-2">
                      <img
                        src={
                          heatmapType === 'team0'
                            ? `${currentMatch.outputPath}/heatmap_team0.png`
                            : heatmapType === 'team1'
                              ? `${currentMatch.outputPath}/heatmap_team1.png`
                              : `${currentMatch.outputPath}/heatmap_ball.png`
                        }
                        alt="Tactical Pitch Heatmap"
                        className="w-full h-auto object-contain rounded-md shadow-lg"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="defensive_line" className="flex-1 mt-0">
                <DefensiveLineChart
                  timeSeriesData={analytics?.defensiveLineTimeSeries}
                  chartImage={analytics?.defensiveLineChartImage ? `${currentMatch.outputPath}/${analytics.defensiveLineChartImage}` : `${currentMatch.outputPath}/defensive_line_chart.png`}
                  onSelectClip={handleSeekDefLine}
                />
              </TabsContent>

              <TabsContent value="passing_network" className="flex-1 mt-0">
                <PassingNetworkChart
                  summaryData={analytics?.teams as any}
                  outputBasePath={currentMatch.outputPath}
                />
              </TabsContent>

              <TabsContent value="ppda" className="flex-1 mt-0">
                <PpdaGaugeChart
                  summaryData={analytics?.teams as any}
                  chartImage={analytics?.ppdaChartImage ? `${currentMatch.outputPath}/${analytics.ppdaChartImage}` : `${currentMatch.outputPath}/ppda_gauge_chart.png`}
                  intervals={analytics?.ppdaIntervals}
                />
              </TabsContent>

              <TabsContent value="zone14" className="flex-1 mt-0">
                <Zone14Chart
                  summaryData={analytics?.teams as any}
                  outputBasePath={currentMatch.outputPath}
                  onSelectClip={handleSeekSector}
                />
              </TabsContent>

              <TabsContent value="radar" className="flex-1 mt-0">
                <SyncedRadarPlayer
                  videoUrl={`${currentMatch.outputPath}/tracked.mp4`}
                  radarDataUrl={`${currentMatch.outputPath}/radar_frames.json`}
                />
              </TabsContent>
            </Tabs>
          </div>

        </div>

      </div>
    </div>
  );
}
