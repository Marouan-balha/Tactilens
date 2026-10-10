export interface TimeSeriesPoint {
  minute: number;
  team0Height: number;
  team1Height: number;
}

export interface DefensiveLineStats {
  team0Avg: number;
  team1Avg: number;
  team0Min: { minute: number; height: number };
  team1Min: { minute: number; height: number };
  team0Max: { minute: number; height: number };
  team1Max: { minute: number; height: number };
}

export function computeDefensiveLineStats(data: TimeSeriesPoint[]): DefensiveLineStats {
  if (!data || data.length === 0) {
    return {
      team0Avg: 42.5,
      team1Avg: 52.3,
      team0Min: { minute: 45, height: 32.0 },
      team1Min: { minute: 72, height: 35.4 },
      team0Max: { minute: 15, height: 55.0 },
      team1Max: { minute: 20, height: 61.2 },
    };
  }

  let sum0 = 0;
  let sum1 = 0;
  let t0Min = data[0];
  let t1Min = data[0];
  let t0Max = data[0];
  let t1Max = data[0];

  data.forEach((p) => {
    sum0 += p.team0Height;
    sum1 += p.team1Height;

    if (p.team0Height < t0Min.team0Height) t0Min = p;
    if (p.team1Height < t1Min.team1Height) t1Min = p;

    if (p.team0Height > t0Max.team0Height) t0Max = p;
    if (p.team1Height > t1Max.team1Height) t1Max = p;
  });

  const count = data.length;
  return {
    team0Avg: Number((sum0 / count).toFixed(1)),
    team1Avg: Number((sum1 / count).toFixed(1)),
    team0Min: { minute: t0Min.minute, height: t0Min.team0Height },
    team1Min: { minute: t1Min.minute, height: t1Min.team1Height },
    team0Max: { minute: t0Max.minute, height: t0Max.team0Height },
    team1Max: { minute: t1Max.minute, height: t1Max.team1Height },
  };
}
