import { describe, expect, it } from 'vitest';
import teamsData from '@/data/teams.json';
import matchesData from '@/data/matches.json';
import { internationalMatches, internationalTeams } from '@/lib/internationalTeams';
import {
  adaptMatch,
  adaptOpponent,
  createOpponentLookup,
  type LegacyMatchInput,
} from '@/domain/opposition/contracts';

describe('opposition contracts', () => {
  it('adapts club and international opponents with stable ids and legacy aliases', () => {
    const club = adaptOpponent(teamsData[0]);
    const international = adaptOpponent(internationalTeams[0]);
    const repeatedClub = adaptOpponent(teamsData[0]);

    expect(club.stableId).toBe('club:man-city');
    expect(club.legacyAliases).toEqual(['man_city']);
    expect(club.kind).toBe('club');
    expect(international.stableId).toBe('international:intl-esp');
    expect(international.kind).toBe('international');
    expect(repeatedClub.stableId).toBe(club.stableId);
  });

  it('preserves known opponent identity and gives unknown names explicit external ids', () => {
    const opponents = [adaptOpponent(teamsData[0]), adaptOpponent(internationalTeams[0])];
    const lookup = createOpponentLookup(opponents);
    const match = adaptMatch(
      {
        id: 'legacy-match',
        home_team: 'man_city',
        away_team: 'Aston Villa',
        date: '2025-11-09',
        competition: 'Premier League',
        score: '3-0',
      },
      lookup
    );

    expect(match.homeOpponentId).toBe('club:man-city');
    expect(match.awayOpponentId).toBe('external:aston-villa');
    expect(match.legacyAliases).toEqual(['legacy-match']);
  });

  it('keeps measured zero distinct from unavailable null metrics', () => {
    const opponent = adaptOpponent(teamsData[0]);
    const lookup = createOpponentLookup([opponent]);
    const input: LegacyMatchInput = {
      home_team: 'man_city',
      away_team: 'Unknown opponent',
      date: '2025-11-09',
      competition: 'Test competition',
      possession: { home: 0, away: null },
      shots: { home: null, away: 0 },
    };
    const match = adaptMatch(input, lookup);

    expect(match.metrics.possession.home.value).toBe(0);
    expect(match.metrics.possession.away.value).toBeNull();
    expect(match.metrics.possession.away.reason).toBeDefined();
    expect(match.metrics.shots.home.value).toBeNull();
    expect(match.metrics.shots.away.value).toBe(0);
  });

  it('creates deterministic match ids from identity rather than array position', () => {
    const opponents = [adaptOpponent(teamsData[0]), adaptOpponent(teamsData[1])];
    const lookup = createOpponentLookup(opponents);
    const source = matchesData[0];
    const first = adaptMatch(source, lookup);
    const reordered = adaptMatch({ ...source, id: 'different-legacy-id' }, lookup);

    expect(first.stableId).toBe(reordered.stableId);
    expect(first.stableId).not.toContain('match-001');
  });

  it('adapts the existing international match shape with explicit team ids', () => {
    const opponents = internationalTeams.map(adaptOpponent);
    const lookup = createOpponentLookup(opponents);
    const source = internationalMatches[0];
    const match = adaptMatch(source, lookup);

    expect(match.homeOpponentId).toMatch(/^(international:|external:)/);
    expect(match.awayOpponentId).toMatch(/^(international:|external:)/);
    expect(match.schemaVersion).toBe(1);
  });
});
