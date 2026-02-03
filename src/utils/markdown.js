const TABLE_ROW_REGEX = /^\s*\|/;
const CODE_FENCE_REGEX = /^\s*```/;
const ALIGN_CELL_PATTERN = /^:?[-]{1,}:?$/;

function splitMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) {
    return [];
  }

  let working = trimmed;
  if (!working.endsWith('|')) {
    working += '|';
  }

  const cells = [];
  let current = '';
  let escaping = false;

  for (let index = 1; index < working.length; index += 1) {
    const char = working[index];

    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (char === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  return cells;
}

function escapePipes(text) {
  return text.replace(/\|/g, '\\|');
}

function padCells(cells, targetLength, filler = '') {
  const result = [...cells];
  while (result.length < targetLength) {
    result.push(filler);
  }
  if (result.length > targetLength) {
    return result.slice(0, targetLength);
  }
  return result;
}


function normalizeAlignmentCell(cell) {
  const compact = cell.replace(/\s+/g, '');
  if (!ALIGN_CELL_PATTERN.test(compact)) {
    return '---';
  }

  const hasLeading = compact.startsWith(':');
  const hasTrailing = compact.endsWith(':');
  const dashCount = Math.max(compact.replace(/:/g, '').length, 3);
  const dashes = '-'.repeat(dashCount);

  let normalized = dashes;
  if (hasLeading) {
    normalized = `:${normalized}`;
  }
  if (hasTrailing) {
    normalized = `${normalized}:`;
  }
  return normalized;
}

function buildTableLine(cells, indent = '', { alignment = false } = {}) {
  const renderedCells = cells.map((cell) => {
    if (alignment) {
      return normalizeAlignmentCell(cell);
    }
    const safeContent = escapePipes(cell.trim());
    return safeContent || ' ';
  });

  return `${indent}| ${renderedCells.join(' | ')} |`;
}

function isAlignmentLine(cells) {
  return cells.length > 0 && cells.every((cell) => ALIGN_CELL_PATTERN.test(cell.replace(/\s+/g, '')));
}

function normalizeTableBlock(lines) {
  if (lines.length === 0) {
    return lines;
  }

  const indentMatch = lines[0].match(/^\s*/);
  const indent = indentMatch ? indentMatch[0] : '';
  const headerCells = splitMarkdownRow(lines[0]);
  if (headerCells.length < 2) {
    return lines;
  }

  const normalized = [];
  normalized.push(buildTableLine(headerCells, indent));

  const maybeAlignmentCells = lines.length > 1 ? splitMarkdownRow(lines[1]) : [];
  const hasAlignment = isAlignmentLine(maybeAlignmentCells);

  if (hasAlignment) {
    const normalizedAlignment = padCells(maybeAlignmentCells, headerCells.length, '---');
    normalized.push(buildTableLine(normalizedAlignment, indent, { alignment: true }));
  } else {
    const filler = headerCells.map(() => '---');
    normalized.push(buildTableLine(filler, indent, { alignment: true }));
  }

  const dataStartIndex = hasAlignment ? 2 : 1;

  for (let rowIndex = dataStartIndex; rowIndex < lines.length; rowIndex += 1) {
    const rowCells = splitMarkdownRow(lines[rowIndex]);
    if (rowCells.length === 0) {
      normalized.push(lines[rowIndex]);
      continue;
    }

    const padded = padCells(rowCells, headerCells.length);
    normalized.push(buildTableLine(padded, indent));
  }

  return normalized;
}

export function normalizeMarkdownTables(markdown) {
  if (typeof markdown !== 'string' || markdown.indexOf('|') === -1) {
    return markdown;
  }

  const lines = markdown.split('\n');
  const result = [];
  let index = 0;
  let inCodeBlock = false;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (CODE_FENCE_REGEX.test(trimmed)) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      index += 1;
      continue;
    }

    if (inCodeBlock || !TABLE_ROW_REGEX.test(line)) {
      result.push(line);
      index += 1;
      continue;
    }

    const blockLines = [];
    while (index < lines.length && TABLE_ROW_REGEX.test(lines[index])) {
      blockLines.push(lines[index]);
      index += 1;
    }

    const normalizedBlock = normalizeTableBlock(blockLines);
    result.push(...normalizedBlock);
  }

  return result.join('\n');
}

