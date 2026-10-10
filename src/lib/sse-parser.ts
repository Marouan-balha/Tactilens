import type { RagSource, ThinkingStep } from './stream-chat';

export type SseEvent =
  | { type: 'delta'; text: string }
  | { type: 'rag_sources'; sources: RagSource[] }
  | { type: 'thinking'; steps: ThinkingStep[] };

export interface SseParser {
  push(chunk: string): SseEvent[];
  finish(): SseEvent[];
}

function parseLine(line: string): SseEvent | null {
  const normalized = line.endsWith('\r') ? line.slice(0, -1) : line;
  if (normalized.startsWith(':') || normalized.trim() === '' || !normalized.startsWith('data: ')) {
    return null;
  }

  const json = normalized.slice(6).trim();
  if (json === '[DONE]') return null;

  try {
    const parsed = JSON.parse(json);
    if (parsed.thinking) return { type: 'thinking', steps: parsed.thinking as ThinkingStep[] };
    if (parsed.rag_sources) return { type: 'rag_sources', sources: parsed.rag_sources as RagSource[] };
    const text = parsed.choices?.[0]?.delta?.content as string | undefined;
    return text ? { type: 'delta', text } : null;
  } catch {
    return null;
  }
}

export function createSseParser(): SseParser {
  let buffer = '';

  return {
    push(chunk) {
      buffer += chunk;
      const events: SseEvent[] = [];
      let newlineIndex = buffer.indexOf('\n');

      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        const event = parseLine(line);
        if (event) events.push(event);
        newlineIndex = buffer.indexOf('\n');
      }

      return events;
    },
    finish() {
      const events = buffer.trim() ? [parseLine(buffer)].filter((event): event is SseEvent => event !== null) : [];
      buffer = '';
      return events;
    },
  };
}
