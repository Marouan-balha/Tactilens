import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';

interface TacticalRadarProps {
  teamData: {
    name: string;
    strengths: string[];
    weaknesses: string[];
    tactical_patterns: {
      build_up: string;
      attacking: string;
      defensive: string;
      transitions: string;
    };
  };
}

function scoreDimension(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let score = 50;
  keywords.forEach(k => { if (lower.includes(k)) score += 12; });
  return Math.min(score, 95);
}

export function TacticalRadar({ teamData }: TacticalRadarProps) {
  const { tactical_patterns: tp, strengths, weaknesses } = teamData;
  const allText = `${tp.build_up} ${tp.attacking} ${tp.defensive} ${tp.transitions} ${strengths.join(' ')} ${weaknesses.join(' ')}`;

  const data = [
    { dimension: 'Pressing', value: scoreDimension(allText, ['press', 'high press', 'gegenpress', 'intensity', 'aggressive']) },
    { dimension: 'Possession', value: scoreDimension(allText, ['possession', 'retain', 'control', 'patient', 'build-up']) },
    { dimension: 'Transition', value: scoreDimension(allText, ['counter', 'transition', 'fast break', 'vertical', 'pace']) },
    { dimension: 'Set Pieces', value: scoreDimension(allText, ['corner', 'free kick', 'aerial', 'header', 'set piece']) },
    { dimension: 'Creativity', value: scoreDimension(allText, ['dribbl', 'through ball', 'vision', 'playmaking', 'half-space']) },
    { dimension: 'Defense', value: scoreDimension(allText, ['compact', 'block', 'interception', 'discipline', 'recovery']) },
  ];

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="h-[2px] bg-primary" />
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
          <Target className="h-3.5 w-3.5" />
          Tactical Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name={teamData.name}
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '11px',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
