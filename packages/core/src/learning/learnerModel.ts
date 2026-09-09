// LAILI Phase 1 — multidimensional Learner Model (report §6-9, §15, §20).
// Purely additive: this sits ALONGSIDE the existing flat SkillVector
// (scores/confidence per skill in ./types + ./recommendation, used by
// weakestSkills/applyEvaluation/the adaptive-scenario button) — it does not
// replace or alter that. Per the report's own principle (§8, extended
// here): a flat "how well are they doing overall" score and a per-skill
// "can they actually USE this, unprompted, in context" model are different
// things and are kept as two independent structures on purpose.

export interface SkillDimensions {
  recognition: number;
  recall: number;
  controlledProduction: number;
  freeProduction: number;
  contextualUse: number;
  automaticUse: number;
  confidence: number;
}

export function emptySkillDimensions(): SkillDimensions {
  return { recognition: 0, recall: 0, controlledProduction: 0, freeProduction: 0, contextualUse: 0, automaticUse: 0, confidence: 0 };
}

// §15 Production Gap — the report's own example: Recognition 0.95,
// Production 0.42 → Gap 0.53. "I know it" vs "I can use it." Clamped to
// >=0 since a learner producing MORE than they passively recognize just
// means recognition hasn't caught up yet, not a negative gap.
export function productionGap(dims: SkillDimensions): number {
  return Math.max(0, dims.recognition - dims.freeProduction);
}

// §9 Evidence — the raw signal a single interaction produces. Every field
// besides the identifying ones is optional on purpose: a given interaction
// usually only speaks to some of the possible signals (e.g. a plain
// vocabulary flashcard says nothing about "naturalness").
export type SkillEvidenceSource = 'conversation' | 'scenario' | 'exercise' | 'fast-heuristic';
export interface SkillEvidence {
  id: string;
  learnerId: string;
  skill: string;
  source: SkillEvidenceSource;
  targetDetected?: boolean;
  meaning?: number;      // 0..1
  grammar?: number;      // 0..1
  naturalness?: number;  // 0..1
  context?: number;      // 0..1
  confidence: number;    // 0..1 — how much this specific evidence should be trusted
  createdAt: string;
}

// Which dimension(s) a given evidence source is allowed to move. A single
// piece of free-conversation evidence speaks mainly to free production and
// contextual use — it says little about controlled, single-answer
// production, so it should not move that dimension; a drilled exercise is
// the reverse. This keeps one noisy conversational turn from swinging a
// dimension it has no real signal about.
const SOURCE_DIMENSIONS: Record<SkillEvidenceSource, (keyof SkillDimensions)[]> = {
  conversation: ['freeProduction', 'contextualUse'],
  scenario: ['freeProduction', 'contextualUse', 'controlledProduction'],
  exercise: ['controlledProduction', 'recall'],
  'fast-heuristic': ['freeProduction'],
};

// §20 Skill Update — v1 Weighted EMA, explicitly called v1 (not final) by
// the report: New = Old×0.7 + Evidence×Confidence×0.3. Multiplying evidence
// confidence directly into the update (rather than only gating whether an
// update happens) is what implements §21 ("Don't over-update. Collect more
// evidence.") — low-confidence evidence just moves the number less, instead
// of being an all-or-nothing decision.
export function updateSkillDimensions(current: SkillDimensions, evidence: SkillEvidence): SkillDimensions {
  const evidenceScore = clamp01(
    averageDefined([evidence.meaning, evidence.grammar, evidence.naturalness, evidence.context])
    ?? (evidence.targetDetected ? 0.6 : 0.4)
  );
  const confidence = clamp01(evidence.confidence);
  const movable = SOURCE_DIMENSIONS[evidence.source];
  const next: SkillDimensions = { ...current };
  for (const dim of movable) {
    next[dim] = clamp01(current[dim] * 0.7 + evidenceScore * confidence * 0.3);
  }
  // The model's own confidence is a slower-moving EMA of evidence
  // confidence — how sure the system is about these numbers, not how good
  // the learner is.
  next.confidence = clamp01(current.confidence * 0.8 + confidence * 0.2);
  return next;
}

function averageDefined(values: (number | undefined)[]): number | undefined {
  const defined = values.filter((v): v is number => typeof v === 'number');
  if (!defined.length) return undefined;
  return defined.reduce((s, v) => s + v, 0) / defined.length;
}
function clamp01(n: number): number { return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0)); }
