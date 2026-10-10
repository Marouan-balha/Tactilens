import { useState, useCallback } from 'react';
import { streamAnalysis, type Msg, type RagSource, type ThinkingStep } from '@/lib/stream-chat';
import teamsData from '@/data/teams.json';
import matchesData from '@/data/matches.json';
import { internationalTeams, internationalMatches } from '@/lib/internationalTeams';

const allTeamsData = [...teamsData, ...internationalTeams];
const allMatchesData = [...matchesData, ...internationalMatches];

export type AgentStatus = 'idle' | 'thinking' | 'analyzing' | 'completed' | 'error';

export function useOppositionAnalyst() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [ragSources, setRagSources] = useState<RagSource[]>([]);
  const [thinking, setThinking] = useState<ThinkingStep[]>([]);

  const analyze = useCallback(async (input: string, selectedTeamId?: string) => {
    setError(null);
    setStatus('thinking');
    setRagSources([]);
    setThinking([]);

    const userMsg: Msg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);

    const teamData = selectedTeamId
      ? { selected: allTeamsData.find(t => t.id === selectedTeamId), all_teams: allTeamsData }
      : allTeamsData;

    const matchData = allMatchesData;

    let assistantContent = '';

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setStatus('analyzing');
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: 'assistant', content: assistantContent }];
      });
    };

    await streamAnalysis({
      messages: [...messages, userMsg],
      teamData,
      matchData,
      onDelta: (chunk) => upsertAssistant(chunk),
      onRagSources: (sources) => setRagSources(sources),
      onThinking: (steps) => setThinking(steps),
      onDone: () => setStatus('completed'),
      onError: (err) => {
        setError(err);
        setStatus('error');
      },
    });
  }, [messages]);

  const reset = useCallback(() => {
    setMessages([]);
    setStatus('idle');
    setError(null);
    setRagSources([]);
    setThinking([]);
  }, []);

  return { messages, status, error, analyze, reset, ragSources, thinking };
}
