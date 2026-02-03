/**
 * File handling utilities
 */

// Default/free tier limit
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2 MB limit
export const MAX_ATTACHMENT_CHARS = 120_000; // ~120k chars per attachment
export const MAX_ATTACHMENTS = 5;

// Plan-based file upload limits (in bytes)
export const FILE_UPLOAD_LIMITS = {
  free: 2 * 1024 * 1024,       // 2 MB
  starter: 5 * 1024 * 1024,    // 5 MB
  plus: 10 * 1024 * 1024,      // 10 MB
  pro: 20 * 1024 * 1024,       // 20 MB
};

// Plan-based file upload limits in MB (for display)
export const FILE_UPLOAD_LIMITS_MB = {
  free: 2,
  starter: 5,
  plus: 10,
  pro: 20,
};

/**
 * Get max file upload size for a given plan
 * @param {string} planSlug - Plan slug (free, starter, plus, pro)
 * @returns {number} Max file size in bytes
 */
export const getMaxUploadSizeForPlan = (planSlug) => {
  const normalized = typeof planSlug === 'string' ? planSlug.toLowerCase() : 'free';
  return FILE_UPLOAD_LIMITS[normalized] ?? FILE_UPLOAD_LIMITS.free;
};

export const TEXT_MIME_PREFIXES = [
  'text/',
  'application/json',
  'application/javascript',
  'application/xml',
  'application/sql',
  'application/x-yaml',
  'application/yaml',
  'application/csv',
  'application/x-python',
  'application/typescript',
];

export const TEXT_EXTENSIONS = [
  '.json',
  '.md',
  '.markdown',
  '.txt',
  '.csv',
  '.tsv',
  '.yaml',
  '.yml',
  '.xml',
  '.html',
  '.htm',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.java',
  '.rb',
  '.go',
  '.rs',
  '.c',
  '.h',
  '.cpp',
  '.hpp',
  '.cs',
  '.php',
  '.sql',
  '.log',
];

/**
 * Determines if a file is likely a text file based on MIME type or extension
 * @param {File} file - File object to check
 * @returns {boolean} True if file is likely text
 */
export const isProbablyTextFile = (file) => {
  if (!file) {
    return false;
  }
  const { type, name } = file;
  if (type && TEXT_MIME_PREFIXES.some((prefix) => type.startsWith(prefix))) {
    return true;
  }
  if (typeof name === 'string' && name) {
    const lower = name.toLowerCase();
    if (TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      return true;
    }
  }
  return false;
};
