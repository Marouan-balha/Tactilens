import { describe, it, expect } from 'vitest';
import { computeXgStats, type ShotEvent, type XgSummaryData } from '@/lib/xgUtils';

describe('xgUtils', () => {
  it('computes default xG metrics when no inputs are provided', () => {
    const stats = computeXgStats();
    expect(stats.team0Name).toBe('Chelsea U18');
    expect(stats.team1Name).toBe('Arsenal U18');
    expect(stats.team0Xg).toBe(3.79);
    expect(stats.team1Xg).toBe(2.66);
    expect(stats.team0Goals).toBe(2);
    expect(stats.team1Goals).toBe(1);
    expect(stats.team0Diff).toBe(-1.79);
    expect(stats.team1Diff).toBe(-1.66);
    expect(stats.totalShots).toBe(0);
    expect(stats.bestShot).toBeNull();
  });

  it('computes highest quality chance and top creator from custom shot data', () => {
    const summary: XgSummaryData = {
      team0: {
        name: 'Chelsea U18',
        xgTotal: 3.5,
        goalsScored: 3,
        topXaCreator: '#142 (CM)',
        topXaValue: 0.85,
      },
      team1: {
        name: 'Arsenal U18',
        xgTotal: 1.2,
        goalsScored: 1,
        topXaCreator: '#10 (AM)',
        topXaValue: 0.45,
      },
    };

    const shots: ShotEvent[] = [
      {
        minute: 15,
        team: 0,
        player: '#9 (ST)',
        x: 95.0,
        y: 34.0,
        outcome: 'goal',
        isHeader: false,
        assister: '#142 (CM)',
        xg: 0.82,
        xa: 0.82,
      },
      {
        minute: 60,
        team: 0,
        player: '#11 (LW)',
        x: 98.0,
        y: 33.0,
        outcome: 'saved',
        isHeader: true,
        assister: '#142 (CM)',
        xg: 0.91,
        xa: 0.91,
      },
      {
        minute: 75,
        team: 1,
        player: '#9 (ST)',
        x: 88.0,
        y: 30.0,
        outcome: 'missed',
        isHeader: false,
        assister: '#10 (AM)',
        xg: 0.35,
        xa: 0.35,
      },
    ];

    const stats = computeXgStats(summary, shots);

    expect(stats.team0Xg).toBe(3.5);
    expect(stats.team0Goals).toBe(3);
    expect(stats.team0Diff).toBe(-0.5);
    expect(stats.totalShots).toBe(3);
    expect(stats.bestShot).not.toBeNull();
    expect(stats.bestShot?.player).toBe('#11 (LW)');
    expect(stats.bestShot?.xg).toBe(0.91);
    expect(stats.topCreator.player).toBe('#142 (CM)');
    expect(stats.topCreator.xa).toBe(0.85);
  });
});
