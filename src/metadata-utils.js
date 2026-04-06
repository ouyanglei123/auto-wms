import path from 'node:path';

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---/;

function extractHeading(content) {
  return String(content || '')
    .split('\n')
    .find((line) => line.trim().startsWith('#'))
    ?.replace(/^#+\s*/, '')
    .trim();
}

function extractFrontmatterBlock(content) {
  return String(content || '').match(FRONTMATTER_REGEX)?.[1] || '';
}

function extractFrontmatterScalar(frontmatter, key) {
  return (
    String(frontmatter || '')
      .match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]
      ?.trim() || ''
  );
}

function extractFrontmatterList(frontmatter, key) {
  const inline = String(frontmatter || '').match(new RegExp(`^${key}:\\s*\\[(.+)\\]$`, 'm'))?.[1];
  if (inline) {
    return inline
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const scalar = extractFrontmatterScalar(frontmatter, key);
  if (!scalar) {
    return [];
  }

  return scalar
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeStringList(values) {
  return [
    ...new Set(
      (values || []).map((value) => String(value).replace(/['"]/g, '').trim()).filter(Boolean)
    )
  ];
}

function normalizeRelativePath(baseDir, filePath) {
  return path.relative(baseDir, filePath).replace(/\\/g, '/');
}

export {
  extractFrontmatterBlock,
  extractFrontmatterList,
  extractFrontmatterScalar,
  extractHeading,
  normalizeRelativePath,
  sanitizeStringList
};
