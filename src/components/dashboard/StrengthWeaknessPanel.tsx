import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface StrengthWeaknessPanelProps {
  strengths: string[];
  weaknesses: string[];
}

export function StrengthWeaknessPanel({ strengths, weaknesses }: StrengthWeaknessPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="h-[2px] bg-primary" />
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" />
            Strengths
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2.5">
          {strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs group">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <span className="text-foreground/85 leading-relaxed">{s}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="h-[2px] bg-accent" />
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Weaknesses to Exploit
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2.5">
          {weaknesses.map((w, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs group">
              <XCircle className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
              <span className="text-foreground/85 leading-relaxed">{w}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
