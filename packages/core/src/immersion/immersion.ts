export type ImmersionState={enabled:boolean;targetLanguage:string;minutes:number;nonTargetCount:number;strict:boolean};
export function recordImmersion(state:ImmersionState,language:string,minutes=0):ImmersionState{
  const nonTarget=language!==state.targetLanguage; return {...state,minutes:state.minutes+Math.max(0,minutes),nonTargetCount:state.nonTargetCount+(nonTarget?1:0)};
}
