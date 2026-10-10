import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BRAND_LOGO_PNG } from './brandLogo';
import type { FifaTacticalProfile } from '@/data/fifaTacticalProfiles';

/**
 * PFSA-style Opposition Analysis report, modelled on the DRC Tactical
 * Intelligence house style and built entirely from the qualitative,
 * FIFA-derived tactical profile (no raw numbers).
 */

const C = {
  primary: [45, 155, 78] as [number, number, number],
  dark: [10, 10, 15] as [number, number, number],
  card: [20, 20, 30] as [number, number, number],
  cardAlt: [26, 26, 38] as [number, number, number],
  text: [228, 230, 235] as [number, number, number],
  muted: [150, 152, 162] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  accent: [255, 165, 0] as [number, number, number],
  red: [222, 84, 84] as [number, number, number],
};

const PW = 210, PH = 297, M = 18, CW = PW - M * 2;

function logo(doc: jsPDF, x: number, y: number, w: number, h: number) {
  try { doc.addImage(BRAND_LOGO_PNG, 'PNG', x, y, w, h); } catch { /* ignore */ }
}

function bg(doc: jsPDF) {
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PW, PH, 'F');
}

function ensure(doc: jsPDF, y: number, need: number): number {
  if (y + need > PH - 22) { doc.addPage(); bg(doc); return 26; }
  return y;
}

function header(doc: jsPDF, y: number, title: string, subtitle?: string): number {
  y = ensure(doc, y, 30);
  doc.setFillColor(...C.primary);
  doc.rect(M, y, 3, 13, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C.white);
  doc.text(title.toUpperCase(), M + 7, y + 9);
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(subtitle, M + 7, y + 15);
    return y + 24;
  }
  return y + 19;
}

function bullets(doc: jsPDF, y: number, items: string[], color = C.text, marker = '•'): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const it of items) {
    const lines = doc.splitTextToSize(it, CW - 6);
    y = ensure(doc, y, lines.length * 4.6 + 3);
    doc.setTextColor(...C.primary);
    doc.text(marker, M, y);
    doc.setTextColor(...color);
    doc.text(lines, M + 5, y);
    y += lines.length * 4.6 + 2.5;
  }
  return y + 2;
}

function paragraph(doc: jsPDF, y: number, text: string): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(text, CW);
  y = ensure(doc, y, lines.length * 4.8 + 4);
  doc.setTextColor(...C.text);
  doc.text(lines, M, y);
  return y + lines.length * 4.8 + 4;
}

function subLabel(doc: jsPDF, y: number, label: string): number {
  y = ensure(doc, y, 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.accent);
  doc.text(label.toUpperCase(), M, y);
  return y + 5;
}

function cover(doc: jsPDF, p: FifaTacticalProfile, date: string) {
  bg(doc);
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, PW, 4, 'F');
  logo(doc, M, 28, 15, 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.primary);
  doc.text('TACTIVISION.AI', M + 19, 35);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text('OPPOSITION ANALYSIS · PFSA-STYLE INTELLIGENCE REPORT', M + 19, 41);

  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.8);
  doc.line(M, 58, M + 48, 58);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...C.muted);
  doc.text('OPPONENT ANALYSIS', M, 78);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(40);
  doc.setTextColor(...C.white);
  doc.text(p.name.toUpperCase(), M, 96);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...C.muted);
  const fLines = doc.splitTextToSize(p.formation, CW);
  doc.text(fLines, M, 110);

  let y = 132;
  const meta: [string, string][] = [
    ['Competition', 'FIFA World Cup 2026'],
    ['Data source', 'FIFA Post-Match Summary Reports (Phases of Play)'],
    ['Report date', date],
    ['Classification', 'Coaching Staff Only · Confidential'],
  ];
  meta.forEach(([k, v]) => {
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text(`${k}:`, M, y);
    doc.setTextColor(...C.white);
    const vl = doc.splitTextToSize(v, CW - 40);
    doc.text(vl, M + 38, y);
    y += vl.length * 5 + 3;
  });

  logo(doc, PW - M - 52, PH - 92, 52, 52);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text('PREPARED BY', M, PH - 40);
  doc.setFontSize(11);
  doc.setTextColor(...C.white);
  doc.text('TactiVision.ai — Opposition Analysis Unit', M, PH - 33);
  doc.setFillColor(...C.primary);
  doc.rect(0, PH - 4, PW, 4, 'F');
}

