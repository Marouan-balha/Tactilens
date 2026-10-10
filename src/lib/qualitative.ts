/**
 * Qualitative conversion layer for FIFA Match Summary metrics.
 *
 * FIFA Post-Match Summary Reports express Phases of Play as percentages
 * (e.g. "41% Build Up Unopposed", "7% High Press") and headline metrics as
 * numbers (xG, PPDA, xT). Per the analyst brief, the opposition dataset must
 * contain NO raw numbers — every value is converted into professional,
 * PFSA-style qualitative tactical language before it reaches a report.
 *
 * This module is the single source of truth for that number -> wording
 * conversion so the "extraction" step stays auditable while the exported
 * dataset remains purely qualitative.
 */

export type Band = 'negligible' | 'occasional' | 'moderate' | 'frequent' | 'dominant';

/** Map a phase-of-play percentage (0-100) to a coarse frequency band. */
export function phaseBand(pct: number): Band {
  if (pct < 3) return 'negligible';
  if (pct < 8) return 'occasional';
  if (pct < 15) return 'moderate';
  if (pct < 25) return 'frequent';
  return 'dominant';
}

const FREQ_WORDS: Record<Band, string> = {
  negligible: 'almost never',
  occasional: 'only occasionally',
  moderate: 'at times',
  frequent: 'regularly',
  dominant: 'as a defining feature of their game',
};

/** Human phrasing for a frequency band. */
export function freq(band: Band): string {
  return FREQ_WORDS[band];
}

/**
 * Convert a single In/Out-of-Possession phase percentage into a qualitative
 * sentence. `label` is the phase name, `verb` describes the behaviour.
 */
export function describePhase(label: string, pct: number, verb: string): string {
  return `${label}: the side ${verb} ${freq(phaseBand(pct))}.`;
}

/** xG (Expected Goals) → qualitative attacking-threat wording. */
export function describeXG(xg: number): string {
  if (xg < 0.8) return 'Generates a limited volume of high-quality chances; attacking threat is modest and reliant on moments.';
  if (xg < 1.3) return 'Creates a steady, moderate baseline of quality chances across a match.';
  if (xg < 1.8) return 'Consistently manufactures strong scoring opportunities; a clear attacking threat.';
  return 'Produces an elite volume of high-value chances; a dominant, sustained goal threat.';
}

/**
 * PPDA (Passes allowed Per Defensive Action) → pressing-intensity wording.
 * NOTE: lower PPDA = more aggressive pressing.
 */
export function describePPDA(ppda: number): string {
  if (ppda < 8) return 'Presses with high intensity, aggressively contesting the ball high up the pitch.';
  if (ppda < 11) return 'Applies a balanced, controlled press with selective high engagement.';
  if (ppda < 14) return 'Prefers to sit off and hold shape rather than commit to sustained pressing.';
  return 'Rarely presses; concedes territory and defends primarily through a compact block.';
}

/** xT (Expected Threat) → progression / territorial-danger wording. */
export function describeXT(xt: number): string {
  if (xt < 0.9) return 'Ball progression rarely translates into dangerous territory; threat generation is contained.';
  if (xt < 1.2) return 'Moves the ball into threatening areas at a healthy, repeatable rate.';
  return 'Progresses the ball into high-value zones with dangerous regularity.';
}

/** Defensive line height (m) → block-height wording. */
export function describeLineHeight(m: number): string {
  if (m < 30) return 'Defends from a deep, low block, protecting the space in front of goal.';
  if (m < 45) return 'Holds a balanced mid-block, screening central lanes while staying compact.';
  return 'Defends from a high line, compressing the pitch and stepping up aggressively.';
}
