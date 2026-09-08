export type DifficultyAction='increase'|'hold'|'decrease';
export type DifficultyState={value:number;confidence:number;streak:number;lastAction:DifficultyAction};
export type DifficultySignal={success:number;latencyMs?:number;hintUsed?:boolean;correctionCount?:number};

export function updateDifficulty(state:DifficultyState, signal:DifficultySignal):DifficultyState {
  const success=Math.max(0,Math.min(1,signal.success));
  const friction=(signal.hintUsed?0.15:0)+(Math.min(1,(signal.correctionCount??0)/4)*0.2);
  const latency=signal.latencyMs==null?0:Math.min(0.2,Math.max(0,(signal.latencyMs-8000)/40000));
  const effective=success-friction-latency;
  let action:DifficultyAction='hold'; let delta=0;
  if(effective>=0.82){action='increase';delta=0.08;}
  else if(effective<=0.42){action='decrease';delta=-0.08;}
  const streak=action==='increase'?state.streak+1:action==='decrease'?0:state.streak;
  return {value:Math.max(0,Math.min(1,state.value+delta)),confidence:Math.min(1,state.confidence+0.05),streak,lastAction:action};
}
