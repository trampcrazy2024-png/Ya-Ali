import type { SkillName, SkillVector } from './types';
import { weakestSkills } from './recommendation';

export type MicroChallengeType = 'speak' | 'recall' | 'grammar' | 'listen' | 'fluency';
export interface MicroChallenge {
  id: string;
  skill: SkillName;
  type: MicroChallengeType;
  title: string;
  instruction: string;
  targetSeconds: number;
  difficulty: number;
  targetItems: string[];
  successMetric: string;
}

const TYPE_BY_SKILL: Partial<Record<SkillName, MicroChallengeType>> = {
  pronunciation: 'speak', speaking: 'speak', vocabulary: 'recall', grammar: 'grammar',
  listening: 'listen', fluency: 'fluency', comprehension: 'listen'
};

export function generateMicroChallenges(vector: SkillVector, options: { vocabulary?: string[]; count?: number } = {}): MicroChallenge[] {
  const weak = weakestSkills(vector, Math.max(1, options.count ?? 3));
  const vocab = (options.vocabulary ?? []).filter(Boolean).slice(0, 8);
  return weak.map((skill, i) => {
    const type = TYPE_BY_SKILL[skill] ?? 'recall';
    const items = vocab.slice(i, i + 3);
    const label = skill.replace(/([A-Z])/g, ' $1');
    const instruction = type === 'speak' ? `در ۲ دقیقه، ${items.length ? `با استفاده از ${items.join('، ')} ` : ''}بلند صحبت کن و پاسخ طبیعی بده.`
      : type === 'grammar' ? 'در ۲ دقیقه سه جمله درباره یک موقعیت واقعی بساز و ساختار هدف را درست نگه دار.'
      : type === 'listen' ? 'یک جمله کوتاه بشنو، نکته اصلی را بدون ترجمه کلمه‌به‌کلمه بازگو کن.'
      : type === 'fluency' ? 'در ۲ دقیقه بدون توقف طولانی درباره یک موضوع روزمره صحبت کن.'
      : `در ۲ دقیقه ${items.length ? `موارد ${items.join('، ')} را ` : 'واژه‌های ضعیف را '}از حافظه بازیابی و در جمله استفاده کن.`;
    return { id: `micro_${skill}_${i}`, skill, type, title: `چالش ۲ دقیقه‌ای: ${label}`, instruction, targetSeconds: 120,
      difficulty: Math.max(0.1, Math.min(0.9, Number(vector.scores[skill] ?? 0.5))), targetItems: items,
      successMetric: type === 'speak' || type === 'fluency' ? 'پاسخ روان و قابل فهم' : 'موفقیت در بازیابی و کاربرد درست' };
  });
}
