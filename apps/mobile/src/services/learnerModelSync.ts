// LAILI Phase 1 — best-effort sync from a deep (LLM) evaluation's per-
// dimension scores into the multidimensional Learner Model. Additive: never
// touches the existing flat SkillVector/skill_vectors table (still what
// weakestSkills/applyEvaluation/the adaptive-scenario button use) — this
// just also starts filling in the richer recognition→automatic_use picture
// from the LAILI report. Nothing reads this yet (see chat summary for why
// that's deliberately out of scope for this pass); it's here so the data
// already exists once an engine/UI is built to consume it.
import { emptySkillDimensions, updateSkillDimensions, type SkillEvidence, type SkillEvidenceSource } from '@yaali/core';
import { LearnerSkillStateRepository } from '@yaali/database';
import { getDatabaseManager } from '../languageBank';

export async function syncEvidenceFromDeepEvaluation(
  learnerId: string,
  source: Extract<SkillEvidenceSource, 'conversation' | 'scenario'>,
  scores: Record<string, number>,
  overallConfidence = 0.6,
): Promise<void> {
  try {
    const db = await getDatabaseManager();
    const repo = new LearnerSkillStateRepository(db);
    const confidence = Math.max(0, Math.min(1, overallConfidence));
    for (const [skill, score] of Object.entries(scores)) {
      const evidence: SkillEvidence = {
        id: `ev_${Date.now()}_${skill}`,
        learnerId,
        skill,
        source,
        confidence,
        createdAt: new Date().toISOString(),
        // Map the evaluator's named dimension onto the closest LAILI
        // evidence field it actually has a signal for; dimensions with no
        // clean match (e.g. taskCompletion) simply carry no field here and
        // still move the model via the targetDetected-style fallback.
        ...(skill === 'grammar' ? { grammar: score } : {}),
        ...(skill === 'vocabulary' ? { meaning: score } : {}),
        ...(skill === 'fluency' ? { naturalness: score } : {}),
        ...(skill === 'appropriateness' ? { context: score } : {}),
      };
      await repo.appendEvidence(evidence);
      const current = (await repo.getSkillState(learnerId, skill)) ?? emptySkillDimensions();
      await repo.saveSkillState(learnerId, skill, updateSkillDimensions(current, evidence));
    }
  } catch { /* best-effort; LAILI phase 1 is additive and non-critical */ }
}