function footer(doc: jsPDF, date: string) {
  const n = doc.getNumberOfPages();
  for (let i = 2; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.primary);
    doc.setLineWidth(0.3);
    doc.line(M, PH - 14, PW - M, PH - 14);
    logo(doc, M, PH - 12.5, 4.5, 4.5);
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.setFont('helvetica', 'normal');
    doc.text('Confidential — Tactivision.ai', M + 6, PH - 9.5);
    doc.text(date, PW / 2, PH - 9.5, { align: 'center' });
    doc.text(`Page ${i} of ${n}`, PW - M, PH - 9.5, { align: 'right' });
  }
}

function twoCol(doc: jsPDF, y: number, leftTitle: string, left: string[], rightTitle: string, right: string[]): number {
  const colW = (CW - 6) / 2;
  y = ensure(doc, y, 12);
  const startY = y;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.primary);
  doc.text(leftTitle.toUpperCase(), M, y);
  doc.setTextColor(...C.red);
  doc.text(rightTitle.toUpperCase(), M + colW + 6, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  let ly = y, ry = y;
  for (const it of left) {
    const lines = doc.splitTextToSize(it, colW - 5);
    doc.setTextColor(...C.primary); doc.text('+', M, ly);
    doc.setTextColor(...C.text); doc.text(lines, M + 4, ly);
    ly += lines.length * 4.4 + 2.5;
  }
  for (const it of right) {
    const lines = doc.splitTextToSize(it, colW - 5);
    doc.setTextColor(...C.red); doc.text('–', M + colW + 6, ry);
    doc.setTextColor(...C.text); doc.text(lines, M + colW + 10, ry);
    ry += lines.length * 4.4 + 2.5;
  }
  return Math.max(ly, ry) + 3;
}

