import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, Trophy, Search, Users, CalendarDays, ExternalLink, MapPin, ListOrdered } from 'lucide-react';
import worldCup from '@/data/worldcup2026.json';

type Player = { name: string; position: string; club: string };
type Match = { date: string; opponent: string; competition: string; result: string; score: string; venue?: string };
type Standing = { mp: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number };
type Team = {
  id: string; name: string; code: string; flag?: string; iso2?: string;
  confederation: string; fifaRank: number | null; manager: string;
  standing: Standing; squad: Player[]; lastMatches: Match[];
};
type Group = { group: string; teams: Team[] };
type Fixture = {
  id: string; home: string; away: string; homeScore: number | null; awayScore: number | null;
  group: string; matchday: string; date: string; stadium: string; city: string;
  finished: boolean; type: string; homeScorers: string[]; awayScorers: string[];
};
type Stadium = { id: string; name: string; city: string; country: string; capacity: number; region: string };

const data = worldCup as unknown as {
  tournament: string; host: string; source: string; sourceUrl: string;
  snapshotDate: string; stadiums: Stadium[]; groups: Group[]; matches: Fixture[];
};

const resultColor = (r: string) =>
  r === 'W' ? 'bg-primary/20 text-primary' :
  r === 'D' ? 'bg-accent/20 text-accent' :
  'bg-destructive/20 text-destructive';

const positionOrder = ['GK', 'DF', 'MF', 'FW'];

