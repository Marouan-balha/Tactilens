import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BRAND_LOGO_PNG } from './brandLogo';

export interface TeamData {
  id: string;
  name: string;
  league: string;
  manager: string;
  formation: string;
  style: string;
  key_players: Array<{
    name: string;
    position: string;
    number: number;
    strengths: string[];
    weaknesses: string[];
  }>;
  tactical_patterns: {
    build_up: string;
    attacking: string;
    defensive: string;
    transitions: string;
    [key: string]: string;
  };
  strengths: string[];
  weaknesses: string[];
  recent_form: string[];
}

export interface MatchData {
  id: string;
  home_team: string;
  away_team: string;
  date: string;
  competition: string;
  score: string;
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shots_on_target: { home: number; away: number };
  xg: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  key_events: string[];
  tactical_notes: string;
}

type ReportType = 'summary' | 'detailed';

const COLORS = {
  primary: [45, 155, 78] as [number, number, number],
  dark: [10, 10, 15] as [number, number, number],
  darkCard: [20, 20, 30] as [number, number, number],
  text: [230, 230, 235] as [number, number, number],
  muted: [150, 150, 160] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  accent: [255, 165, 0] as [number, number, number],
  red: [220, 80, 80] as [number, number, number],
  tableRow1: [18, 18, 28] as [number, number, number],
  tableRow2: [25, 25, 38] as [number, number, number],
};

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function safeAddLogo(doc: jsPDF, x: number, y: number, w: number, h: number) {
  try {
    doc.addImage(BRAND_LOGO_PNG, 'PNG', x, y, w, h);
  } catch (e) {
    console.error('Logo render failed:', e);
  }
}

function addFooter(doc: jsPDF, date: string) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    if (i === 1) continue; // cover page has its own branding
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 15);
    safeAddLogo(doc, MARGIN, PAGE_HEIGHT - 13.5, 5, 5);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text('Confidential — Tactivision.ai', MARGIN + 7, PAGE_HEIGHT - 10);
    doc.text(date, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: 'right' });
  }
}

