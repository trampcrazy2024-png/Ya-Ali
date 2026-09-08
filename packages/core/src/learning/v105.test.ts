import { describe, expect, it } from 'vitest';
import { createLanguageResearchPlan } from '../research/deepResearch';
import { buildAdaptiveScenarioBrief } from './adaptiveScenarioGenerator';
import { updateDifficulty } from './dynamicDifficulty';
import { scorePhonemes } from '../pronunciation/phonemeScoring';
import { mineSentence } from './sentenceMining';
import { rankTranslationMemory } from '../translation/translationMemory';
import { summarizeLearning } from '../analytics/learningAnalytics';
import { applyGamification } from '../gamification/gamification';
import type { SkillVector } from './types';

describe('Ya-Ali 1.0.5 learning foundation',()=>{
 const vector:SkillVector={learnerId:'x',updatedAt:new Date().toISOString(),scores:{grammar:.2,vocabulary:.4,fluency:.7,pronunciation:.5},confidence:{grammar:.8,vocabulary:.7}};
 it('builds staged research plan',()=>expect(createLanguageResearchPlan('market terms',{language:'ar',dialect:'iraqi'}).stages.length).toBeGreaterThanOrEqual(5));
 it('targets weak skills for adaptive scenarios',()=>expect(buildAdaptiveScenarioBrief(vector).focusSkills[0]).toBe('grammar'));
 it('adjusts difficulty down after friction',()=>expect(updateDifficulty({value:.5,confidence:.5,streak:0,lastAction:'hold'},{success:.2,hintUsed:true,correctionCount:4}).value).toBeLessThan(.5));
 it('scores phoneme mismatches',()=>expect(scorePhonemes(['r','a'],['l','a']).weakPhonemes).toContain('r'));
 it('mines new terms',()=>expect(mineSentence('coffee market coffee',new Set(['coffee'])).find(x=>x.text==='market')?.priority).toBeGreaterThan(0));
 it('ranks translation memory',()=>expect(rankTranslationMemory('hello',[{id:'1',source:'hello',target:'salam',sourceLanguage:'en',targetLanguage:'ar',quality:1,uses:2,updatedAt:''}])[0]?.id).toBe('1'));
 it('summarizes learning',()=>expect(summarizeLearning([{date:'',minutes:10,items:5,score:.8}],vector).totalMinutes).toBe(10));
 it('awards xp and levels',()=>expect(applyGamification({xp:490,level:1,streakDays:0,badges:[]},{type:'practice',value:20}).level).toBe(2));
});

import { generateAdaptiveScenario, validateGeneratedScenario } from './adaptiveScenarioGenerator';

describe('adaptive scenario generator',()=>{
  it('emits a valid scenario JSON instead of selecting a fixed scenario',()=>{
    const scenario=generateAdaptiveScenario({learnerId:'x',updatedAt:new Date().toISOString(),scores:{grammar:.2,vocabulary:.4,fluency:.7,pronunciation:.5},confidence:{grammar:.8,vocabulary:.7}},{dialect:'عراقی',vocabulary:['مفاوضة','سعر']});
    expect(validateGeneratedScenario(scenario)).toEqual([]);
    expect(scenario.tags).toContain('generated');
    expect(scenario.transitions.length).toBeGreaterThanOrEqual(3);
  });
});

import { curateCorpus } from '../corpus/curator';

describe('corpus curator',()=>{
  it('classifies duplicates and low-frequency items without deleting data',()=>{
    const base:any={id:'a',type:'sentence',language:'ar',text:'مرحبا',normalizedText:'مرحبا',createdAt:new Date().toISOString(),source:{source:'test',license:'CC0',provenance:'test'}};
    const duplicate={...base,id:'b'};
    const result=curateCorpus([base,duplicate],{frequency:{مرحبا:0},minFrequency:1});
    expect(result.duplicates.map(x=>x.id)).toEqual(['b']);
    expect(result.lowPriority.map(x=>x.id)).toEqual(['a']);
    expect(result.keep.map(x=>x.id)).toEqual(['a']);
  });
});
