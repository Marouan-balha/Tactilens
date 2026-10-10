import { useMemo } from 'react';

type ZoneIntensity = {
  zone: string;
  x: number;
  y: number;
  w: number;
  h: number;
  value: number; // 0-1
};

type HeatmapMode = 'attacking' | 'defensive';

interface PitchHeatmapProps {
  teamId: string;
  mode: HeatmapMode;
  teamData: {
    name: string;
    formation: string;
    tactical_patterns: {
      build_up: string;
      attacking: string;
      defensive: string;
      transitions: string;
    };
    strengths: string[];
    weaknesses: string[];
  };
}

// Generate zone intensities from tactical data keywords
function deriveZoneIntensities(teamData: PitchHeatmapProps['teamData'], mode: HeatmapMode): ZoneIntensity[] {
  const text = mode === 'attacking'
    ? `${teamData.tactical_patterns.attacking} ${teamData.tactical_patterns.build_up} ${teamData.tactical_patterns.transitions} ${teamData.strengths.join(' ')}`
    : `${teamData.tactical_patterns.defensive} ${teamData.weaknesses.join(' ')} ${teamData.tactical_patterns.transitions}`;

  const lower = text.toLowerCase();

  // 4x3 grid zones on half-pitch (from defence to attack, left to right)
  const zones: ZoneIntensity[] = [
    // Defensive third
    { zone: 'def-left',   x: 0,    y: 0,    w: 33.3, h: 33.3, value: 0 },
    { zone: 'def-center', x: 0,    y: 33.3, w: 33.3, h: 33.4, value: 0 },
    { zone: 'def-right',  x: 0,    y: 66.7, w: 33.3, h: 33.3, value: 0 },
    // Midfield
    { zone: 'mid-left',   x: 33.3, y: 0,    w: 33.4, h: 33.3, value: 0 },
    { zone: 'mid-center', x: 33.3, y: 33.3, w: 33.4, h: 33.4, value: 0 },
    { zone: 'mid-right',  x: 33.3, y: 66.7, w: 33.4, h: 33.3, value: 0 },
    // Attacking third
    { zone: 'att-left',   x: 66.7, y: 0,    w: 33.3, h: 33.3, value: 0 },
    { zone: 'att-center', x: 66.7, y: 33.3, w: 33.3, h: 33.4, value: 0 },
    { zone: 'att-right',  x: 66.7, y: 66.7, w: 33.3, h: 33.3, value: 0 },
  ];

  // Keyword → zone boosters
  const keywords: Record<string, { zones: string[]; boost: number }> = {
    'half-space':     { zones: ['mid-left', 'mid-right', 'att-left', 'att-right'], boost: 0.3 },
    'overload':       { zones: ['att-left', 'att-right', 'mid-left', 'mid-right'], boost: 0.25 },
    'width':          { zones: ['mid-left', 'mid-right', 'att-left', 'att-right'], boost: 0.2 },
    'inverted':       { zones: ['mid-center', 'att-center'], boost: 0.2 },
    'overlap':        { zones: ['att-left', 'att-right'], boost: 0.25 },
    'counter':        { zones: ['mid-center', 'att-center'], boost: 0.3 },
    'transition':     { zones: ['mid-center', 'att-center'], boost: 0.25 },
    'possession':     { zones: ['def-center', 'mid-center', 'mid-left', 'mid-right'], boost: 0.3 },
    'pressing':       { zones: ['att-left', 'att-center', 'att-right'], boost: 0.3 },
    'high press':     { zones: ['att-left', 'att-center', 'att-right'], boost: 0.35 },
    'high line':      { zones: ['mid-center', 'def-center'], boost: 0.2 },
    'deep':           { zones: ['def-left', 'def-center', 'def-right'], boost: 0.3 },
    'compact':        { zones: ['mid-center', 'def-center'], boost: 0.25 },
    'crosses':        { zones: ['att-left', 'att-right'], boost: 0.25 },
    'box':            { zones: ['att-center'], boost: 0.35 },
    'cutting inside': { zones: ['att-center', 'mid-center'], boost: 0.25 },
    'left':           { zones: ['att-left', 'mid-left', 'def-left'], boost: 0.1 },
    'right':          { zones: ['att-right', 'mid-right', 'def-right'], boost: 0.1 },
    'long ball':      { zones: ['att-center', 'att-left', 'att-right'], boost: 0.2 },
    'vertical':       { zones: ['mid-center', 'att-center'], boost: 0.2 },
    'build-up':       { zones: ['def-center', 'mid-center'], boost: 0.2 },
    'aerial':         { zones: ['att-center', 'def-center'], boost: 0.2 },
    'pace':           { zones: ['att-left', 'att-right'], boost: 0.25 },
    'dribbling':      { zones: ['mid-left', 'mid-right', 'att-left', 'att-right'], boost: 0.2 },
    'midfield':       { zones: ['mid-left', 'mid-center', 'mid-right'], boost: 0.15 },
    'vulnerable':     { zones: ['def-left', 'def-right'], boost: 0.3 },
    'right-back':     { zones: ['def-right', 'mid-right'], boost: 0.3 },
    'left-back':      { zones: ['def-left', 'mid-left'], boost: 0.3 },
  };

  for (const [keyword, config] of Object.entries(keywords)) {
    if (lower.includes(keyword)) {
      for (const z of zones) {
        if (config.zones.includes(z.zone)) {
          z.value = Math.min(1, z.value + config.boost);
        }
      }
    }
  }

  // Normalize
  const max = Math.max(...zones.map(z => z.value), 0.01);
  zones.forEach(z => { z.value = z.value / max; });

  return zones;
}

