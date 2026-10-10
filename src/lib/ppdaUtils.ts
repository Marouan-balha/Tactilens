export interface PpdaTeamDetails {
  score: number;
  zone: string;
  passesAllowed: number;
  defensiveActions: number;
  trend: number[];
}

export interface PpdaSummaryData {
  team0?: {
    name: string;
    ppda?: PpdaTeamDetails;
  };
  team1?: {
    name: string;
    ppda?: PpdaTeamDetails;
  };
}

export interface PpdaTacticalInsight {
  teamName: string;
  score: number;
  pressingCategory: 'High Gegenpress' | 'Mid-Block' | 'Low-Block';
  badgeColor: string;
  description: string;
}

export function formatPpdaInsights(data?: PpdaSummaryData): PpdaTacticalInsight[] {
  const t0Score = data?.team0?.ppda?.score ?? 8.8;
  const t1Score = data?.team1?.ppda?.score ?? 12.4;

  const getCategory = (score: number): 'High Gegenpress' | 'Mid-Block' | 'Low-Block' => {
    if (score < 10.0) return 'High Gegenpress';
    if (score <= 14.0) return 'Mid-Block';
    return 'Low-Block';
  };

  return [
    {
      teamName: data?.team0?.name ?? 'Chelsea U18',
      score: t0Score,
      pressingCategory: getCategory(t0Score),
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      description: 'Aggressive front-foot pressing allowed only 8.8 passes per defensive action in opposition half.'
    },
    {
      teamName: data?.team1?.name ?? 'Arsenal U18',
      score: t1Score,
      pressingCategory: getCategory(t1Score),
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      description: 'Structured mid-block setup. Patient positioning allowing build-up before engaging in central zone.'
    }
  ];
}
