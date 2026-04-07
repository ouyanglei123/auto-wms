import path from 'path';
import fs from 'fs-extra';
import { parse, stringify } from 'yaml';
import { logger } from '../logger.js';

const FILE_VERSION = 2;
const DEFAULT_CANDIDATE_THRESHOLD = 3;
const CANDIDATE_CONFIDENCE = 0.3;

function getConfidence(observations) {
  if (observations >= 10) return 0.95;
  if (observations >= 6) return 0.8;
  if (observations >= 3) return 0.6;
  return CANDIDATE_CONFIDENCE;
}

function estimateObservations(entry) {
  if (Number.isInteger(entry?.observations) && entry.observations > 0) {
    return entry.observations;
  }

  const confidence = Number(entry?.confidence) || 0;
  if (confidence >= 0.95) return 10;
  if (confidence >= 0.8) return 6;
  if (confidence >= 0.6) return 3;
  return 1;
}

function normalizeList(values) {
  const list = Array.isArray(values) ? values : values ? [values] : [];
  return [...new Set(list.map((value) => String(value).trim()).filter(Boolean))];
}

function buildId(prefix, pattern) {
  const slug = pattern
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${date}-${slug || 'pattern'}-${suffix}`;
}

function sortByUpdatedAt(items) {
  return [...items].sort((left, right) =>
    String(right.updated_at || '').localeCompare(String(left.updated_at || ''))
  );
}

function roundConfidence(value) {
  return Math.round(value * 100) / 100;
}

function pickLatestDate(...values) {
  return (
    values
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .sort()
      .at(-1) || ''
  );
}

function isReusableEntry(entry) {
  return Boolean(String(entry?.pattern || '').trim() && String(entry?.action || '').trim());
}

class InstinctManager {
  constructor(projectDir, options = {}) {
    this.projectDir = projectDir || process.cwd();
    this.instinctsDir = path.join(this.projectDir, '.aimax', 'instincts');
    this.instinctsPath = path.join(this.instinctsDir, 'instincts.yaml');
    this.candidatesPath = path.join(this.instinctsDir, 'candidates.yaml');
    this.candidateThreshold = options.candidateThreshold ?? DEFAULT_CANDIDATE_THRESHOLD;
  }

  async ensureStructure() {
    await fs.ensureDir(this.instinctsDir);
    await this._ensureFile(this.instinctsPath, { version: FILE_VERSION, instincts: [] });
    await this._ensureFile(this.candidatesPath, { version: FILE_VERSION, candidates: [] });
    return this.instinctsDir;
  }

  async observe({ pattern, action, source, evidence, tags } = {}) {
    if (!pattern || !pattern.trim()) {
      throw new Error('pattern is required');
    }

    if (!action || !action.trim()) {
      throw new Error('action is required');
    }

    await this.ensureStructure();

    const normalizedPattern = pattern.trim();
    const normalizedAction = action.trim();
    const normalizedEvidence = normalizeList(evidence);
    const normalizedTags = normalizeList(tags);
    const now = new Date().toISOString().slice(0, 10);

    const instinctsDoc = await this._readYaml(this.instinctsPath, 'instincts');
    const candidatesDoc = await this._readYaml(this.candidatesPath, 'candidates');
    const instincts = instinctsDoc.instincts;
    const candidates = candidatesDoc.candidates;

    const instinctIndex = instincts.findIndex((entry) => entry.pattern === normalizedPattern);
    if (instinctIndex >= 0) {
      const updated = this._mergeEntry(instincts[instinctIndex], {
        action: normalizedAction,
        source,
        evidence: normalizedEvidence,
        tags: normalizedTags,
        updatedAt: now,
        increment: 1
      });

      instincts[instinctIndex] = this._buildInstinct(updated, updated.created_at || now);
      await this._writeYaml(this.instinctsPath, instinctsDoc);

      return {
        kind: 'instinct',
        promoted: false,
        pattern: normalizedPattern,
        confidence: instincts[instinctIndex].confidence,
        observations: instincts[instinctIndex].observations
      };
    }

    const candidateIndex = candidates.findIndex((entry) => entry.pattern === normalizedPattern);
    if (candidateIndex >= 0) {
      const updated = this._mergeEntry(candidates[candidateIndex], {
        action: normalizedAction,
        source,
        evidence: normalizedEvidence,
        tags: normalizedTags,
        updatedAt: now,
        increment: 1
      });

      if (updated.observations >= this.candidateThreshold) {
        const promoted = this._buildInstinct(updated, updated.created_at || now);
        candidates.splice(candidateIndex, 1);
        instincts.push(promoted);
        await Promise.all([
          this._writeYaml(this.instinctsPath, instinctsDoc),
          this._writeYaml(this.candidatesPath, candidatesDoc)
        ]);

        logger.info(`Instinct promoted: ${normalizedPattern}`);
        return {
          kind: 'instinct',
          promoted: true,
          pattern: normalizedPattern,
          confidence: promoted.confidence,
          observations: promoted.observations
        };
      }

      candidates[candidateIndex] = this._buildCandidate(updated, updated.created_at || now);
      await this._writeYaml(this.candidatesPath, candidatesDoc);

      return {
        kind: 'candidate',
        promoted: false,
        pattern: normalizedPattern,
        confidence: candidates[candidateIndex].confidence,
        observations: candidates[candidateIndex].observations
      };
    }

    const entry = this._buildCandidate(
      {
        id: buildId('cand', normalizedPattern),
        pattern: normalizedPattern,
        action: normalizedAction,
        source: source?.trim() || `Observed on ${now}`,
        evidence: normalizedEvidence,
        tags: normalizedTags,
        observations: 1,
        updated_at: now
      },
      now
    );

    candidates.push(entry);
    await this._writeYaml(this.candidatesPath, candidatesDoc);

    return {
      kind: 'candidate',
      promoted: false,
      pattern: normalizedPattern,
      confidence: entry.confidence,
      observations: entry.observations
    };
  }

  async getStatus() {
    await this.ensureStructure();
    const instinctsDoc = await this._readYaml(this.instinctsPath, 'instincts');
    const candidatesDoc = await this._readYaml(this.candidatesPath, 'candidates');

    const instincts = sortByUpdatedAt(
      instinctsDoc.instincts.map((entry) => this._buildInstinct(entry, entry.created_at))
    );
    const candidates = sortByUpdatedAt(
      candidatesDoc.candidates.map((entry) => this._buildCandidate(entry, entry.created_at))
    );

    return {
      instincts,
      candidates,
      counts: {
        instincts: instincts.length,
        candidates: candidates.length
      }
    };
  }

  async exportTo(filePath) {
    await this.ensureStructure();
    const outputPath = filePath
      ? path.resolve(this.projectDir, filePath)
      : path.join(this.instinctsDir, 'exports', 'team-instincts.yaml');
    await fs.ensureDir(path.dirname(outputPath));

    const status = await this.getStatus();
    await this._writeYaml(outputPath, {
      version: FILE_VERSION,
      exported_at: new Date().toISOString(),
      instincts: status.instincts,
      candidates: status.candidates
    });

    return {
      filePath: outputPath,
      counts: {
        instincts: status.counts.instincts,
        candidates: status.counts.candidates
      }
    };
  }

  async importFrom(filePath) {
    if (!filePath || !String(filePath).trim()) {
      throw new Error('filePath is required');
    }

    await this.ensureStructure();
    const inputPath = path.resolve(this.projectDir, filePath);
    const content = await fs.readFile(inputPath, 'utf-8');
    const data = parse(content) || {};
    const importedInstincts = Array.isArray(data.instincts) ? data.instincts : [];
    const importedCandidates = Array.isArray(data.candidates) ? data.candidates : [];
    const now = new Date().toISOString().slice(0, 10);

    const instinctsDoc = await this._readYaml(this.instinctsPath, 'instincts');
    const candidatesDoc = await this._readYaml(this.candidatesPath, 'candidates');
    const instincts = instinctsDoc.instincts;
    const candidates = candidatesDoc.candidates;

    for (const incoming of importedInstincts.filter(isReusableEntry)) {
      const instinctIndex = instincts.findIndex((entry) => entry.pattern === incoming.pattern);
      if (instinctIndex >= 0) {
        const updated = this._mergeImportedEntry(instincts[instinctIndex], incoming, now);
        instincts[instinctIndex] = this._buildInstinct(updated, updated.created_at || now);
        continue;
      }

      const candidateIndex = candidates.findIndex((entry) => entry.pattern === incoming.pattern);
      if (candidateIndex >= 0) {
        const updated = this._mergeImportedEntry(candidates[candidateIndex], incoming, now);
        candidates.splice(candidateIndex, 1);
        instincts.push(this._buildInstinct(updated, updated.created_at || now));
        continue;
      }

      const created = this._mergeImportedEntry({}, incoming, now);
      instincts.push(this._buildInstinct(created, created.created_at || now));
    }

    for (const incoming of importedCandidates.filter(isReusableEntry)) {
      const instinctIndex = instincts.findIndex((entry) => entry.pattern === incoming.pattern);
      if (instinctIndex >= 0) {
        const updated = this._mergeImportedEntry(instincts[instinctIndex], incoming, now);
        instincts[instinctIndex] = this._buildInstinct(updated, updated.created_at || now);
        continue;
      }

      const candidateIndex = candidates.findIndex((entry) => entry.pattern === incoming.pattern);
      if (candidateIndex >= 0) {
        const updated = this._mergeImportedEntry(candidates[candidateIndex], incoming, now);
        candidates[candidateIndex] = this._buildCandidate(updated, updated.created_at || now);
        continue;
      }

      const created = this._mergeImportedEntry({}, incoming, now);
      candidates.push(this._buildCandidate(created, created.created_at || now));
    }

    await Promise.all([
      this._writeYaml(this.instinctsPath, instinctsDoc),
      this._writeYaml(this.candidatesPath, candidatesDoc)
    ]);

    return {
      filePath: inputPath,
      counts: {
        instincts: importedInstincts.filter(isReusableEntry).length,
        candidates: importedCandidates.filter(isReusableEntry).length
      }
    };
  }

  async evolveTo(filePath) {
    await this.ensureStructure();
    const outputPath = filePath
      ? path.resolve(this.projectDir, filePath)
      : path.join(this.instinctsDir, 'exports', 'evolved-skills.yaml');
    await fs.ensureDir(path.dirname(outputPath));

    const status = await this.getStatus();
    const groups = new Map();

    for (const instinct of status.instincts) {
      for (const tag of instinct.tags || []) {
        if (!groups.has(tag)) {
          groups.set(tag, []);
        }
        groups.get(tag).push(instinct);
      }
    }

    const skills = [...groups.entries()]
      .filter(([, instincts]) => instincts.length >= 2)
      .map(([tag, instincts]) => {
        const observations = instincts.reduce((sum, instinct) => sum + instinct.observations, 0);
        const confidence = roundConfidence(
          instincts.reduce((sum, instinct) => sum + instinct.confidence, 0) / instincts.length
        );
        const supportingTags = normalizeList(instincts.flatMap((instinct) => instinct.tags || []));

        return {
          id: buildId('skill', `${tag}-practices`),
          name: `${tag} practices`,
          description: `Reusable instincts clustered around ${tag}`,
          source: 'instinct-evolve',
          confidence,
          observations,
          tags: supportingTags,
          patterns: instincts.map((instinct) => instinct.pattern),
          actions: instincts.map((instinct) => instinct.action),
          evidence: normalizeList(instincts.flatMap((instinct) => instinct.evidence || [])),
          members: instincts.map((instinct) => ({
            id: instinct.id,
            pattern: instinct.pattern,
            confidence: instinct.confidence,
            observations: instinct.observations
          }))
        };
      })
      .sort(
        (left, right) =>
          right.observations - left.observations || left.name.localeCompare(right.name)
      );

    await this._writeYaml(outputPath, {
      version: FILE_VERSION,
      evolved_at: new Date().toISOString(),
      skills
    });

    return {
      filePath: outputPath,
      count: skills.length,
      skills
    };
  }

  async _ensureFile(filePath, initialValue) {
    if (!(await fs.pathExists(filePath))) {
      await fs.writeFile(filePath, stringify(initialValue), 'utf-8');
    }
  }

  async _readYaml(filePath, key) {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = parse(content) || {};
    return {
      version: data.version || FILE_VERSION,
      [key]: Array.isArray(data[key]) ? data[key] : []
    };
  }

  async _writeYaml(filePath, data) {
    await fs.writeFile(filePath, stringify(data), 'utf-8');
  }

  _mergeEntry(entry, { action, source, evidence, tags, updatedAt, increment }) {
    return {
      ...entry,
      action,
      source: source?.trim() || entry.source,
      evidence: normalizeList([...(entry.evidence || []), ...evidence]),
      tags: normalizeList([...(entry.tags || []), ...tags]),
      observations: estimateObservations(entry) + increment,
      created_at: entry.created_at || updatedAt,
      updated_at: updatedAt
    };
  }

  _mergeImportedEntry(entry, incoming, updatedAt) {
    return {
      ...entry,
      ...incoming,
      id: entry.id || incoming.id,
      pattern: String(incoming.pattern || entry.pattern || '').trim(),
      action: String(incoming.action || entry.action || '').trim(),
      source: String(incoming.source || entry.source || '').trim() || `Imported on ${updatedAt}`,
      evidence: normalizeList([...(entry.evidence || []), ...(incoming.evidence || [])]),
      tags: normalizeList([...(entry.tags || []), ...(incoming.tags || [])]),
      observations: Math.max(estimateObservations(entry), estimateObservations(incoming)),
      created_at: entry.created_at || incoming.created_at || updatedAt,
      updated_at: pickLatestDate(entry.updated_at, incoming.updated_at, updatedAt)
    };
  }

  _buildCandidate(entry, createdAt) {
    const observations = estimateObservations(entry);
    return {
      id: entry.id || buildId('cand', entry.pattern),
      pattern: entry.pattern,
      confidence: getConfidence(observations),
      source: entry.source,
      action: entry.action,
      evidence: normalizeList(entry.evidence),
      tags: normalizeList(entry.tags),
      observations,
      created_at: createdAt,
      updated_at: entry.updated_at || createdAt
    };
  }

  _buildInstinct(entry, createdAt) {
    const observations = estimateObservations(entry);
    return {
      id: entry.id?.startsWith('inst-') ? entry.id : buildId('inst', entry.pattern),
      pattern: entry.pattern,
      confidence: getConfidence(observations),
      source: entry.source,
      action: entry.action,
      evidence: normalizeList(entry.evidence),
      tags: normalizeList(entry.tags),
      observations,
      created_at: createdAt,
      updated_at: entry.updated_at || createdAt
    };
  }
}

export { InstinctManager, getConfidence, estimateObservations };
export default InstinctManager;
