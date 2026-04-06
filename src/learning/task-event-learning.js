import { InstinctManager } from './instinct-manager.js';

const DEFAULT_SOURCE = 'TaskCompleted hook';

function normalizeList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function pickFirstString(values) {
  if (!Array.isArray(values)) {
    return '';
  }

  const match = values.map((value) => String(value).trim()).find(Boolean);
  return match || '';
}

function buildObservation(payload = {}) {
  const pattern = String(payload.pattern || '').trim();
  const action = String(payload.action || '').trim();
  if (!pattern || !action) {
    return null;
  }

  return {
    pattern,
    action,
    source: String(payload.source || '').trim() || DEFAULT_SOURCE,
    evidence: normalizeList(payload.evidence),
    tags: normalizeList(payload.tags)
  };
}

function extractObservation(event = {}) {
  if (event.instinct) {
    return buildObservation(event.instinct);
  }

  const summary = event.task_summary || event.summary || {};
  const decisions = normalizeList(summary.key_decisions || summary.decisions);
  const patterns = normalizeList(summary.patterns || summary.framework_patterns);
  const problems = normalizeList(summary.problems_solved || summary.problem_types);
  const evidence = normalizeList(summary.evidence || event.evidence);
  const tags = normalizeList(summary.tags || event.tags);

  const pattern =
    pickFirstString(patterns) || pickFirstString(decisions) || pickFirstString(problems);
  if (!pattern) {
    return null;
  }

  const action =
    pickFirstString(summary.actions) ||
    pickFirstString(summary.reuse_actions) ||
    (pickFirstString(decisions)
      ? `When similar tasks appear, apply: ${pickFirstString(decisions)}`
      : 'Reuse this pattern on similar tasks');

  return buildObservation({
    pattern,
    action,
    source: String(summary.source || event.source || DEFAULT_SOURCE).trim(),
    evidence,
    tags
  });
}

async function learnFromTaskEvent(event = {}, options = {}) {
  const observation = extractObservation(event);
  if (!observation) {
    return {
      skipped: true,
      reason: 'No reusable pattern found in task event'
    };
  }

  const manager = new InstinctManager(options.projectDir);
  const result = await manager.observe(observation);

  return {
    skipped: false,
    observation,
    result
  };
}

export { DEFAULT_SOURCE, buildObservation, extractObservation, learnFromTaskEvent };
