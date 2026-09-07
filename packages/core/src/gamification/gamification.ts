export type GamificationState={xp:number;level:number;streakDays:number;badges:string[]};
export type GamificationEvent={type:'practice'|'scenario'|'review'|'streak';value:number};
export function applyGamification(state:GamificationState,event:GamificationEvent):GamificationState{
  const xp=Math.max(0,state.xp+Math.max(0,event.value)); const level=Math.floor(xp/500)+1; const badges=[...state.badges];
  if(xp>=1000&&!badges.includes('xp-1000'))badges.push('xp-1000');
  if(state.streakDays>=7&&!badges.includes('streak-7'))badges.push('streak-7');
  return {...state,xp,level,badges};
}
