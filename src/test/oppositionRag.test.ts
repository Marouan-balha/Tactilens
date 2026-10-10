import { describe, expect, it } from 'vitest';
import {
  createRagSearchPlan,
  dedupeRagSources,
  lastUserMessage,
} from '../../supabase/functions/_shared/opposition-rag';

describe('opposition RAG helpers', () => {
  it('builds a normalized team-filtered search plan', () => {
    expect(createRagSearchPlan('Bayern München', 'Find pressing weaknesses')).toEqual({
      teamName: 'Bayern München',
      normalizedTeam: 'bayern munich',
      rawQuery: 'Find pressing weaknesses',
      searchQuery: 'Bayern München Find pressing weaknesses',
    });
  });

  it('returns the last user message without depending on message order elsewhere', () => {
    expect(lastUserMessage([
      { role: 'user', content: 'First' },
      { role: 'assistant', content: 'Answer' },
      { role: 'user', content: 'Latest' },
    ])).toEqual({ role: 'user', content: 'Latest' });
    expect(lastUserMessage([])).toBeNull();
  });

  it('deduplicates source badges by document while preserving first appearance', () => {
    expect(dedupeRagSources([
      { title: 'First', source_type: 'pdf', document_id: 'doc-1', chunk_id: 'chunk-1' },
      { title: 'First', source_type: 'pdf', document_id: 'doc-1', chunk_id: 'chunk-2' },
      { title: 'Second', source_type: 'article', document_id: 'doc-2' },
    ])).toEqual([
      { title: 'First', source_type: 'pdf', document_id: 'doc-1' },
      { title: 'Second', source_type: 'article', document_id: 'doc-2' },
    ]);
  });
});
