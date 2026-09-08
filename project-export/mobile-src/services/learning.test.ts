import { describe, expect, it } from 'vitest';
import { adaptivePriority, getLearningStats, getReviewState, reviewItem } from '../learning';

describe('FSRS-6 learning engine',()=>{
  it('creates a stable state and advances after good',()=>{
    const id='test-fsrs-good';
    const first=reviewItem(id,'good',{now:Date.UTC(2026,0,1)});
    expect(first.stateVersion).toBe(6); expect(first.stability).toBeGreaterThan(0); expect(first.difficulty).toBeGreaterThanOrEqual(1);
    const second=reviewItem(id,'good',{now:Date.UTC(2026,0,3)});
    expect(second.due).toBeGreaterThan(Date.UTC(2026,0,3)); expect(second.reps).toBe(2);
  });
  it('handles lapse and preserves versioned state',()=>{
    const id='test-fsrs-lapse';reviewItem(id,'good',{now:Date.UTC(2026,0,1)});const s=reviewItem(id,'again',{now:Date.UTC(2026,0,5)});
    expect(s.lapses).toBe(1);expect(s.stateVersion).toBe(6);expect(s.due).toBe(Date.UTC(2026,0,5)+10*60*1000);
  });
  it('returns stats for supplied items',()=>{
    const items=[{id:'test-stats-a'},{id:'test-stats-b'}] as any[];reviewItem(items[0].id,'good',{now:Date.now()});const stats=getLearningStats(items);
    expect(stats.total).toBe(2);expect(stats.reviewed).toBe(1);expect(typeof stats.averageStability).toBe('number');
  });
  it('keeps adaptive priority numeric',()=>{expect(Number.isFinite(adaptivePriority('never-reviewed'))).toBe(true);expect(getReviewState('never-reviewed').stateVersion).toBe(6);});
});
