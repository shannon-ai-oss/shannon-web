import type { Message } from '@/types';

type MermaidRuntime = {
  parse?: (definition: string) => unknown;
};

type MermaidAwareGlobal = typeof globalThis & {
  mermaid?: MermaidRuntime;
};

export type MermaidDiagramType =
  | 'flowchart'
  | 'sequenceDiagram'
  | 'classDiagram'
  | 'stateDiagram'
  | 'stateDiagram-v2'
  | 'erDiagram'
  | 'journey'
  | 'gantt'
  | 'gitGraph'
  | 'pie'
  | 'mindmap'
  | 'timeline'
  | 'quadrantChart'
  | 'xychart'
  | 'unknown';

export interface FixMermaidOptions {
  defaultFlowchartDirection?: 'TD' | 'TB' | 'BT' | 'LR' | 'RL';
  fallbackDiagram?: string;
  validator?: (code: string) => boolean;
}

export interface MermaidDiagramFix {
  original: string;
  code: string;
  type: MermaidDiagramType;
  placeholderApplied: boolean;
  changes: string[];
}

export interface MermaidFenceFix {
  index: number;
  original: string;
  fixed: string;
  diagramType: MermaidDiagramType;
  placeholderApplied: boolean;
  changes: string[];
}

export interface MermaidContentFixResult {
  content: string;
  changed: boolean;
  fixes: MermaidFenceFix[];
}

export interface MermaidMessageFixResult {
  message: Message;
  changed: boolean;
  fixes: MermaidFenceFix[];
}

const DEFAULT_PLACEHOLDER = [
  'flowchart TD',
  '    start((Diagram could not be displayed))',
  '    start-->notice[Check the original source]',
].join('\n');

const MERMAID_BLOCK_PATTERN =
  /```mermaid([^\n\r]*)\r?\n([\s\S]*?)(\r?\n?)```/gi;

const DIAGRAM_HEADER_PATTERN =
  /^(?:flowchart|graph|sequenceDiagram|sequence\s*diagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|journey|gantt|gitGraph|pie|mindmap|timeline|quadrantChart|xychart(?:-beta)?)/i;

const BLOCK_START_KEYWORDS = [
  'subgraph',
  'loop',
  'alt',
  'opt',
  'par',
  'rect',
  'section',
];

const BLOCK_END_KEYWORD = /^end\b/i;
const BLOCK_ELSE_KEYWORD = /^(?:else|elseif|elif|else\s+if)\b/i;

const SUSPICIOUS_TAG_PATTERN =
  /<\/?(?:script|iframe|object|embed|style|link|meta|img|svg|math|form|input|textarea|button|select|video|audio)[^>]*>/gi;
