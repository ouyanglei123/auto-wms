import { describe, it, expect, vi, afterEach } from 'vitest';
import { WmsIntentMatcher } from '../src/wms/wms-intent-matcher.js';

describe('WmsIntentMatcher', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should skip fuzzy matching when exact service keywords already match', () => {
    const matcher = new WmsIntentMatcher();
    const fuzzySpy = vi.spyOn(WmsIntentMatcher.prototype, '_fuzzyMatch');

    const result = matcher.analyze('库存冻结流程优化');

    expect(result.isWmsRelated).toBe(true);
    expect(result.targetService).toBe('storage');
    expect(fuzzySpy).not.toHaveBeenCalled();
  });

  it('should still use fuzzy matching when no exact keyword matches are available', () => {
    const matcher = new WmsIntentMatcher({ fuzzyMatchThreshold: 0.5 });
    const fuzzySpy = vi.spyOn(WmsIntentMatcher.prototype, '_fuzzyMatch');

    const result = matcher.analyze('盘奌');

    expect(fuzzySpy).toHaveBeenCalled();
    expect(result.isWmsRelated).toBe(false);
    expect(result.confidence).toBeGreaterThan(0);
  });
});
