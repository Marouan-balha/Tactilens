import { normalizeTeam } from './team-normalize.ts';

type Message = { role?: string; content?: unknown };
type Team = { id?: string; name?: string; isInternational?: boolean; league?: string };

type TeamData = Team & {
  selected?: Team | null;
  all_teams?: Team[];
};

export function conversationText(messages: unknown): string {
  return Array.isArray(messages)
    ? messages.map((message: Message) => String(message?.content ?? '')).join(' ')
    : '';
}

export function teamCandidates(teamData: unknown): Team[] {
  if (Array.isArray(teamData)) return teamData as Team[];
  if (teamData && Array.isArray((teamData as TeamData).all_teams)) {
    return (teamData as TeamData).all_teams!;
  }
  return [];
}

export function selectAnalysisTeam(messages: unknown, teamData: unknown): Team | null {
  const candidates = teamCandidates(teamData);
  const data = !Array.isArray(teamData) && teamData ? teamData as TeamData : null;
  let selected = data?.selected ?? (data && !data.all_teams ? data : null);
  const text = conversationText(messages);

  if (!selected && candidates.length && text.trim()) {
    const normalizedConversation = normalizeTeam(text);
    const lowerConversation = text.toLowerCase();
    selected = candidates.find((team) => {
      if (!team?.isInternational) return false;
      const normalizedName = normalizeTeam(team.name);
      return normalizedConversation === normalizedName ||
        lowerConversation.includes(String(team.name ?? '').toLowerCase()) ||
        (normalizedName.length >= 4 && lowerConversation.includes(normalizedName));
    }) ?? null;
  }

  return selected;
}

export function isInternationalTeam(team: Team | null): boolean {
  return !!(
    team?.isInternational ||
    (typeof team?.id === 'string' && team.id.startsWith('intl_')) ||
    (typeof team?.league === 'string' && /international/i.test(team.league))
  );
}

export function filterInternationalMatches(team: Team | null, matchData: unknown): unknown {
  if (!Array.isArray(matchData)) return matchData;
  return matchData.filter((match: { home_team?: string; away_team?: string }) =>
    match.home_team === team?.id || match.away_team === team?.id
  );
}
