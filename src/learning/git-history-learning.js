import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { InstinctManager } from './instinct-manager.js';

const execFileAsync = promisify(execFile);
const DEFAULT_COMMIT_LIMIT = 200;
const MAX_COMMIT_LIMIT = 1000;
const CONVENTIONAL_TYPES = ['feat', 'fix', 'docs', 'refactor', 'test', 'chore', 'build', 'ci'];
const MIN_CONVENTIONAL_COVERAGE = 0.5;

function clampCommitLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_COMMIT_LIMIT;
  }

  return Math.min(parsed, MAX_COMMIT_LIMIT);
}

function normalizeCommitMessages(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function getConventionalStats(messages) {
  const typeCounts = new Map();
  let conventionalCount = 0;

  for (const message of messages) {
    const match = message.match(/^([a-z]+)(?:\([^)]*\))?:\s+/i);
    if (!match) {
      continue;
    }

    const type = match[1].toLowerCase();
    conventionalCount += 1;
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  }

  return {
    conventionalCount,
    typeCounts
  };
}

function buildCommitConventionObservation(messages, projectName) {
  if (!messages.length) {
    return null;
  }

  const { conventionalCount, typeCounts } = getConventionalStats(messages);
  const coverageRatio = conventionalCount / messages.length;
  if (!conventionalCount || coverageRatio <= MIN_CONVENTIONAL_COVERAGE) {
    return null;
  }

  const dominantTypes = [...typeCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([type]) => type)
    .filter((type) => CONVENTIONAL_TYPES.includes(type));

  const supportedTypes = dominantTypes.length ? dominantTypes : CONVENTIONAL_TYPES.slice(0, 4);
  const coverage = Math.round(coverageRatio * 100);

  return {
    pattern: 'Repository uses conventional commit prefixes',
    action: `Write commit messages with prefixes like ${supportedTypes.join(', ')}`,
    source: 'Git history analysis',
    evidence: [
      `${projectName}: analyzed ${messages.length} commits`,
      `${coverage}% matched conventional commit format`
    ],
    tags: ['git', 'workflow', 'commit']
  };
}

async function collectCommitMessages(projectDir, commitLimit) {
  const limit = clampCommitLimit(commitLimit);

  try {
    const { stdout } = await execFileAsync('git', ['log', `-${limit}`, '--pretty=format:%s'], {
      cwd: projectDir
    });

    return {
      limit,
      messages: normalizeCommitMessages(stdout)
    };
  } catch (error) {
    if (String(error?.stderr || '').includes('does not have any commits yet')) {
      return {
        limit,
        messages: []
      };
    }

    throw error;
  }
}

async function learnFromGitHistory(options = {}) {
  const projectDir = options.projectDir || process.cwd();
  const projectName = options.projectName || path.basename(projectDir) || 'repository';
  const { limit, messages } = await collectCommitMessages(projectDir, options.commitLimit);
  const observation = buildCommitConventionObservation(messages, projectName);

  if (!observation) {
    return {
      skipped: true,
      reason: 'No reusable git history pattern found',
      analyzedCommits: messages.length,
      commitLimit: limit
    };
  }

  const manager = new InstinctManager(projectDir);
  const result = await manager.observe(observation);

  return {
    skipped: false,
    analyzedCommits: messages.length,
    commitLimit: limit,
    observation,
    result
  };
}

export {
  DEFAULT_COMMIT_LIMIT,
  MAX_COMMIT_LIMIT,
  buildCommitConventionObservation,
  clampCommitLimit,
  collectCommitMessages,
  getConventionalStats,
  learnFromGitHistory,
  normalizeCommitMessages
};
