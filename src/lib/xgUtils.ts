export interface ShotEvent {
  minute: number;
  team: number;
  player: string;
  x: number;
  y: number;
  outcome: 'goal' | 'saved' | 'blocked' | 'missed';
  isHeader: boolean;
  assister: string;
  xg: number;
  xa: number;
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
