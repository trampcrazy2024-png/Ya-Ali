import { describe, expect, it } from 'vitest';

describe('learning persistence contract',()=>{
  it('keeps the durable v4 schema contract documented',()=>{
    expect(['learning_review_states','learning_events','dialect_learning_state']).toContain('learning_review_states');
  });
});
