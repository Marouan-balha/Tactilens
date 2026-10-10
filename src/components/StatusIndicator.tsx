import { Loader2, Brain, CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import type { AgentStatus } from '@/hooks/useOppositionAnalyst';

const statusConfig: Record<AgentStatus, { label: string; icon: typeof Circle; colorClass: string }> = {
  idle: { label: 'Ready', icon: Circle, colorClass: 'text-muted-foreground' },
  thinking: { label: 'Thinking...', icon: Brain, colorClass: 'text-accent' },
  analyzing: { label: 'Analyzing...', icon: Loader2, colorClass: 'text-primary' },
  completed: { label: 'Completed', icon: CheckCircle2, colorClass: 'text-primary' },
  error: { label: 'Error', icon: AlertCircle, colorClass: 'text-destructive' },
};

export function StatusIndicator({ status }: { status: AgentStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimated = status === 'thinking' || status === 'analyzing';

  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${config.colorClass}`}>
      <Icon className={`h-4 w-4 ${isAnimated ? 'animate-spin' : ''}`} />
      <span>{config.label}</span>
    </div>
  );
}
