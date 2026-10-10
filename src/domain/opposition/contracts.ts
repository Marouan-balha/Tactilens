export const OPPOSITION_SCHEMA_VERSION = 1 as const;

export type OpponentKind = 'club' | 'international' | 'external';
export type TeamSide = 'home' | 'away';

export interface SourceReference {
  source: string;
  locator?: string;
}

export interface OpponentContract {
  schemaVersion: typeof OPPOSITION_SCHEMA_VERSION;
  stableId: string;
  legacyAliases: string[];
  name: string;
  kind: OpponentKind;
  sourceReferences: SourceReference[];
}

export interface NullableMetric {
  value: number | null;
  reason?: string;
  source?: string;
}

export interface MatchMetrics {
  possession: { home: NullableMetric; away: NullableMetric };
  shots: { home: NullableMetric; away: NullableMetric };
  shotsOnTarget: { home: NullableMetric; away: NullableMetric };
  xg: { home: NullableMetric; away: NullableMetric };
}

export interface MatchContract {
  schemaVersion: typeof OPPOSITION_SCHEMA_VERSION;
  stableId: string;
  legacyAliases: string[];
  date: string;
  competition: string;
  season?: string;
  homeOpponentId: string;
  awayOpponentId: string;
  score: string | null;
  metrics: MatchMetrics;
  sourceReferences: SourceReference[];
}

export interface LegacyOpponentInput {
  id?: string;
  name: string;
  league?: string;
  isInternational?: boolean;
  data_sources?: string[];
  dataSource?: string;
}

export interface LegacyMetricPair {
  home: number | null;
  away: number | null;
}

export interface LegacyMatchInput {
  id?: string;
  home_team: string;
  away_team: string;
  date: string;
  competition: string;
  season?: string;
  score?: string | null;
  possession?: LegacyMetricPair;
  shots?: LegacyMetricPair;
  shots_on_target?: LegacyMetricPair;
  xg?: LegacyMetricPair;
  data_source?: string;
}

export interface OpponentLookup {
  stableId: string;
  aliases: string[];
  name: string;
}

const UNKNOWN_METRIC_REASON = 'Metric was not provided by the source';

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sourceReferences(input: LegacyOpponentInput): SourceReference[] {
  const sources = input.data_sources ?? (input.dataSource ? [input.dataSource] : []);
  return sources.map((source) => ({ source }));
}

export function adaptOpponent(input: LegacyOpponentInput): OpponentContract {
  const kind: OpponentKind = input.isInternational ? 'international' : 'club';
  const rawId = input.id?.trim() || input.name;

  return {
    schemaVersion: OPPOSITION_SCHEMA_VERSION,
    stableId: `${kind}:${slug(rawId)}`,
    legacyAliases: input.id ? [input.id] : [],
    name: input.name,
    kind,
    sourceReferences: sourceReferences(input),
  };
}

export function createOpponentLookup(opponents: OpponentContract[]): OpponentLookup[] {
  return opponents.map((opponent) => ({
    stableId: opponent.stableId,
    aliases: [opponent.stableId, opponent.name, ...opponent.legacyAliases],
    name: opponent.name,
  }));
}

function opponentId(value: string, lookup: OpponentLookup[]): string {
  const normalizedValue = value.trim().toLowerCase();
  const match = lookup.find((candidate) =>
    candidate.aliases.some((alias) => alias.trim().toLowerCase() === normalizedValue)
  );
  return match?.stableId ?? `external:${slug(value)}`;
}

function metric(value: number | null | undefined, source?: string): NullableMetric {
  if (typeof value !== 'number') {
    return { value: null, reason: UNKNOWN_METRIC_REASON, source };
  }
  return { value, source };
}

function metricPair(pair: LegacyMetricPair | undefined, source?: string) {
  return {
    home: metric(pair?.home, source),
    away: metric(pair?.away, source),
  };
}

export function adaptMatch(input: LegacyMatchInput, lookup: OpponentLookup[]): MatchContract {
  const homeOpponentId = opponentId(input.home_team, lookup);
  const awayOpponentId = opponentId(input.away_team, lookup);
  const canonicalIdentity = [
    input.date,
    input.competition,
    homeOpponentId,
    awayOpponentId,
    input.score ?? 'unknown-score',
  ].join('|');

  return {
    schemaVersion: OPPOSITION_SCHEMA_VERSION,
    stableId: `match:${slug(canonicalIdentity)}`,
    legacyAliases: input.id ? [input.id] : [],
    date: input.date,
    competition: input.competition,
    season: input.season,
    homeOpponentId,
    awayOpponentId,
    score: input.score ?? null,
    metrics: {
      possession: metricPair(input.possession, input.data_source),
      shots: metricPair(input.shots, input.data_source),
      shotsOnTarget: metricPair(input.shots_on_target, input.data_source),
      xg: metricPair(input.xg, input.data_source),
    },
    sourceReferences: input.data_source ? [{ source: input.data_source }] : [],
  };
}
