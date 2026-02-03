/**
 * Markdown processing utilities
 */

/**
 * Sanitize markdown input for safe rendering
 */
export const sanitizeMarkdownInput = (input: string): string => {
  if (typeof input !== 'string') return '';

  return input
    // Remove potentially dangerous HTML tags
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/<form[^>]*>.*?<\/form>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Extract the final answer segment from LLM response
 */
export const extractFinalAnswerSegment = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  // Look for common answer patterns
  const answerPatterns = [
    /(?:final answer|answer|conclusion)[:\s]*([^]*?)(?=\n\n|\n[A-Z]|\n#|$)/i,
    /(?:result|outcome)[:\s]*([^]*?)(?=\n\n|\n[A-Z]|\n#|$)/i,
    /(?:therefore|thus|so)[:\s]*([^]*?)(?=\n\n|\n[A-Z]|\n#|$)/i,
  ];

  for (const pattern of answerPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If no clear answer pattern found, return the last paragraph
  const paragraphs = text.split(/\n\n+/);
  if (paragraphs.length > 0) {
    const lastParagraph = paragraphs[paragraphs.length - 1];
    if (lastParagraph.trim().length > 20) {
      return lastParagraph.trim();
    }
  }

  // Fallback: return the last few lines
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    return lines.slice(-3).join(' ').trim();
  }

  return text.trim();
};

/**
 * Parse LLM response to extract structured data
 */
export const parseLLMResponse = (text: string): {
  answer: string;
  reasoning: string;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
} => {
  if (!text || typeof text !== 'string') {
    return { answer: '', reasoning: '' };
  }

  // Try to separate reasoning from answer
  let reasoning = '';
  let answer = '';

  // Look for reasoning sections
  const reasoningPatterns = [
    /(?:reasoning|thinking|analysis|step-by-step)[:\s]*([^]*?)(?=\n\n(?:answer|final|conclusion)|\n#|$)/i,
    /(?:thoughts|thought process)[:\s]*([^]*?)(?=\n\n(?:answer|final|conclusion)|\n#|$)/i,
  ];

  for (const pattern of reasoningPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      reasoning = match[1].trim();
      break;
    }
  }

  // Extract answer
  answer = extractFinalAnswerSegment(text);

  // If we couldn't separate reasoning and answer, use the whole text as answer
  if (!answer && !reasoning) {
    answer = text.trim();
  } else if (!answer) {
    answer = text.replace(reasoning, '').trim();
  }

  // Extract sources if present
  const sources = extractSources(text);

  return {
    answer: sanitizeMarkdownInput(answer),
    reasoning: sanitizeMarkdownInput(reasoning),
    sources,
  };
};

/**
 * Extract sources from markdown text
 */
export const extractSources = (text: string): Array<{
  title: string;
  url: string;
  snippet: string;
}> => {
  const sources: Array<{ title: string; url: string; snippet: string }> = [];

  // Look for citation patterns like [1], [source], etc.
  const citationPatterns = [
    /\[(\d+)\]\s*([^]*?)(?=\n\n|\n\[|$)/g,
    /source[:\s]*([^]*?)(?=\n\n|\n#|$)/gi,
  ];

  for (const pattern of citationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const citationText = match[2] || match[1];

      // Try to extract URL from citation
      const urlMatch = citationText.match(/https?:\/\/[^\s\)]+/);
      const url = urlMatch ? urlMatch[0] : '';

      // Extract title (text before URL or first 100 chars)
      const title = urlMatch
        ? citationText.substring(0, citationText.indexOf(urlMatch[0])).trim()
        : citationText.trim().substring(0, 100);

      if (title || url) {
        sources.push({
          title: title || 'Source',
          url,
          snippet: citationText.trim().substring(0, 200),
        });
      }
    }
  }

  return sources;
};

/**
 * Preprocess markdown for safer rendering
 */
export const preprocessMarkdown = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  let processed = sanitizeMarkdownInput(text);

  // Escape potentially dangerous markdown constructs
  processed = processed
    // Limit header levels to prevent abuse
    .replace(/^#{7,}/gm, '######')
    // Limit list indentation
    .replace(/^(\s{10,})/gm, '          ')
    // Limit blockquote nesting
    .replace(/^(>{5,})/gm, '>>>>>');

  return processed;
};

/**
 * Strip markdown for plain text preview
 */
export const stripMarkdown = (text: string, maxLength: number = 200): string => {
  if (!text || typeof text !== 'string') return '';

  let plain = text
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Remove inline code
    .replace(/`(.*?)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '[code]')
    // Remove links, keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Remove extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (plain.length > maxLength) {
    plain = plain.substring(0, maxLength) + '...';
  }

  return plain;
};

/**
 * Check if text contains code blocks
 */
export const hasCodeBlocks = (text: string): boolean => {
  return /```[\s\S]*?```/.test(text) || /`[^`]+`/.test(text);
};

/**
 * Extract code blocks from text
 */
export const extractCodeBlocks = (text: string): Array<{
  language: string;
  code: string;
  fullMatch: string;
}> => {
  const codeBlocks: Array<{ language: string; code: string; fullMatch: string }> = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2],
      fullMatch: match[0],
    });
  }

  return codeBlocks;
};

/**
 * Extract inline code from text
 */
export const extractInlineCode = (text: string): string[] => {
  const inlineCode: string[] = [];
  const regex = /`([^`]+)`/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    inlineCode.push(match[1]);
  }

  return inlineCode;
};

/**
 * Detect if text is likely a code snippet
 */
export const isCodeSnippet = (text: string): boolean => {
  const codeIndicators = [
    /function\s+\w+\s*\(/,
    /class\s+\w+/,
    /import\s+.*from/,
    /def\s+\w+\s*\(/,
    /const\s+\w+\s*=/,
    /let\s+\w+\s*=/,
    /var\s+\w+\s*=/,
    /if\s*\(/,
    /for\s*\(/,
    /while\s*\(/,
    /return\s+/,
    /console\./,
    /print\s*\(/,
  ];

  // Check if multiple lines contain code-like patterns
  const lines = text.split('\n');
  let codeLineCount = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine === '') continue;

    for (const pattern of codeIndicators) {
      if (pattern.test(trimmedLine)) {
        codeLineCount++;
        break;
      }
    }
  }

  // If more than 30% of non-empty lines look like code, consider it a code snippet
  const nonEmptyLines = lines.filter(line => line.trim() !== '').length;
  return nonEmptyLines > 0 && (codeLineCount / nonEmptyLines) > 0.3;
};

/**
 * Format markdown tables safely
 */
export const sanitizeTables = (text: string): string => {
  // Ensure tables have proper structure
  return text.replace(
    /^\|(.+)\|\s*\n\|[-\s|]+\|\s*\n((?:\|.+\|\s*\n?)*)/gm,
    (match, header, separator, rows) => {
      // Count columns in header
      const headerColumns = header.split('|').length - 2;
      const separatorColumns = separator.split('|').length - 2;

      if (headerColumns !== separatorColumns) {
        // Return just the header text if table is malformed
        return header.trim();
      }

      return match;
    }
  );
};

/**
 * Generate a safe markdown ID for headers
 */
export const generateHeaderId = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Create a table of contents from markdown headers
 */
export const createTableOfContents = (text: string): Array<{
  level: number;
  title: string;
  id: string;
}> => {
  const toc: Array<{ level: number; title: string; id: string }> = [];
  const headerRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;

  while ((match = headerRegex.exec(text)) !== null) {
    const level = match[1].length;
    const title = match[2].trim();
    const id = generateHeaderId(title);

    toc.push({ level, title, id });
  }

  return toc;
};