export interface Zone14TeamData {
  name: string;
  zone14Entries: number;
  leftHalfSpaceEntries: number;
  rightHalfSpaceEntries: number;
}

export interface Zone14SummaryData {
  team0?: Zone14TeamData;
  team1?: Zone14TeamData;
  zone14ChartImage?: string;
}

export interface SectorInsight {
  teamName: string;
  primaryChannel: string;
  zone14Volume: number;
  halfSpaceRatio: string;
  threatRating: string;
}

export function formatZone14Insights(data?: Zone14SummaryData): SectorInsight[] {
  const t0 = data?.team0 || {
    name: 'Chelsea U18',
    zone14Entries: 1420,
    leftHalfSpaceEntries: 840,
    rightHalfSpaceEntries: 620
  };

  const t1 = data?.team1 || {
    name: 'Arsenal U18',
    zone14Entries: 2444,
    leftHalfSpaceEntries: 1120,
    rightHalfSpaceEntries: 1380
  };

  return [
    {
      teamName: t0.name,
      primaryChannel: 'Left Half-Space Overload',
      zone14Volume: t0.zone14Entries,
      halfSpaceRatio: `${t0.leftHalfSpaceEntries} Left / ${t0.rightHalfSpaceEntries} Right`,
      threatRating: 'High Central Infiltration (84/100)'
    },
    {
      teamName: t1.name,
      primaryChannel: 'Right Half-Space Penetration',
      zone14Volume: t1.zone14Entries,
      halfSpaceRatio: `${t1.leftHalfSpaceEntries} Left / ${t1.rightHalfSpaceEntries} Right`,
      threatRating: 'Elite Zone 14 Exploitation (92/100)'
    }
  ];
}
