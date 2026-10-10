import { Card, CardContent } from '@/components/ui/card';
import { PitchHeatmap } from '@/components/PitchHeatmap';
import type { Msg } from '@/lib/stream-chat';

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-lg font-bold mt-6 mb-2 text-foreground">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-xl font-bold mt-6 mb-3 text-foreground">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('- ')) {
      elements.push(
        <li key={i} className="ml-4 mb-1 text-foreground/90 list-disc">
          {renderInline(line.slice(2))}
        </li>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-foreground/85 leading-relaxed mb-1">
          {renderInline(line)}
        </p>
      );
    }
  });

  return elements;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

interface AnalysisReportProps {
  messages: Msg[];
  selectedTeamId?: string;
  teamData?: {
    id: string;
    name: string;
    formation: string;
    tactical_patterns: {
      build_up: string;
      attacking: string;
      defensive: string;
      transitions: string;
    };
    strengths: string[];
    weaknesses: string[];
  };
  showHeatmaps?: boolean;
}

export function AnalysisReport({ messages, selectedTeamId, teamData, showHeatmaps }: AnalysisReportProps) {
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  if (assistantMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-3">
          <div className="text-5xl">⚽</div>
          <p className="text-lg font-medium">Select a team and ask a question</p>
          <p className="text-sm">The Opposition Analyst Agent will generate a tactical report</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-4 p-1">
      {messages.map((msg, i) => (
        <div key={i}>
          {msg.role === 'user' ? (
            <div className="flex justify-end mb-3">
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] text-sm">
                {msg.content}
              </div>
            </div>
          ) : (
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-5 text-sm font-mono leading-relaxed">
                {renderMarkdown(msg.content)}
              </CardContent>
            </Card>
          )}
        </div>
      ))}

      {/* Heatmaps after analysis */}
      {showHeatmaps && teamData && assistantMessages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <PitchHeatmap teamId={teamData.id} mode="attacking" teamData={teamData} />
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <PitchHeatmap teamId={teamData.id} mode="defensive" teamData={teamData} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
