import { describe, it, expect, vi, afterEach } from 'vitest';
import { WmsIntentMatcher } from '../src/wms/wms-intent-matcher.js';

describe('WmsIntentMatcher', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should match exact service keywords', () => {
    const matcher = new WmsIntentMatcher();

    const result = matcher.analyze('库存冻结流程优化');

    expect(result.isWmsRelated).toBe(true);
    expect(result.targetService).toBe('storage');
  });

  it('should return isWmsRelated false for non-WMS input', () => {
    const matcher = new WmsIntentMatcher();

    const result = matcher.analyze('盘奌');

    expect(result.isWmsRelated).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('should expand synonyms and match', () => {
    const matcher = new WmsIntentMatcher();

    const result = matcher.analyze('pick 拣货优化');

    expect(result.isWmsRelated).toBe(true);
    expect(result.targetService).toBe('outbound');
  });
});