export function generateFifaReport(profile: FifaTacticalProfile) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  cover(doc, profile, date);

  // 1. Executive Summary
  doc.addPage(); bg(doc);
  let y = 26;
  y = header(doc, y, 'Executive Summary', 'Headline tactical intelligence at a glance');
  y = subLabel(doc, y, 'Team Identity');
  y = bullets(doc, y, profile.executiveSummary.identity);
  y = twoCol(doc, y, 'Main Strengths', profile.executiveSummary.strengths, 'Main Weaknesses', profile.executiveSummary.weaknesses);
  y = subLabel(doc, y, 'Tactical Risk');
  y = paragraph(doc, y, profile.executiveSummary.risk);
  y = subLabel(doc, y, 'Overall Recommendation');
  y = paragraph(doc, y, profile.executiveSummary.recommendation);

  // 2. Team Identity & Tactical Profile
  y = header(doc, y, 'Team Identity & Tactical Profile', 'Playing identity and headline profile');
  y = bullets(doc, y, profile.identity);
  y = subLabel(doc, y, 'Analytical Profile');
  y = bullets(doc, y, [
    `Attacking threat — ${profile.metrics.attackingThreat}`,
    `Pressing intensity — ${profile.metrics.pressingIntensity}`,
    `Progression / territory — ${profile.metrics.progressionThreat}`,
    `Defensive block — ${profile.metrics.blockHeight}`,
  ]);

  // 3. Formation & Structural Behaviour
  y = header(doc, y, 'Formation & Structural Behaviour', 'Shape and positional structure');
  y = subLabel(doc, y, 'Preferred Formation');
  y = paragraph(doc, y, profile.formation);
  y = subLabel(doc, y, 'Structural Behaviour');
  y = paragraph(doc, y, profile.structuralBehaviour);

  // 4. In-Possession Analysis
  y = header(doc, y, 'In-Possession Analysis', 'Phases of play — with the ball');
  y = bullets(doc, y, profile.inPossession);

  // 5. Out-of-Possession Analysis
  y = header(doc, y, 'Out-of-Possession Analysis', 'Phases of play — without the ball');
  y = bullets(doc, y, profile.outOfPossession);

  // 6. Transitions
  y = header(doc, y, 'Transitions', 'Attacking & defensive transition behaviour');
  y = subLabel(doc, y, 'Attacking Transition');
  y = paragraph(doc, y, profile.transitions.attacking);
  y = subLabel(doc, y, 'Defensive Transition');
  y = paragraph(doc, y, profile.transitions.defensive);

  // 7. Set-Piece Profile
  y = header(doc, y, 'Set-Piece Profile', 'Dead-ball tendencies');
  y = paragraph(doc, y, profile.setPiece);

  // 8. Key Players & Threat Matrix
  y = header(doc, y, 'Key Players & Threat Matrix', 'Individuals to neutralise');
  y = ensure(doc, y, 24);
  autoTable(doc, {
    startY: y,
    head: [['Player', 'Role', 'Strength', 'Weakness', 'Instruction']],
    body: profile.keyPlayers.map((k) => [k.name, k.role, k.strength, k.weakness, k.instruction]),
    theme: 'plain',
    styles: { fontSize: 7.5, textColor: C.text, cellPadding: 2.5, lineWidth: 0, valign: 'top' },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fillColor: C.card },
    alternateRowStyles: { fillColor: C.cardAlt },
    columnStyles: { 0: { cellWidth: 28, fontStyle: 'bold' }, 1: { cellWidth: 30 }, 4: { textColor: C.accent } },
    margin: { left: M, right: M },
    didDrawPage: (d) => { if (d.pageNumber > 1 && d.cursor && d.cursor.y < 30) bg(doc); },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // 9. Strengths & Weaknesses
  y = header(doc, y, 'Strengths & Weaknesses', 'Consolidated SWOT assessment');
  y = twoCol(doc, y, 'Strengths', profile.strengths, 'Weaknesses', profile.weaknesses);

  // 10. Match Plan Recommendations
  y = header(doc, y, 'Match Plan Recommendations', 'How to exploit and how to contain');
  y = subLabel(doc, y, 'In Possession — How to Exploit');
  y = bullets(doc, y, profile.matchPlan.inPossession);
  y = subLabel(doc, y, 'Out of Possession — How to Defend');
  y = bullets(doc, y, profile.matchPlan.outOfPossession);
  y = subLabel(doc, y, 'Pressing Triggers');
  y = bullets(doc, y, profile.matchPlan.pressingTriggers);

  // 11. Risk Zones & Vulnerabilities
  y = header(doc, y, 'Risk Zones & Vulnerabilities', 'Where we are most likely to be hurt');
  y = subLabel(doc, y, 'Danger Zones');
  y = bullets(doc, y, profile.matchPlan.dangerZones, C.text, '!');
  y = subLabel(doc, y, 'Our Risk Zones');
  y = bullets(doc, y, profile.riskZones, C.text, '!');

  // 12. Pre-Match Tactical Plan
  y = header(doc, y, 'Pre-Match Tactical Plan', 'Phased game-management script');
  y = subLabel(doc, y, '0–15 Minutes — Establish Control');
  y = paragraph(doc, y, profile.preMatch.early);
  y = subLabel(doc, y, 'Mid-Game — Build & Defend');
  y = paragraph(doc, y, profile.preMatch.mid);
  y = subLabel(doc, y, '70+ Minutes — Game Management');
  y = paragraph(doc, y, profile.preMatch.late);

  // 13. Post-Match Analytical Review
  y = header(doc, y, 'Post-Match Analytical Review', 'Review framework for after the fixture');
  y = paragraph(doc, y, profile.postMatch);

  footer(doc, date);
  doc.save(`${profile.name.replace(/\s+/g, '-')}-Opposition-Analysis.pdf`);
}
