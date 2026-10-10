import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { streamAnalysisMock } = vi.hoisted(() => ({
  streamAnalysisMock: vi.fn(),
}));

vi.mock('@/lib/stream-chat', () => ({
  streamAnalysis: streamAnalysisMock,
}));

import { useOppositionAnalyst } from '@/hooks/useOppositionAnalyst';

describe('useOppositionAnalyst', () => {
  beforeEach(() => {
    streamAnalysisMock.mockReset();
  });

  it('returns to idle state and clears all analysis state on reset', async () => {
    let resolveAnalysis!: () => void;
    streamAnalysisMock.mockImplementation(
      ({ onDelta }: { onDelta: (text: string) => void }) =>
        new Promise<void>((resolve) => {
          resolveAnalysis = () => {
            onDelta('partial response');
            resolve();
          };
        })
    );
    const { result } = renderHook(() => useOppositionAnalyst());

    act(() => {
      void result.current.analyze('Analyse Spain', 'intl_esp');
    });
    expect(result.current.status).toBe('thinking');
    expect(result.current.messages).toHaveLength(1);

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.ragSources).toEqual([]);
    expect(result.current.thinking).toEqual([]);

    await act(async () => {
      resolveAnalysis();
    });
  });

  it('records the current out-of-order completion behavior for concurrent analyses', async () => {
    const callbacks: Array<{ onDelta: (text: string) => void; onDone: () => void }> = [];
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    streamAnalysisMock
      .mockImplementationOnce(
        ({ onDelta, onDone }: { onDelta: (text: string) => void; onDone: () => void }) => {
          callbacks.push({ onDelta, onDone });
          return new Promise<void>((resolve) => { resolveFirst = resolve; });
        }
      )
      .mockImplementationOnce(
        ({ onDelta, onDone }: { onDelta: (text: string) => void; onDone: () => void }) => {
          callbacks.push({ onDelta, onDone });
          return new Promise<void>((resolve) => { resolveSecond = resolve; });
        }
      );
    const { result } = renderHook(() => useOppositionAnalyst());

    act(() => {
      void result.current.analyze('First analysis', 'intl_esp');
      void result.current.analyze('Second analysis', 'intl_fra');
    });

    act(() => {
      callbacks[1].onDelta('second response');
      callbacks[1].onDone();
      callbacks[0].onDelta('first response');
      callbacks[0].onDone();
    });

    expect(result.current.messages.at(-1)?.content).toBe('first response');
    expect(result.current.status).toBe('completed');

    await act(async () => {
      resolveSecond();
      resolveFirst();
    });
  });
});
