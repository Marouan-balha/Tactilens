export interface ShotEvent {
  id?: number;
  minute: number;
  clipStartSeconds?: number;
  clipEndSeconds?: number;
  team: number;
  player: string;
  x: number;
  y: number;
  outcome: 'goal' | 'saved' | 'blocked' | 'missed';
  isHeader: boolean;
  assister: string;
  xg: number;
  xa: number;
  description?: string;
}

export interface XgTimeSeriesPoint {
  minute: number;
  team0Xg: number;
  team1Xg: number;
}

export interface XgTeamData {
  name: string;
  xgTotal: number;
  goalsScored: number;
  topXaCreator: string;
  topXaValue: number;
}

export interface XgSummaryData {
  team0?: XgTeamData;
  team1?: XgTeamData;
}

export interface XgTacticalStats {
  team0Name: string;
  team1Name: string;
  team0Xg: number;
  team1Xg: number;
  team0Goals: number;
  team1Goals: number;
  team0Diff: number; // goals - xg
  team1Diff: number;
  bestShot: ShotEvent | null;
  totalShots: number;
  topCreator: {
    team: string;
    player: string;
    xa: number;
  };
}

export const DEFAULT_MATCH_SHOTS: ShotEvent[] = [
  {
    id: 1,
    minute: 7,
    clipStartSeconds: 15.0,
    clipEndSeconds: 26.0,
    team: 0,
    player: '#9 (ST)',
    x: 94.2,
    y: 33.5,
    outcome: 'saved',
    isHeader: false,
    assister: '#142 (CM)',
    xg: 0.38,
    xa: 0.38,
    description: 'Central low driven strike saved by goalkeeper'
  },
  {
    id: 2,
    minute: 18,
    clipStartSeconds: 44.0,
    clipEndSeconds: 56.0,
    team: 0,
    player: '#9 (ST)',
    x: 98.4,
    y: 34.0,
    outcome: 'goal',
    isHeader: false,
    assister: '#11 (LW)',
    xg: 0.82,
    xa: 0.82,
    description: 'Near-post tap-in following left byline cutback'
  },
  {
    id: 3,
    minute: 29,
    clipStartSeconds: 78.0,
    clipEndSeconds: 89.0,
    team: 1,
    player: '#10 (AM)',
    x: 91.0,
    y: 30.2,
    outcome: 'saved',
    isHeader: false,
    assister: '#7 (RW)',
    xg: 0.45,
    xa: 0.45,
    description: 'Curling effort from the edge of the D parried wide'
  },
  {
    id: 4,
    minute: 38,
    clipStartSeconds: 110.0,
    clipEndSeconds: 122.0,
    team: 0,
    player: '#11 (LW)',
    x: 88.5,
    y: 22.1,
    outcome: 'blocked',
    isHeader: false,
    assister: '#142 (CM)',
    xg: 0.24,
    xa: 0.24,
    description: 'Cut inside from left wing, shot charged down by CB'
  },
  {
    id: 5,
    minute: 44,
    clipStartSeconds: 138.0,
    clipEndSeconds: 152.0,
    team: 1,
    player: '#7 (RW)',
    x: 96.8,
    y: 36.2,
    outcome: 'goal',
    isHeader: false,
    assister: '#10 (AM)',
    xg: 0.74,
    xa: 0.74,
    description: 'Counter-attack transition finished calmly across keeper'
  },
  {
    id: 6,
    minute: 53,
    clipStartSeconds: 170.0,
    clipEndSeconds: 182.0,
    team: 0,
    player: '#142 (CM)',
    x: 87.2,
    y: 34.1,
    outcome: 'saved',
    isHeader: false,
    assister: '#205 (CB)',
    xg: 0.18,
    xa: 0.18,
    description: 'Long-range dipping strike tipped over crossbar'
  },
  {
    id: 7,
    minute: 62,
    clipStartSeconds: 198.0,
    clipEndSeconds: 210.0,
    team: 1,
    player: '#9 (ST)',
    x: 92.5,
    y: 35.8,
    outcome: 'missed',
    isHeader: true,
    assister: '#11 (LW)',
    xg: 0.35,
    xa: 0.35,
    description: 'Header from in-swinging corner over the bar'
  },
  {
    id: 8,
    minute: 71,
    clipStartSeconds: 225.0,
    clipEndSeconds: 240.0,
    team: 0,
    player: '#9 (ST)',
    x: 99.1,
    y: 34.0,
    outcome: 'goal',
    isHeader: true,
    assister: '#7 (RW)',
    xg: 0.88,
    xa: 0.88,
    description: 'Bullet header into top corner from back-post cross'
  },
  {
    id: 9,
    minute: 80,
    clipStartSeconds: 254.0,
    clipEndSeconds: 266.0,
    team: 1,
    player: '#11 (LW)',
    x: 89.4,
    y: 45.2,
    outcome: 'blocked',
    isHeader: false,
    assister: '#10 (AM)',
    xg: 0.22,
    xa: 0.22,
    description: 'Right half-space volley blocked inside the six-yard box'
  },
  {
    id: 10,
    minute: 88,
    clipStartSeconds: 275.0,
    clipEndSeconds: 288.0,
    team: 0,
    player: '#7 (RW)',
    x: 93.0,
    y: 42.0,
    outcome: 'missed',
    isHeader: false,
    assister: '#142 (CM)',
    xg: 0.28,
    xa: 0.28,
    description: 'Fast counter breakaway strike flashing wide of far post'
  }
];

export function computeXgStats(
  summary?: XgSummaryData,
  shots: ShotEvent[] = []
): XgTacticalStats {
  const t0Name = summary?.team0?.name ?? 'Chelsea U18';
  const t1Name = summary?.team1?.name ?? 'Arsenal U18';
  const t0Xg = summary?.team0?.xgTotal ?? 3.79;
  const t1Xg = summary?.team1?.xgTotal ?? 2.66;
  const t0Goals = summary?.team0?.goalsScored ?? 2;
  const t1Goals = summary?.team1?.goalsScored ?? 1;

  let bestShot: ShotEvent | null = null;
  if (shots.length > 0) {
    bestShot = shots.reduce((prev, curr) => (curr.xg > prev.xg ? curr : prev), shots[0]);
  }

  const t0Creator = summary?.team0?.topXaCreator ?? '#142 (CM)';
  const t0CreatorVal = summary?.team0?.topXaValue ?? 0.76;
  const t1Creator = summary?.team1?.topXaCreator ?? '#10 (AM)';
  const t1CreatorVal = summary?.team1?.topXaValue ?? 0.58;

  const topCreator =
    t0CreatorVal >= t1CreatorVal
      ? { team: t0Name, player: t0Creator, xa: t0CreatorVal }
      : { team: t1Name, player: t1Creator, xa: t1CreatorVal };

  return {
    team0Name: t0Name,
    team1Name: t1Name,
    team0Xg: t0Xg,
    team1Xg: t1Xg,
    team0Goals: t0Goals,
    team1Goals: t1Goals,
    team0Diff: Number((t0Goals - t0Xg).toFixed(2)),
    team1Diff: Number((t1Goals - t1Xg).toFixed(2)),
    bestShot,
    totalShots: shots.length,
    topCreator,
  };
}
