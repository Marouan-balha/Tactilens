import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  accentColor?: string;
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, accentColor }: KPICardProps) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden relative group hover:border-primary/30 transition-colors">
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accentColor || 'hsl(var(--primary))' }} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground tracking-tight leading-none">{value}</p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>
            )}
          </div>
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: accentColor ? `${accentColor}15` : 'hsl(var(--primary) / 0.1)' }}
          >
            <Icon
              className="h-4 w-4"
              style={{ color: accentColor || 'hsl(var(--primary))' }}
            />
          </div>
        </div>
        {trend && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              trend === 'up' ? 'bg-primary/10 text-primary' : trend === 'down' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
            }`}>
              {trend === 'up' ? '▲ Strong' : trend === 'down' ? '▼ Weak' : '— Average'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
