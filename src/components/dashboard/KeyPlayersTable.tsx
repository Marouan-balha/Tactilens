import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface KeyPlayersTableProps {
  players: Array<{
    name: string;
    position: string;
    number: number;
    club?: string;
    strengths: string[];
    weaknesses: string[];
  }>;
}

export function KeyPlayersTable({ players }: KeyPlayersTableProps) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="h-[2px] bg-chart-4" />
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
          <Users className="h-3.5 w-3.5" />
          Key Players Scouting Report
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 bg-muted/30">
              <TableHead className="text-[10px] uppercase tracking-wider w-10 font-bold">#</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold">Player</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold">Position</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider hidden md:table-cell font-bold">Club</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider hidden sm:table-cell font-bold">Strengths</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider hidden sm:table-cell font-bold">Weaknesses</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((p, idx) => (
              <TableRow key={p.number} className={`border-border/20 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                <TableCell className="text-xs font-mono font-bold text-primary py-2.5">{p.number}</TableCell>
                <TableCell className="text-xs font-semibold text-foreground py-2.5">{p.name}</TableCell>
                <TableCell className="py-2.5">
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-semibold">{p.position}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell py-2.5 text-xs text-muted-foreground">{p.club ?? '—'}</TableCell>
                <TableCell className="hidden sm:table-cell py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {p.strengths.slice(0, 2).map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary font-medium">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {p.weaknesses.slice(0, 2).map((w, i) => (
                      <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 border-accent/30 text-accent font-medium">
                        {w}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
