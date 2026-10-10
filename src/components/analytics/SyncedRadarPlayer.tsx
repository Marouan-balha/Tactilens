import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, FastForward, RotateCcw, Video, Radio, Layers } from 'lucide-react';
import { getRadarFrameForTime, type RadarStreamData } from '@/lib/radarUtils';

interface SyncedRadarPlayerProps {
  videoUrl?: string;
  radarDataUrl?: string;
}

export function SyncedRadarPlayer({
  videoUrl = '/output/08fd33_4/tracked.mp4',
  radarDataUrl = '/output/08fd33_4/radar_frames.json'
}: SyncedRadarPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [radarData, setRadarData] = useState<RadarStreamData | null>(null);

  // Load radar_frames.json
  useEffect(() => {
    fetch(radarDataUrl)
      .then((res) => res.json())
      .then((data) => setRadarData(data))
      .catch((err) => console.error('Failed to load 2D radar frames JSON:', err));
  }, [radarDataUrl]);

  // Sync canvas redraw with video time update loop
  useEffect(() => {
    let animId: number;

    const renderCanvas = () => {
      if (videoRef.current) {
        const t = videoRef.current.currentTime;
        setCurrentTime(t);
        drawRadarPitch(t);
      }
      animId = requestAnimationFrame(renderCanvas);
    };

    animId = requestAnimationFrame(renderCanvas);
    return () => cancelAnimationFrame(animId);
  }, [radarData]);

  const drawRadarPitch = (timeSec: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Draw Tactical Pitch Background
    ctx.fillStyle = '#0e1726';
    ctx.fillRect(0, 0, w, h);

    // Pitch Line Styles
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;

    // Outer Pitch Boundary
    const margin = 12;
    const pw = w - margin * 2;
    const ph = h - margin * 2;
    ctx.strokeRect(margin, margin, pw, ph);

    // Halfway Line
    const midX = margin + pw / 2;
    ctx.beginPath();
    ctx.moveTo(midX, margin);
    ctx.lineTo(midX, margin + ph);
    ctx.stroke();

    // Center Circle
    ctx.beginPath();
    ctx.arc(midX, margin + ph / 2, ph * 0.18, 0, Math.PI * 2);
    ctx.stroke();

    // Penalty Boxes (Left & Right)
    const boxW = pw * 0.16;
    const boxH = ph * 0.55;
    const boxY = margin + (ph - boxH) / 2;

    // Left Penalty Box
    ctx.strokeRect(margin, boxY, boxW, boxH);
    // Right Penalty Box
    ctx.strokeRect(margin + pw - boxW, boxY, boxW, boxH);

    ctx.globalAlpha = 1.0;

    // 2. Fetch Active Frame Data
    const frameData = getRadarFrameForTime(radarData, timeSec);
    if (!frameData) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Loading Radar Stream Data...', midX, margin + ph / 2);
      return;
    }

    const PITCH_L = radarData?.pitchLength || 105.0;
    const PITCH_W = radarData?.pitchWidth || 68.0;

    // Helper to map (x, y) pitch meters to canvas pixels
    const mapCoords = (px: number, py: number) => {
      const cx = margin + (px / PITCH_L) * pw;
      const cy = margin + (py / PITCH_W) * ph;
      return { cx, cy };
    };

    // 3. Render Players
    frameData.players.forEach((p) => {
      const { cx, cy } = mapCoords(p.x, p.y);
      const isTeam0 = p.team === 0;

      // Glow effect
      ctx.shadowBlur = 8;
      ctx.shadowColor = isTeam0 ? '#3b82f6' : '#ef4444';

      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = isTeam0 ? '#3b82f6' : '#ef4444';
      ctx.fill();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Reset shadow
      ctx.shadowBlur = 0;

      // Jersey number label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(p.id % 99), cx, cy);
    });

    // 4. Render Ball
    if (frameData.ball) {
      const { cx, cy } = mapCoords(frameData.ball.x, frameData.ball.y);

      ctx.shadowBlur = 10;
      ctx.shadowColor = '#eab308';

      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#eab308';
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.shadowBlur = 0;
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
    }
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary animate-pulse" /> Synced 2D Tactical Radar + Video Player
            </CardTitle>
            <CardDescription className="text-xs">
              Live 2D mini-map canvas running frame-by-frame in lockstep with annotated match video.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
              🔵 Chelsea U18
            </span>
            <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 font-semibold border border-red-500/30">
              🔴 Arsenal U18
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
              🟡 Ball Vector
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Side-by-Side Player & Canvas Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Left Column: Video Player */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5 text-foreground">
                <Video className="h-4 w-4 text-primary" /> Tracked Video Footage
              </span>
              <span>25 FPS • CUDA Bounding Boxes</span>
            </div>
            <div className="relative rounded-lg border border-border/50 overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                src={videoUrl}
                onLoadedMetadata={() => {
                  if (videoRef.current) setDuration(videoRef.current.duration);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right Column: HTML5 Canvas 2D Pitch Radar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5 text-foreground">
                <Layers className="h-4 w-4 text-primary" /> Real-Time 2D Tactical Radar
              </span>
              <span className="text-emerald-400 font-mono">Synced Canvas (60 FPS)</span>
            </div>
            <div className="relative rounded-lg border border-border/50 overflow-hidden bg-[#0e1726] aspect-video flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={560}
                height={320}
                className="w-full h-full object-contain"
              />
            </div>
          </div>

        </div>

        {/* Universal Controls & Time Scrubber */}
        <div className="p-3 rounded-lg border border-border/50 bg-background/50 space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = 0;
              }}
              className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              title="Restart Video"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Time Scrubber Slider */}
            <div className="flex-1 flex items-center gap-2">
              <span className="font-mono text-[11px] text-muted-foreground w-10 text-right">
                {Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, '0')}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleScrub}
                className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
              />
              <span className="font-mono text-[11px] text-muted-foreground w-10">
                {Math.floor(duration / 60)}:{(Math.floor(duration) % 60).toString().padStart(2, '0')}
              </span>
            </div>

            {/* Playback Speed Selectors */}
            <div className="flex items-center gap-1 bg-background/80 p-1 rounded-md border border-border/50">
              <FastForward className="h-3.5 w-3.5 text-muted-foreground ml-1 mr-0.5" />
              {[0.5, 1, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    playbackRate === speed
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
