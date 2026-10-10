export type Msg = { role: 'user' | 'assistant'; content: string };
import { createSseParser } from './sse-parser';
import { createAnalysisRequest } from './analysis-request';

export type Msg = { role: 'user' | 'assistant'; content: string };
export type RagSource = { title: string; source_type: string; document_id: string };
export type ThinkingStep = { step: string; detail?: string; ts: number };

const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-opposition`;

export async function streamAnalysis({
  messages,
  teamData,
  matchData,
  onDelta,
  onDone,
  onError,
  onRagSources,
  onThinking,
}: {
  messages: Msg[];
  teamData?: unknown;
  matchData?: unknown;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  onRagSources?: (sources: RagSource[]) => void;
  onThinking?: (steps: ThinkingStep[]) => void;
}) {
  try {
    const resp = await fetch(ANALYZE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(createAnalysisRequest({ messages, teamData, matchData })),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({ error: 'Request failed' }));
      onError(errData.error || `Error ${resp.status}`);
      return;
    }

    if (!resp.body) {
      onError('No response body');
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    const parser = createSseParser();

    const dispatch = (events: ReturnType<typeof parser.push>) => {
      for (const event of events) {
        if (event.type === 'thinking' && onThinking) {
          onThinking(event.steps);
        } else if (event.type === 'rag_sources' && onRagSources) {
          onRagSources(event.sources);
        } else if (event.type === 'delta') {
          onDelta(event.text);
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      dispatch(parser.push(decoder.decode(value, { stream: true })));
    }

    dispatch(parser.finish());

    onDone();
  } catch (e) {
    onError(e instanceof Error ? e.message : 'Unknown error');
  }
}
