import { describe, expect, it } from 'vitest';
import { createSseParser } from '@/lib/sse-parser';

describe('createSseParser', () => {
  it('parses events split across chunks', () => {
    const parser = createSseParser();

    expect(parser.push('data: {"choices":[{"delta":{"content":"Press ')).toEqual([]);
    expect(parser.push('left"}}]}\n')).toEqual([
      { type: 'delta', text: 'Press left' },
    ]);
  });

  it('parses thinking and RAG source events', () => {
    const parser = createSseParser();

    expect(parser.push(
      'data: {"thinking":[{"step":"Retrieving","ts":1}]}\n' +
      'data: {"rag_sources":[{"title":"Report","source_type":"pdf","document_id":"doc-1"}]}\n'
    )).toEqual([
      { type: 'thinking', steps: [{ step: 'Retrieving', ts: 1 }] },
      { type: 'rag_sources', sources: [{ title: 'Report', source_type: 'pdf', document_id: 'doc-1' }] },
    ]);
  });

  it('ignores comments, blank lines, done markers, and malformed trailing data', () => {
    const parser = createSseParser();

    expect(parser.push(': keep-alive\n\ndata: [DONE]\n' + 'data: {"choices":')).toEqual([]);
    expect(parser.finish()).toEqual([]);
  });
});
