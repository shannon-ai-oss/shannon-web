/**
 * Math and LaTeX processing utilities
 */

const ZERO_WIDTH_REGEX = /[\u200B\u200C\u200D\u200E\u200F\u202A-\u202E\u2060\uFEFF]/g;
const COMBINING_UNDERLINE_REGEX = /[\u0331\u0332\u0333\u0335\u0336]/g;

/**
 * Normalizes math delimiters in text, converting various LaTeX formats to standard forms
 * @param {string} input - Input text with math expressions
 * @returns {string} Normalized text
 */
export const normalizeMathDelimiters = (input) => {
  if (!input) {
    return input;
  }

  const codeFencePattern = /(```[\s\S]*?```|`[^`]*`)/g;
  const segments = String(input).split(codeFencePattern);

  return segments
    .map((segment, index) => {
      // Odd indices contain the matched code fences/inline code (because of capturing group)
      if (index % 2 === 1) {
        return segment;
      }

      let result = segment;
      
      // Normalize $$ on same line to proper display math format
      // $$content$$ → $$ content $$  (with newlines)
      result = result.replace(/\$\$((?:(?!\$\$).)+)\$\$/g, (match, content) => {
        // Check if it's already on separate lines
        if (match.startsWith('$$\n') || match.endsWith('\n$$')) {
          return match;
        }
        // Add line breaks for display math
        return `$$\n${content.trim()}\n$$`;
      });
      
      // Convert \[ \] to $$ $$ (display math)
      result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_, content) => `$$\n${content.trim()}\n$$`);
      
      // Convert \( \) to $ $ (inline math)
      result = result.replace(/\\\(([\s\S]+?)\\\)/g, (_, content) => `$${content}$`);
      
      // Handle equation environments
      result = result.replace(/\\begin\{equation\*?\}([\s\S]+?)\\end\{equation\*?\}/g, (_, content) => `$$\n${content.trim()}\n$$`);
      
      // Handle align environments
      result = result.replace(/\\begin\{align\*?\}([\s\S]+?)\\end\{align\*?\}/g, (_, content) => `$$\n\\begin{aligned}${content}\\end{aligned}\n$$`);
      
      // Handle gather environments
      result = result.replace(/\\begin\{gather\*?\}([\s\S]+?)\\end\{gather\*?\}/g, (_, content) => `$$\n\\begin{gathered}${content}\\end{gathered}\n$$`);
      
      // Handle displaymath environment
      result = result.replace(/\\begin\{displaymath\}([\s\S]+?)\\end\{displaymath\}/g, (_, content) => `$$\n${content.trim()}\n$$`);
      
      // Fix \ce{} inside arrow commands - NOT ALLOWED in mhchem
      // \ce{...}[\ce{reagent}] → \ce{...[reagent]}
      result = result.replace(/->\[\\ce\{([^}]+)\}\]/g, (match, reagent) => `->[${reagent}]`);
      result = result.replace(/\\xrightarrow\{\\ce\{([^}]+)\}\}/g, (match, reagent) => `\\xrightarrow{${reagent}}`);
      result = result.replace(/\\xleftarrow\{\\ce\{([^}]+)\}\}/g, (match, reagent) => `\\xleftarrow{${reagent}}`);
      
      // Auto-fix \ce without braces: \ceD → $\ce{D}$, \ce2 → $\ce{2}$, \ceAscorbicAcid → $\ce{AscorbicAcid}$
      // Match \ce followed by anything that's NOT { or whitespace
      result = result.replace(/\\ce([A-Za-z0-9][A-Za-z0-9]*)/g, (match, text) => `$\\ce{${text}}$`);
      
      // Auto-fix standalone \ce commands (not already in $ $)
      // Match \ce{...} that's NOT preceded by $ and NOT followed by $
      result = result.replace(/(?<!\$)\\ce\{([^}]+)\}(?!\$)/g, (match) => `$${match}$`);
      
      return result;
    })
    .join('');
};

/**
 * Sanitizes math source by removing zero-width characters and normalizing delimiters
 * @param {string} input - Raw math source
 * @param {Object} options - Options for sanitization
 * @param {boolean} options.inline - Whether this is inline math
 * @returns {string} Sanitized math source
 */
export const sanitizeMathSource = (input, options = {}) => {
  const { inline = false } = options;
  if (input == null) {
    return '';
  }
  let value = String(input);
  if (!value) {
    return '';
  }
  value = value.replace(ZERO_WIDTH_REGEX, '').replace(/\u00A0/g, ' ');
  value = value.replace(COMBINING_UNDERLINE_REGEX, '');
  let trimmed = value.trim();

  const stripDelimiters = () => {
    if (trimmed.startsWith('\\(') && trimmed.endsWith('\\)') && trimmed.length > 4) {
      trimmed = trimmed.slice(2, -2).trim();
      return;
    }
    if (trimmed.startsWith('\\[') && trimmed.endsWith('\\]') && trimmed.length > 4) {
      trimmed = trimmed.slice(2, -2).trim();
      return;
    }
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      trimmed = trimmed.slice(2, -2).trim();
      return;
    }
    if (trimmed.startsWith('$') && trimmed.endsWith('$') && trimmed.length > 2) {
      trimmed = trimmed.slice(1, -1).trim();
    }
  };

  if (inline) {
    stripDelimiters();
  } else if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
    trimmed = trimmed.slice(2, -2).trim();
  }

  trimmed = trimmed.replace(/^\$+(?=\s*[\\0-9a-zA-Z])/g, '');

  return trimmed;
};

/**
 * Computes a preview of reasoning content by stripping markdown and truncating
 * @param {string} input - Reasoning text
 * @returns {string} Preview text
 */
export const computeReasoningPreview = (input) => {
  if (!input) {
    return '';
  }
  const cleaned = String(input)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '$1')
    .replace(/[>#*_~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) {
    return '';
  }
  return cleaned.length > 120 ? `${cleaned.slice(0, 120).trim()}…` : cleaned;
};
