import { describe, expect, it } from 'vitest';
import teamsData from '@/data/teams.json';
import { internationalTeams, internationalMatches } from '@/lib/internationalTeams';
import {
  conversationText,
  filterInternationalMatches,
  isInternationalTeam,
  selectAnalysisTeam,
  teamCandidates,
} from '../../supabase/functions/_shared/opposition-context';

describe('opposition context helpers', () => {
  it('selects explicit teams and exposes candidate lists', () => {
    const explicit = { selected: internationalTeams[0], all_teams: internationalTeams };

    expect(selectAnalysisTeam([{ role: 'user', content: 'Analyse Spain' }], explicit)?.name).toBe('Spain');
    expect(teamCandidates(explicit)).toHaveLength(internationalTeams.length);
    expect(conversationText([{ role: 'user', content: 'Analyse Spain' }])).toBe('Analyse Spain');
  });

  it('infers an international team from the conversation when no selector is used', () => {
    const selected = selectAnalysisTeam(
      [{ role: 'user', content: 'Give me a report on France' }],
      [...teamsData, ...internationalTeams]
    );

    expect(selected?.name).toBe('France');
    expect(isInternationalTeam(selected ?? null)).toBe(true);
  });

  it('keeps club mode separate from international mode', () => {
    expect(isInternationalTeam(teamsData[0])).toBe(false);
    expect(isInternationalTeam(internationalTeams[0])).toBe(true);
  });

  it('filters international matches by the selected team id', () => {
    const spain = internationalTeams.find((team) => team.name === 'Spain')!;
    const filtered = filterInternationalMatches(spain, internationalMatches) as Array<{ home_team: string; away_team: string }>;

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((match) => match.home_team === spain.id || match.away_team === spain.id)).toBe(true);
  });
});
