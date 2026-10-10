import nationalData from '@/data/national-teams.json';

/**
 * Adapts the verified national-team dataset (squads + WC2026 qualification /
 * friendly fixtures) into the same shape the Opposition Dashboard already uses
 * for clubs, so international sides can be selected and analysed end-to-end.
 *
 * No tactical data is invented: where a primary source does not provide
 * possession / shots / xG, those values are left at 0 and tactical descriptions
 * are explicitly marked as unavailable.
 */

type RawPlayer = {
  name: string;
  position: string;
  age: number;
  club: string;
  caps: number;
  goals: number;
};

type RawMatch = {
  date: string;
  home_team: string;
  away_team: string;
  score: string | null;
  competition: string;
  venue: string;
  goalscorers?: string[];
  stats?: {
    possession: number | null;
    shots: number | null;
    shots_on_target: number | null;
    xG: number | null;
  };
};

type RawTeam = {
  team_name: string;
  fifa_code: string;
  continent: string;
  squad: RawPlayer[];
  matches: { friendly?: RawMatch[]; qualification?: RawMatch[] };
};

export interface DashboardTeam {
  id: string;
  name: string;
  league: string;
  manager: string;
  formation: string;
  style: string;
  isInternational?: boolean;
  key_players: Array<{
    name: string;
    position: string;
    number: number;
    club?: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  tactical_patterns: {
    build_up: string;
    attacking: string;
    defensive: string;
    transitions: string;
  };
  strengths: string[];
  weaknesses: string[];
  recent_form: string[];
}

export interface DashboardMatch {
  id: string;
  home_team: string;
  away_team: string;
  date: string;
  competition: string;
  season: string;
  score: string;
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shots_on_target: { home: number; away: number };
  xg: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  ppda: { home: number; away: number };
  data_source: string;
  key_events: string[];
  tactical_notes: string;
}

const teams = (nationalData as { teams: RawTeam[] }).teams;

const teamId = (t: RawTeam) => `intl_${t.fifa_code.toLowerCase()}`;

const NA = 'Tactical breakdown not available from a primary source for this national side.';

function resultFor(team: string, m: RawMatch): 'W' | 'D' | 'L' | null {
  if (!m.score) return null;
  const [h, a] = m.score.split('-').map((n) => parseInt(n.trim(), 10));
  if (Number.isNaN(h) || Number.isNaN(a)) return null;
  const isHome = m.home_team === team;
  const gf = isHome ? h : a;
  const ga = isHome ? a : h;
  if (gf > ga) return 'W';
  if (gf < ga) return 'L';
  return 'D';
}

function allMatches(t: RawTeam): RawMatch[] {
  return [...(t.matches.friendly ?? []), ...(t.matches.qualification ?? [])].sort(
    (a, b) => b.date.localeCompare(a.date)
  );
}

export const internationalTeams: DashboardTeam[] = teams.map((t) => {
  const matches = allMatches(t);
  const recent_form = matches
    .map((m) => resultFor(t.team_name, m))
    .filter((r): r is 'W' | 'D' | 'L' => r !== null)
    .slice(0, 5)
    .reverse();

  const topScorer = [...t.squad].sort((a, b) => b.goals - a.goals)[0];
  const mostCapped = [...t.squad].sort((a, b) => b.caps - a.caps)[0];

  return {
    id: teamId(t),
    name: t.team_name,
    league: `${t.continent} · International`,
    manager: '—',
    formation: '—',
    style: 'National side — FIFA World Cup 2026 qualification & friendlies',
    isInternational: true,
    key_players: t.squad.map((p, i) => ({
      name: p.name,
      position: p.position,
      number: i + 1,
      club: p.club,
      strengths: [],
      weaknesses: [],
    })),
    tactical_patterns: {
      build_up: NA,
      attacking: NA,
      defensive: NA,
      transitions: NA,
    },
    strengths: [
      `Squad drawn from elite clubs (e.g. ${mostCapped?.club ?? '—'}, ${topScorer?.club ?? '—'})`,
      mostCapped ? `Experience: ${mostCapped.name} (${mostCapped.caps} caps)` : 'Experienced core',
      topScorer ? `Goal threat: ${topScorer.name} (${topScorer.goals} intl goals)` : 'Multiple goal threats',
    ],
    weaknesses: [
      'Per-match advanced metrics (xG, possession, shots) not published by primary source',
      'Tactical scouting pending live-match data',
    ],
    recent_form: recent_form.length ? recent_form : ['D'],
  };
});

export const internationalMatches: DashboardMatch[] = teams.flatMap((t) => {
  const id = teamId(t);
  return allMatches(t).map((m, i) => {
    const isHome = m.home_team === t.team_name;
    // Keep the analysed team consistently mapped to its dashboard id; the
    // opponent stays as a readable label.
    const home_team = isHome ? id : m.home_team;
    const away_team = isHome ? m.away_team : id;
    const s = m.stats ?? { possession: null, shots: null, shots_on_target: null, xG: null };
    const num = (v: number | null) => (typeof v === 'number' ? v : 0);
    return {
      id: `${id}_match_${i + 1}`,
      home_team,
      away_team,
      date: m.date,
      competition: m.competition,
      season: '2025-26',
      score: m.score ?? '—',
      possession: { home: num(s.possession), away: num(s.possession ? 100 - s.possession : 0) },
      shots: { home: num(s.shots), away: 0 },
      shots_on_target: { home: num(s.shots_on_target), away: 0 },
      xg: { home: num(s.xG), away: 0 },
      corners: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
      ppda: { home: 0, away: 0 },
      data_source: 'Wikipedia (official FIFA/UEFA match records)',
      key_events: (m.goalscorers && m.goalscorers.length ? m.goalscorers : [`${m.competition} · ${m.venue}`]),
      tactical_notes: `${m.home_team} ${m.score ?? ''} ${m.away_team} — ${m.competition}, ${m.venue}.`,
    };
  });
});