function addCoverPage(doc: jsPDF, teamData: TeamData, date: string) {
  // Background
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  // Top accent line
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE_WIDTH, 4, 'F');

  // Brand logo + wordmark
  safeAddLogo(doc, MARGIN, 30, 16, 16);

  doc.setFontSize(13);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('TACTIVISION.AI', MARGIN + 20, 38);

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text('OPPOSITION ANALYSIS REPORT', MARGIN + 20, 44);

  // Divider
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 56, MARGIN + 50, 56);

  // Team name
  doc.setFontSize(36);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text(teamData.name.toUpperCase(), MARGIN, 88);

  // Details
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(teamData.league, MARGIN, 101);

  doc.setFontSize(11);
  let y = 118;
  const details = [
    ['Formation', teamData.formation],
    ['Style', teamData.style],
    ['Manager', teamData.manager],
  ];
  details.forEach(([label, value]) => {
    doc.setTextColor(...COLORS.muted);
    doc.text(`${label}:`, MARGIN, y);
    doc.setTextColor(...COLORS.white);
    doc.text(value, MARGIN + 30, y);
    y += 8;
  });

  // Prepared-by credit block
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, PAGE_HEIGHT - 52, MARGIN + 50, PAGE_HEIGHT - 52);

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text('PREPARED BY', MARGIN, PAGE_HEIGHT - 46);
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('Operations Analyst — Tactivision.ai', MARGIN, PAGE_HEIGHT - 40);

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report Generated: ${date}`, MARGIN, PAGE_HEIGHT - 33);

  // Watermark logo (bottom-right, subtle)
  safeAddLogo(doc, PAGE_WIDTH - MARGIN - 55, PAGE_HEIGHT - 95, 55, 55);

  // Bottom accent
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, PAGE_HEIGHT - 4, PAGE_WIDTH, 4, 'F');
}

function addSectionHeader(doc: jsPDF, y: number, title: string, subtitle?: string): number {
  if (y > PAGE_HEIGHT - 50) {
    doc.addPage();
    doc.setFillColor(...COLORS.dark);
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
    y = 30;
  }

  doc.setFillColor(...COLORS.primary);
  doc.rect(MARGIN, y, 3, 14, 'F');

  doc.setFontSize(14);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), MARGIN + 8, y + 10);

  if (subtitle) {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, MARGIN + 8, y + 18);
    return y + 28;
  }
  return y + 22;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_HEIGHT - 25) {
    doc.addPage();
    doc.setFillColor(...COLORS.dark);
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
    return 30;
  }
  return y;
}

function addPerformanceOverview(doc: jsPDF, y: number, teamData: TeamData, matches: MatchData[]): number {
  y = addSectionHeader(doc, y, 'Performance Overview', 'Key metrics from recent fixtures');

  const wins = teamData.recent_form.filter(r => r === 'W').length;
  const draws = teamData.recent_form.filter(r => r === 'D').length;
  const losses = teamData.recent_form.filter(r => r === 'L').length;
  const winRate = Math.round((wins / teamData.recent_form.length) * 100);

  const avgXG = matches.length > 0
    ? (matches.reduce((sum, m) => {
        const isHome = m.home_team === teamData.id;
        return sum + (isHome ? m.xg.home : m.xg.away);
      }, 0) / matches.length).toFixed(2)
    : '—';

  const avgPossession = matches.length > 0
    ? Math.round(matches.reduce((sum, m) => {
        const isHome = m.home_team === teamData.id;
        return sum + (isHome ? m.possession.home : m.possession.away);
      }, 0) / matches.length)
    : 0;

  const kpis = [
    { label: 'Win Rate', value: `${winRate}%`, detail: `${wins}W ${draws}D ${losses}L in last ${teamData.recent_form.length}` },
    { label: 'Avg xG', value: avgXG, detail: 'Expected goals per match' },
    { label: 'Avg Possession', value: `${avgPossession}%`, detail: 'Ball possession per match' },
    { label: 'Key Players', value: `${teamData.key_players.length}`, detail: 'Players tracked' },
  ];

  const boxWidth = (CONTENT_WIDTH - 9) / 4;
  kpis.forEach((kpi, i) => {
    const x = MARGIN + i * (boxWidth + 3);
    y = ensureSpace(doc, y, 35);

    doc.setFillColor(...COLORS.darkCard);
    doc.roundedRect(x, y, boxWidth, 30, 2, 2, 'F');

    doc.setFillColor(...COLORS.primary);
    doc.rect(x, y, boxWidth, 2, 'F');

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label.toUpperCase(), x + 4, y + 10);

    doc.setFontSize(16);
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, x + 4, y + 22);

    doc.setFontSize(6);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.detail, x + 4, y + 28);
  });

  return y + 38;
}

function addRecentForm(doc: jsPDF, y: number, teamData: TeamData): number {
  y = addSectionHeader(doc, y, 'Recent Form', `Last ${teamData.recent_form.length} matches`);
  y = ensureSpace(doc, y, 20);

  const boxSize = 12;
  const gap = 3;
  teamData.recent_form.forEach((result, i) => {
    const x = MARGIN + i * (boxSize + gap);
    const color = result === 'W' ? COLORS.primary : result === 'D' ? COLORS.accent : COLORS.red;
    doc.setFillColor(...color);
    doc.roundedRect(x, y, boxSize, boxSize, 1.5, 1.5, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.text(result, x + boxSize / 2, y + boxSize / 2 + 2.5, { align: 'center' });
  });

  return y + boxSize + 10;
}

function addStrengthsWeaknesses(doc: jsPDF, y: number, teamData: TeamData): number {
  y = addSectionHeader(doc, y, 'SWOT Analysis', 'Strengths and weaknesses assessment');

  const colWidth = (CONTENT_WIDTH - 4) / 2;

  // Strengths
  y = ensureSpace(doc, y, 10 + teamData.strengths.length * 7);
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('STRENGTHS', MARGIN, y + 5);

  doc.setTextColor(...COLORS.accent);
  doc.text('WEAKNESSES', MARGIN + colWidth + 4, y + 5);
  y += 10;

  const maxItems = Math.max(teamData.strengths.length, teamData.weaknesses.length);
  for (let i = 0; i < maxItems; i++) {
    y = ensureSpace(doc, y, 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    if (i < teamData.strengths.length) {
      doc.setTextColor(...COLORS.primary);
      doc.text('+', MARGIN, y);
      doc.setTextColor(...COLORS.text);
      doc.text(teamData.strengths[i], MARGIN + 5, y);
    }
    if (i < teamData.weaknesses.length) {
      doc.setTextColor(...COLORS.red);
      doc.text('–', MARGIN + colWidth + 4, y);
      doc.setTextColor(...COLORS.text);
      doc.text(teamData.weaknesses[i], MARGIN + colWidth + 9, y);
    }
    y += 7;
  }

  return y + 5;
}

function addTacticalPatterns(doc: jsPDF, y: number, teamData: TeamData): number {
  y = addSectionHeader(doc, y, 'Tactical Patterns', 'Phase-of-play breakdown');

  const phases = Object.entries(teamData.tactical_patterns);
  phases.forEach(([phase, description]) => {
    y = ensureSpace(doc, y, 25);

    doc.setFontSize(9);
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(phase.replace(/_/g, ' ').toUpperCase(), MARGIN, y);
    y += 5;

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(description, CONTENT_WIDTH);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4.5 + 6;
  });

  return y;
}

function addKeyPlayers(doc: jsPDF, y: number, teamData: TeamData): number {
  y = addSectionHeader(doc, y, 'Key Personnel', 'Players to watch — scouting report');
  y = ensureSpace(doc, y, 20);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Player', 'Position', 'Strengths', 'Weaknesses']],
    body: teamData.key_players.map(p => [
      p.number.toString(),
      p.name,
      p.position,
      p.strengths.join(', '),
      p.weaknesses.join(', '),
    ]),
    theme: 'plain',
    styles: {
      fontSize: 7.5,
      textColor: COLORS.text,
      cellPadding: 3,
      lineWidth: 0,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: COLORS.tableRow2,
    },
    bodyStyles: {
      fillColor: COLORS.tableRow1,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
    },
    margin: { left: MARGIN, right: MARGIN },
    didDrawPage: (data) => {
      // Fill background on new pages
      if (data.pageNumber > 1) {
        doc.setFillColor(...COLORS.dark);
        doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
      }
    },
  });

  const tableDoc = doc as jsPDF & { lastAutoTable: { finalY: number } };
  return tableDoc.lastAutoTable.finalY + 10;
}

function addMatchDetails(doc: jsPDF, y: number, matches: MatchData[], teamData: TeamData): number {
  y = addSectionHeader(doc, y, 'Match-by-Match Breakdown', 'Detailed fixture analysis');

  matches.forEach((match) => {
    y = ensureSpace(doc, y, 50);
    const isHome = match.home_team === teamData.id;
    const opponent = isHome ? match.away_team : match.home_team;
    const venue = isHome ? 'Home' : 'Away';

    // Match header
    doc.setFillColor(...COLORS.darkCard);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 16, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.text(`vs ${opponent.replace(/_/g, ' ').toUpperCase()} (${venue})`, MARGIN + 4, y + 7);

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.primary);
    doc.text(match.score, MARGIN + CONTENT_WIDTH - 4, y + 7, { align: 'right' });

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(`${match.date} · ${match.competition}`, MARGIN + 4, y + 13);
    y += 22;

    // Stats row
    const stats = [
      ['xG', isHome ? match.xg.home.toString() : match.xg.away.toString()],
      ['Possession', `${isHome ? match.possession.home : match.possession.away}%`],
      ['Shots', (isHome ? match.shots.home : match.shots.away).toString()],
      ['On Target', (isHome ? match.shots_on_target.home : match.shots_on_target.away).toString()],
      ['Corners', (isHome ? match.corners.home : match.corners.away).toString()],
    ];

    const statWidth = CONTENT_WIDTH / stats.length;
    stats.forEach(([label, val], i) => {
      const x = MARGIN + i * statWidth;
      doc.setFontSize(6);
      doc.setTextColor(...COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.text(label, x + statWidth / 2, y, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.white);
      doc.setFont('helvetica', 'bold');
      doc.text(val, x + statWidth / 2, y + 6, { align: 'center' });
    });
    y += 14;

    // Key events
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('KEY EVENTS', MARGIN, y);
    y += 5;

    match.key_events.forEach(event => {
      y = ensureSpace(doc, y, 6);
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(`• ${event}`, CONTENT_WIDTH - 5);
      doc.text(lines, MARGIN + 3, y);
      y += lines.length * 4;
    });
    y += 3;

    // Tactical notes
    y = ensureSpace(doc, y, 15);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('TACTICAL NOTES', MARGIN, y);
    y += 5;

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(match.tactical_notes, CONTENT_WIDTH - 5);
    doc.text(noteLines, MARGIN + 3, y);
    y += noteLines.length * 4 + 10;
  });

  return y;
}

export function generateReport(
  teamData: TeamData,
  matchesData: MatchData[],
  type: ReportType = 'summary'
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const teamMatches = matchesData.filter(
    m => m.home_team === teamData.id || m.away_team === teamData.id
  );

  // Cover page
  addCoverPage(doc, teamData, today);

  // Page 2+
  doc.addPage();
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  let y = 25;
  y = addPerformanceOverview(doc, y, teamData, teamMatches);
  y = addRecentForm(doc, y, teamData);
  y = addStrengthsWeaknesses(doc, y, teamData);

  if (type === 'detailed') {
    y = addTacticalPatterns(doc, y, teamData);
    y = addKeyPlayers(doc, y, teamData);
    y = addMatchDetails(doc, y, teamMatches, teamData);
  }

  addFooter(doc, today);

  const suffix = type === 'detailed' ? 'Tactical_Report' : 'Summary';
  doc.save(`${teamData.name.replace(/\s+/g, '_')}_${suffix}.pdf`);
}
