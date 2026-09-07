import type { DecisionSignal, ScenarioContext, ScenarioDecision } from './types';

export function decideNextState(context: ScenarioContext, signals: Record<string, number | boolean | string>): ScenarioDecision {
  const transitions = context.scenario.transitions.filter(t => t.from === context.state);
  let best = { state: context.state, score: 0, reasons: [] as string[] };
  for (const transition of transitions) {
    const result = scoreSignals(transition.signals, signals);
    if (result.score > best.score) best = { state: transition.to, ...result };
  }
  return { nextState: best.state, confidence: Math.min(1, best.score), reasons: best.reasons };
}

function scoreSignals(signals: DecisionSignal[], values: Record<string, number | boolean | string>) {
  if (!signals.length) return { score: 1, reasons: ['unconditional transition'] };
  let weighted = 0; let total = 0; const reasons: string[] = [];
  for (const signal of signals) {
    const weight = signal.weight ?? 1; total += weight;
    let hit = 0;
    if (signal.type === 'keyword') hit = String(values.text ?? '').toLocaleLowerCase().includes(signal.value.toLocaleLowerCase()) ? 1 : 0;
    if (signal.type === 'intent') hit = String(values.intent ?? '') === signal.value ? 1 : 0;
    if (signal.type === 'semantic') hit = Number(values.semantic ?? 0) >= (signal.threshold ?? 0.7) ? 1 : 0;
    if (signal.type === 'goalAchievement') hit = Number(values.goalAchievement ?? 0) >= signal.threshold ? 1 : 0;
    if (signal.type === 'skill') hit = Number(values[`skill:${signal.skill}`] ?? 0) >= signal.threshold ? 1 : 0;
    if (signal.type === 'custom') hit = Number(values[`custom:${signal.name}`] ?? 0);
    weighted += hit * weight;
    if (hit > 0) reasons.push(signal.type);
  }
  return { score: total ? weighted / total : 0, reasons };
}