function TeamDialog({ team, onClose }: { team: Team | null; onClose: () => void }) {
  const grouped = useMemo(() => {
    if (!team) return [];
    return positionOrder
      .map((pos) => ({ pos, players: team.squad.filter((p) => p.position === pos) }))
      .filter((g) => g.players.length > 0);
  }, [team]);

  return (
    <Dialog open={!!team} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        {team && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                {team.flag && <img src={team.flag} alt={team.name} className="h-4 w-6 rounded-sm object-cover" />}
                <span className="font-mono text-primary">{team.code}</span>
                {team.name}
                {team.fifaRank ? <Badge variant="secondary" className="text-[10px]">FIFA #{team.fifaRank}</Badge> : null}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {team.confederation || 'FIFA'} · Manager: <span className="text-foreground font-medium">{team.manager}</span>
              </p>
            </DialogHeader>

            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Last {team.lastMatches.length || 0} Matches
              </h3>
              {team.lastMatches.length ? (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <Table>
                    <TableBody>
                      {team.lastMatches.map((m, i) => (
                        <TableRow key={i} className="border-border/20">
                          <TableCell className="py-2 text-[11px] font-mono text-muted-foreground w-24">{m.date}</TableCell>
                          <TableCell className="py-2 text-xs font-medium text-foreground">vs {m.opponent}</TableCell>
                          <TableCell className="py-2 text-[10px] text-muted-foreground hidden sm:table-cell">{m.competition}</TableCell>
                          <TableCell className="py-2 text-xs font-mono text-right">{m.score}</TableCell>
                          <TableCell className="py-2 w-10 text-right">
                            <span className={`inline-flex h-5 w-5 rounded text-[10px] font-bold items-center justify-center ${resultColor(m.result)}`}>
                              {m.result}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No matches played yet.</p>
              )}
            </div>

            <div className="space-y-2 mt-2">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Current Squad ({team.squad.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {grouped.map(({ pos, players }) => (
                  <div key={pos} className="rounded-lg border border-border/40 p-3">
                    <p className="text-[10px] font-bold text-primary mb-1.5">{pos}</p>
                    <ul className="space-y-1">
                      {players.map((p, i) => (
                        <li key={i} className="flex justify-between gap-2 text-xs">
                          <span className="text-foreground font-medium truncate">{p.name}</span>
                          <span className="text-muted-foreground truncate text-right">{p.club}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GroupsView({ groups, onSelect }: { groups: Group[]; onSelect: (t: Team) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((g) => (
        <div key={g.group} className="rounded-lg border border-border/40 bg-background/30 overflow-hidden">
          <div className="px-3 py-2 bg-muted/30 border-b border-border/40 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Group {g.group}</span>
            <span className="text-[9px] font-mono text-muted-foreground/60">P W D L · Pts</span>
          </div>
          <ul className="divide-y divide-border/20">
            {g.teams.map((t) => (
              <li key={t.code}>
                <button
                  onClick={() => onSelect(t)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {t.flag && <img src={t.flag} alt="" className="h-3 w-5 rounded-[2px] object-cover shrink-0" />}
                    <span className="text-[10px] font-mono text-primary w-9">{t.code}</span>
                    <span className="text-xs font-medium text-foreground truncate">{t.name}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] text-muted-foreground">
                    <span>{t.standing.w}-{t.standing.d}-{t.standing.l}</span>
                    <span className="text-foreground font-bold w-4 text-right">{t.standing.pts}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function FixturesView({ matches }: { matches: Fixture[] }) {
  const byDate = useMemo(() => {
    const map = new Map<string, Fixture[]>();
    for (const m of matches) {
      const d = m.date.split(' ')[0];
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
  }, [matches]);

  return (
    <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
      {byDate.map(([date, list]) => (
        <div key={date}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{date}</p>
          <div className="rounded-lg border border-border/40 overflow-hidden divide-y divide-border/20">
            {list.map((m) => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                <span className="text-[9px] font-mono text-muted-foreground w-12 shrink-0">{m.type === 'group' ? `Grp ${m.group}` : m.type}</span>
                <span className="flex-1 text-right font-medium text-foreground truncate">{m.home}</span>
                <span className="font-mono font-bold w-12 text-center">
                  {m.finished ? `${m.homeScore}-${m.awayScore}` : <span className="text-muted-foreground font-normal">vs</span>}
                </span>
                <span className="flex-1 font-medium text-foreground truncate">{m.away}</span>
                <span className="hidden md:flex items-center gap-1 text-[9px] text-muted-foreground w-28 shrink-0 truncate">
                  <MapPin className="h-2.5 w-2.5" />{m.city}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StadiumsView({ stadiums }: { stadiums: Stadium[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stadiums.map((s) => (
        <div key={s.id} className="rounded-lg border border-border/40 bg-background/30 p-3">
          <p className="text-sm font-bold text-foreground">{s.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />{s.city}, {s.country}
          </p>
          <div className="flex items-center justify-between mt-2 text-[10px]">
            <Badge variant="secondary" className="text-[9px]">{s.region}</Badge>
            <span className="font-mono text-muted-foreground">{s.capacity.toLocaleString()} cap</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorldCupSection() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Team | null>(null);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.groups;
    return data.groups
      .map((g) => ({ ...g, teams: g.teams.filter((t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)) }))
      .filter((g) => g.teams.length > 0);
  }, [query]);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="h-[2px] bg-primary" />
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.15em] text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              {data.tournament}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> {data.host} · 48 teams · 12 groups · {data.stadiums.length} stadiums
            </p>
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team..."
              className="pl-8 h-9 text-xs bg-background/50"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="groups">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="groups" className="text-xs gap-1.5"><ListOrdered className="h-3.5 w-3.5" />Groups</TabsTrigger>
            <TabsTrigger value="fixtures" className="text-xs gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Fixtures</TabsTrigger>
            <TabsTrigger value="stadiums" className="text-xs gap-1.5"><MapPin className="h-3.5 w-3.5" />Stadiums</TabsTrigger>
          </TabsList>
          <TabsContent value="groups" className="mt-4">
            <GroupsView groups={filteredGroups} onSelect={setActive} />
          </TabsContent>
          <TabsContent value="fixtures" className="mt-4">
            <FixturesView matches={data.matches} />
          </TabsContent>
          <TabsContent value="stadiums" className="mt-4">
            <StadiumsView stadiums={data.stadiums} />
          </TabsContent>
        </Tabs>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 pt-1">
          <ExternalLink className="h-3 w-3" />
          {data.source} · snapshot {data.snapshotDate} ·{' '}
          <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">worldcup26.ir</a>
        </p>
      </CardContent>
      <TeamDialog team={active} onClose={() => setActive(null)} />
    </Card>
  );
}
