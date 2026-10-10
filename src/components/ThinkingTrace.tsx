import { useState } from 'react';
import { ChevronDown, Brain, Loader2, CheckCircle2 } from 'lucide-react';
import type { ThinkingStep } from '@/lib/stream-chat';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Props {
  steps: ThinkingStep[];
  active: boolean;
}

export function ThinkingTrace({ steps, active }: Props) {
  const [open, setOpen] = useState(true);
  if (steps.length === 0 && !active) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-accent/30 bg-accent/5">
        <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent">
            {active ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Brain className="h-3.5 w-3.5" />
            )}
            <span>
              {active ? 'Thinking…' : 'Reasoning trace'}
              <span className="ml-1.5 text-muted-foreground font-normal">
                ({steps.length} step{steps.length === 1 ? '' : 's'})
              </span>
            </span>
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ol className="px-3 pb-3 pt-1 space-y-1.5 font-mono text-[11px]">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-foreground/90">
                    <span className="font-semibold">{s.step}</span>
                    {s.detail && (
                      <span className="text-muted-foreground"> — {s.detail}</span>
                    )}
                  </div>
                </div>
                <span className="text-muted-foreground/60 shrink-0 tabular-nums">
                  {s.ts}ms
                </span>
              </li>
            ))}
            {active && (
              <li className="flex items-center gap-2 text-accent/80">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Generating tactical report…</span>
              </li>
            )}
          </ol>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
