import type { Msg } from './stream-chat';

export interface AnalysisRequest {
  messages: Msg[];
  teamData?: unknown;
  matchData?: unknown;
}

export function createAnalysisRequest({ messages, teamData, matchData }: AnalysisRequest) {
  return { messages, teamData, matchData };
}
