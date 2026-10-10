import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface FormStripProps {
  form: string[];
  teamName: string;
}

export function FormStrip({ form, teamName }: FormStripProps) {
  const wins = form.filter(r => r === 'W').length;
  const draws = form.filter(r => r === 'D').length;
  const losses = form.filter(r => r === 'L').length;
  const winRate = Math.round((wins / form.length) * 100);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="h-[2px] bg-chart-3" />
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" />
          Recent Form — Last {form.length} Matches
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="flex gap-1.5">
          {form.map((r, i) => (
            <div
              key={i}
              className={`h-9 w-9 rounded-md text-xs font-bold flex items-center justify-center border ${
                r === 'W'
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : r === 'D'
                  ? 'bg-muted text-muted-foreground border-border'
                  : 'bg-destructive/10 text-destructive border-destructive/30'
              }`}
            >
              {r}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-5 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-foreground font-semibold">{wins}W</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            <span className="text-muted-foreground font-medium">{draws}D</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            <span className="text-destructive font-semibold">{losses}L</span>
          </div>
          <span className="text-foreground/60 ml-auto font-mono text-[10px]">{winRate}% win rate</span>
        </div>
      </CardContent>
    </Card>
  );
}