const EVENT_HANDLER_ATTR_PATTERN = /\son[a-z]+\s*=\s*(['"]).*?\1/gi;
const JAVASCRIPT_PROTOCOL_PATTERN = /javascript\s*:/gi;

const FLOWCHART_DIRECTION_PATTERN = /^(?:TD|TB|BT|LR|RL)$/i;

const sanitizeSuspiciousContent = (line: string): string => {
  let sanitized = line.replace(SUSPICIOUS_TAG_PATTERN, '');
  sanitized = sanitized.replace(EVENT_HANDLER_ATTR_PATTERN, '');
  sanitized = sanitized.replace(JAVASCRIPT_PROTOCOL_PATTERN, '');
  return sanitized;
};

const normalizeLineEndings = (value: string): string =>
  value.replace(/\r\n/g, '\n');

const guessDiagramType = (code: string): MermaidDiagramType => {
  const normalized = code.toLowerCase();
  if (/\b[a-z0-9_]+\s*-\s*>[a-z0-9_]+\s*:/i.test(code)) {
    return 'sequenceDiagram';
  }
  if (
    /\bparticipant\b|\b->>|\b-->>|\bactivate\b|\bdeactivate\b|\balt\b|\bopt\b/.test(
      normalized,
    )
  ) {
    return 'sequenceDiagram';
  }
  if (/\bclass\s+[A-Za-z0-9_]+\s*\{/i.test(code)) {
    return 'classDiagram';
  }
  if (/\bstateDiagram-v2\b/i.test(code)) {
    return 'stateDiagram-v2';
  }
  if (/\bstateDiagram\b/i.test(code)) {
    return 'stateDiagram';
  }
  if (/\bgantt\b/i.test(code)) {
    return 'gantt';
  }
  if (/\bjourney\b/i.test(code)) {
    return 'journey';
  }
  if (/\berDiagram\b/i.test(code)) {
    return 'erDiagram';
  }
  if (/\bgitGraph\b/i.test(code)) {
    return 'gitGraph';
  }
  if (/\bpie\b/i.test(code)) {
    return 'pie';
  }
  if (/\bmindmap\b/i.test(code)) {
    return 'mindmap';
  }
  if (/\btimeline\b/i.test(code)) {
    return 'timeline';
  }
  if (/\bquadrantChart\b/i.test(code)) {
    return 'quadrantChart';
  }
  if (/\bxychart\b/i.test(code)) {
    return 'xychart';
  }
  return 'flowchart';
};

const normalizeHeader = (
  headerLine: string,
  options: FixMermaidOptions,
  changes: string[],
): { header: string; type: MermaidDiagramType } => {
  const tokens = headerLine.trim().split(/\s+/);
  const keywordRaw = tokens[0] || '';
  const keyword = keywordRaw.toLowerCase();
  let type: MermaidDiagramType = 'unknown';

  if (keyword === 'graph') {
    tokens[0] = 'flowchart';
    changes.push('normalized-graph-header');
  }

  switch (tokens[0].toLowerCase()) {
    case 'flowchart': {
      type = 'flowchart';
      if (tokens.length === 1) {
        const direction =
          options.defaultFlowchartDirection ?? 'TD';
        tokens.push(direction);
        changes.push('added-flowchart-direction');
      } else if (!FLOWCHART_DIRECTION_PATTERN.test(tokens[1])) {
        tokens[1] = options.defaultFlowchartDirection ?? 'TD';
        changes.push('normalized-flowchart-direction');
      } else {
        tokens[1] = tokens[1].toUpperCase();
      }
      tokens[0] = 'flowchart';
      break;
    }
    case 'sequencediagram':
    case 'sequence': {
      type = 'sequenceDiagram';
      tokens[0] = 'sequenceDiagram';
      tokens.splice(1);
      break;
    }
    case 'classdiagram': {
      type = 'classDiagram';
      tokens[0] = 'classDiagram';
      break;
    }
    case 'statediagram-v2': {
      type = 'stateDiagram-v2';
      tokens[0] = 'stateDiagram-v2';
      break;
    }
    case 'statediagram': {
      type = 'stateDiagram';
      tokens[0] = 'stateDiagram';
      break;
    }
    case 'erdiagram': {
      type = 'erDiagram';
      tokens[0] = 'erDiagram';
      break;
    }
    case 'gantt': {
      type = 'gantt';
      tokens[0] = 'gantt';
      break;
    }
    case 'journey': {
      type = 'journey';
      tokens[0] = 'journey';
      break;
    }
    case 'gitgraph': {
      type = 'gitGraph';
      tokens[0] = 'gitGraph';
      break;
    }
    case 'pie': {
      type = 'pie';
      tokens[0] = 'pie';
      break;
    }
    case 'mindmap': {
      type = 'mindmap';
      tokens[0] = 'mindmap';
      break;
    }
    case 'timeline': {
      type = 'timeline';
      tokens[0] = 'timeline';
      break;
    }
    case 'quadrantchart': {
      type = 'quadrantChart';
      tokens[0] = 'quadrantChart';
      break;
    }
    case 'xychart':
    case 'xychart-beta': {
      type = 'xychart';
      tokens[0] = 'xychart';
      break;
    }
    default: {
      type = guessDiagramType(headerLine);
      break;
    }
  }

  return {
    header: tokens.join(' '),
    type,
  };
};

const normalizeArrowSyntax = (
  input: string,
  type: MermaidDiagramType,
): string => {
  let line = input;
  // Tighten spacing around common connectors
  line = line
    .replace(/\s*-->\s*/g, '-->')
    .replace(/\s*--o\s*/g, '--o')
    .replace(/\s*--x\s*/g, '--x')
    .replace(/\s*==>\s*/g, '==>')
    .replace(/\s*-\|>\s*/g, '-|>')
    .replace(/\s*-\*\s*/g, '-*')
    .replace(/\s*--\|\s*/g, '--|')
    .replace(/\s*--\s*\|\s*/g, '--|')
    .replace(/\s*\|\s*--\s*/g, '|--');

  if (type === 'sequenceDiagram') {
    line = line.replace(/-->>/g, '->>');
    line = line.replace(/\s*->>\s*/g, '->>');
    line = line.replace(/(^|[^-])->(?!>)/g, (_, prefix: string) => {
      return `${prefix}->>`;
    });
  } else {
    line = line.replace(/(^|[^-])->(?!>)/g, (_, prefix: string) => {
      return `${prefix}-->`;
    });
    line = line.replace(/\s*-->\s*/g, '-->');
  }

  line = line.replace(/\s{2,}/g, (segment) => ' '.repeat(Math.min(segment.length, 2)));
  return line;
};

const tryDefaultValidator = (code: string): boolean => {
  const runtime = (globalThis as MermaidAwareGlobal).mermaid;
  if (!runtime || typeof runtime.parse !== 'function') {
    return code.trim().length > 0;
  }
  try {
    runtime.parse(code);
    return true;
  } catch (error) {
    const message =
      (error instanceof Error && error.message) ||
      (typeof error === 'string' ? error : '');

    if (
      typeof message === 'string' &&
      /dompurify\.addhook is not a function/i.test(message)
    ) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(
          '[MermaidFixer] Mermaid validation skipped because DOMPurify.addHook is unavailable.',
        );
      }
      return true;
    }
    return false;
  }
};

export const fixMermaidDiagramDetailed = (
  diagramCode: string,
  options: FixMermaidOptions = {},
): MermaidDiagramFix => {
  const changes: string[] = [];
  const fallbackDiagram = options.fallbackDiagram || DEFAULT_PLACEHOLDER;

  if (!diagramCode || typeof diagramCode !== 'string') {
    return {
      original: '',
      code: fallbackDiagram,
      type: 'flowchart',
      placeholderApplied: true,
      changes: ['empty-input-placeholder'],
    };
  }

  const trimmedOriginal = diagramCode.trim();
  let working = normalizeLineEndings(trimmedOriginal);

  // Extract config block(s)
  let configBlock = '';
  while (working.startsWith('%%{')) {
    const configMatch = working.match(/^%%\{[^]*?\}%%\s*/);
    if (!configMatch) {
      break;
    }
    configBlock += configMatch[0].trimEnd();
    working = working.slice(configMatch[0].length).trimStart();
  }

  const lines = working.split('\n');
  let headerLine = lines[0] ?? '';
  let diagramType: MermaidDiagramType = 'unknown';

  if (!DIAGRAM_HEADER_PATTERN.test(headerLine.trim())) {
    const inferredType = guessDiagramType(working);
    diagramType = inferredType;
    if (inferredType === 'sequenceDiagram') {
      lines.unshift('sequenceDiagram');
      changes.push('inserted-sequence-header');
    } else {
      const direction =
        options.defaultFlowchartDirection ?? 'TD';
      lines.unshift(`flowchart ${direction}`);
      diagramType = 'flowchart';
      changes.push('inserted-flowchart-header');
    }
  } else {
    const normalizedHeader = normalizeHeader(
      headerLine,
      options,
      changes,
    );
    lines[0] = normalizedHeader.header;
    diagramType = normalizedHeader.type;
  }

  const stack: string[] = [];
  const processedLines: string[] = [];

  lines.forEach((rawLine, index) => {
    let line = rawLine;
    if (index === 0) {
      processedLines.push(line.trim());
      return;
    }

    const trimmed = rawLine.trim();
    if (!trimmed) {
      processedLines.push('');
      return;
    }

    let sanitized = sanitizeSuspiciousContent(trimmed);

    // Track block starts
    const lower = sanitized.toLowerCase();
    const blockStart = BLOCK_START_KEYWORDS.find((keyword) =>
      lower.startsWith(keyword),
    );
    if (blockStart) {
      stack.push(blockStart);
      const indent = '    '.repeat(Math.max(stack.length - 1, 0));
      if (blockStart === 'subgraph') {
        sanitized = sanitized.replace(/^subgraph\b/i, 'subgraph');
      } else {
        sanitized = sanitized.replace(
          new RegExp(`^${blockStart}\\b`, 'i'),
          blockStart,
        );
      }
      processedLines.push(`${indent}${sanitized}`);
      return;
    }

    if (BLOCK_END_KEYWORD.test(sanitized)) {
      if (stack.length > 0) {
        stack.pop();
      }
      const indent = '    '.repeat(Math.max(stack.length, 0));
      processedLines.push(`${indent}end`);
      return;
    }

    if (BLOCK_ELSE_KEYWORD.test(sanitized)) {
      const indent = '    '.repeat(Math.max(stack.length - 1, 0));
      sanitized = sanitized.replace(/^else\s+if\b/i, 'else if');
      sanitized = sanitized.replace(/^elseif\b/i, 'else if');
      sanitized = sanitized.replace(/^elif\b/i, 'else if');
      sanitized = sanitized.replace(/^else\b/i, 'else');
      processedLines.push(`${indent}${sanitized}`);
      return;
    }

    sanitized = normalizeArrowSyntax(sanitized, diagramType);

    if (/^style\b/i.test(sanitized)) {
      sanitized = sanitized.replace(/, +/g, ',');
    }

    const indent = '    '.repeat(Math.max(stack.length, 0));
    processedLines.push(`${indent}${sanitized}`);
  });

  while (stack.length > 0) {
    const indent = '    '.repeat(Math.max(stack.length - 1, 0));
    processedLines.push(`${indent}end`);
    stack.pop();
    changes.push('appended-missing-end');
  }

  let reconstructed = processedLines.join('\n').trim();

  if (configBlock) {
    reconstructed = `${configBlock}\n${reconstructed}`;
  }

  const validator = options.validator ?? tryDefaultValidator;
  let placeholderApplied = false;
  let finalCode = reconstructed;
  const isValid = validator(reconstructed);
  if (!isValid) {
    finalCode = fallbackDiagram;
    placeholderApplied = true;
    changes.push('applied-placeholder');
  }

  return {
    original: normalizeLineEndings(trimmedOriginal).trim(),
    code: finalCode,
    type: diagramType,
    placeholderApplied,
    changes,
  };
};

export const fixMermaidDiagram = (
  diagramCode: string,
  options: FixMermaidOptions = {},
): string => fixMermaidDiagramDetailed(diagramCode, options).code;

export const fixMermaidInContent = (
  content: string,
  options: FixMermaidOptions = {},
): MermaidContentFixResult => {
  if (!content || typeof content !== 'string') {
    return {
      content: content ?? '',
      changed: false,
      fixes: [],
    };
  }

  let lastIndex = 0;
  let mutated = '';
  let changed = false;
  const fixes: MermaidFenceFix[] = [];

  const iter = content.matchAll(MERMAID_BLOCK_PATTERN);
  for (const match of iter) {
    const [full, fenceOptions = '', inner, newlineBeforeFence = ''] = match;
    const start = match.index ?? 0;
    const end = start + full.length;

    mutated += content.slice(lastIndex, start);

    const detail = fixMermaidDiagramDetailed(inner, options);
    const normalizedOriginal = normalizeLineEndings(inner).trim();
    const normalizedFixed = normalizeLineEndings(detail.code).trim();

    const header = `\`\`\`mermaid${fenceOptions}\n`;
    const closingNewline =
      newlineBeforeFence || (detail.code.endsWith('\n') ? '' : '\n');
    const rebuiltBlock = `${header}${detail.code}${closingNewline}\`\`\``;

    if (normalizedOriginal === normalizedFixed && !detail.placeholderApplied) {
      mutated += full;
    } else {
      mutated += rebuiltBlock;
      changed = true;
    }

    fixes.push({
      index: fixes.length,
      original: inner,
      fixed: detail.code,
      diagramType: detail.type,
      placeholderApplied: detail.placeholderApplied,
      changes: detail.changes,
    });

    lastIndex = end;
  }

  if (lastIndex < content.length) {
    mutated += content.slice(lastIndex);
  }

  return {
    content: changed ? mutated : content,
    changed,
    fixes,
  };
};

export const fixDiagramInMessageWithMeta = (
  message: Message,
  options: FixMermaidOptions = {},
): MermaidMessageFixResult => {
  if (!message) {
    throw new Error('Message is required for Mermaid fixing.');
  }

  const originalContent = message.content ?? '';
  const result = fixMermaidInContent(originalContent, options);

  if (!result.changed) {
    return {
      message,
      changed: false,
      fixes: result.fixes,
    };
  }

  return {
    message: {
      ...message,
      content: result.content,
    },
    changed: true,
    fixes: result.fixes,
  };
};

export const fixDiagramInMessage = (
  message: Message,
  options: FixMermaidOptions = {},
): Message => fixDiagramInMessageWithMeta(message, options).message;
