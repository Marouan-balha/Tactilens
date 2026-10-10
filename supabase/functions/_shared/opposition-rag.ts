import { normalizeTeam } from './team-normalize.ts';

type Message = { role?: string; content?: unknown };

export interface RagSearchPlan {
  teamName: string;
  normalizedTeam: string;
  searchQuery: string;
  rawQuery: string;
}

export interface RagResult {
  title: string;
  source_type: string;
  document_id: string;
  chunk_id?: string;
  content?: string;
  rank?: number;
}

export interface RagSource {
  title: string;
  source_type: string;
  document_id: string;
}

export function lastUserMessage(messages: unknown): Message | null {
  if (!Array.isArray(messages)) return null;
  return [...messages].reverse().find((message: Message) => message?.role === 'user') ?? null;
}

export function createRagSearchPlan(teamName: string, userContent: string): RagSearchPlan {
  const normalizedTeam = teamName ? normalizeTeam(teamName) : '';
  const rawQuery = userContent.trim();
  return {
    teamName,
    normalizedTeam,
    rawQuery,
    searchQuery: `${teamName} ${rawQuery}`.trim(),
  };
}

export function dedupeRagSources(results: RagResult[]): RagSource[] {
  const seen = new Set<string>();
  const sources: RagSource[] = [];
  for (const result of results) {
    if (seen.has(result.document_id)) continue;
    seen.add(result.document_id);
    sources.push({
      title: result.title,
      source_type: result.source_type,
      document_id: result.document_id,
    });
  }
  return sources;
}