function getHeatColor(value: number, mode: HeatmapMode): string {
  if (mode === 'attacking') {
    // Green to orange to red
    if (value < 0.3) return `hsla(142, 60%, 45%, ${0.08 + value * 0.3})`;
    if (value < 0.6) return `hsla(38, 90%, 50%, ${0.15 + value * 0.4})`;
    return `hsla(0, 80%, 50%, ${0.2 + value * 0.5})`;
  }
  // Defensive: blue to purple to red
  if (value < 0.3) return `hsla(210, 60%, 50%, ${0.08 + value * 0.3})`;
  if (value < 0.6) return `hsla(270, 60%, 50%, ${0.15 + value * 0.4})`;
  return `hsla(0, 70%, 50%, ${0.2 + value * 0.5})`;
}

export function PitchHeatmap({ teamId, mode, teamData }: PitchHeatmapProps) {
  const zones = useMemo(() => deriveZoneIntensities(teamData, mode), [teamData, mode]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {mode === 'attacking' ? '🔴 Attacking Zones' : '🔵 Defensive Vulnerability'}
        </span>
        <span className="text-[10px] text-muted-foreground/60 font-mono">
          {teamData.name}
        </span>
      </div>
      <div className="relative w-full aspect-[1.5/1] rounded-lg overflow-hidden border border-border/30">
        {/* Pitch background */}
        <svg
          viewBox="0 0 300 200"
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Grass */}
          <rect width="300" height="200" fill="hsl(142, 40%, 12%)" />
          
          {/* Pitch lines */}
          <g stroke="hsl(142, 30%, 25%)" strokeWidth="0.8" fill="none">
            {/* Outline */}
            <rect x="10" y="10" width="280" height="180" />
            {/* Half line */}
            <line x1="150" y1="10" x2="150" y2="190" />
            {/* Center circle */}
            <circle cx="150" cy="100" r="28" />
            <circle cx="150" cy="100" r="1.5" fill="hsl(142, 30%, 25%)" />
            {/* Left penalty area */}
            <rect x="10" y="50" width="45" height="100" />
            <rect x="10" y="70" width="18" height="60" />
            <circle cx="42" cy="100" r="1.5" fill="hsl(142, 30%, 25%)" />
            {/* Right penalty area */}
            <rect x="245" y="50" width="45" height="100" />
            <rect x="272" y="70" width="18" height="60" />
            <circle cx="258" cy="100" r="1.5" fill="hsl(142, 30%, 25%)" />
            {/* Corner arcs */}
            <path d="M 10 16 A 6 6 0 0 1 16 10" />
            <path d="M 284 10 A 6 6 0 0 1 290 16" />
            <path d="M 10 184 A 6 6 0 0 0 16 190" />
            <path d="M 284 190 A 6 6 0 0 0 290 184" />
          </g>
        </svg>

        {/* Heat zones */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {zones.map(z => (
            <rect
              key={z.zone}
              x={`${z.y}%`}
              y={`${z.x}%`}
              width={`${z.h}%`}
              height={`${z.w}%`}
              fill={getHeatColor(z.value, mode)}
              className="transition-all duration-500"
            />
          ))}
        </svg>

        {/* Zone labels */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {zones.map(z => (
            z.value > 0.2 && (
              <text
                key={`label-${z.zone}`}
                x={`${z.y + z.h / 2}%`}
                y={`${z.x + z.w / 2}%`}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="3.5"
                fontWeight="bold"
                opacity={0.7 + z.value * 0.3}
              >
                {Math.round(z.value * 100)}%
              </text>
            )
          ))}
        </svg>

        {/* Direction arrow */}
        <div className="absolute bottom-1.5 right-2 flex items-center gap-1 text-[9px] text-muted-foreground/40 font-mono">
          <span>ATK →</span>
        </div>
      </div>
    </div>
  );
}
