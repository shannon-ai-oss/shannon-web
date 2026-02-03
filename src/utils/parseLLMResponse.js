const FALLBACK_REASONING_REGEX = /(Reasoning|Chain of Thought|Thoughts?)[:\s]*([\s\S]*?)(?=\s*(?:Answer|Final Answer|Response|Solution)[:]|$)/i;
const FALLBACK_ANSWER_REGEX = /(?:Answer|Final Answer|Response|Solution)[:\s]*([\s\S]*)/i;

const ANSWER_TAG_REGEX = /<\/?answer\b[^>]*>/gi;
const THINK_WRAPPER_REGEX = /<\/?think\b[^>]*>/gi;
const THINK_BLOCK_REGEX = /<\s*think\b[^>]*>[\s\S]*?<\s*\/\s*think\s*>/gi;
const THINK_CLOSE_TAG = '</think>';

function tryParseStructuredJson(text = '') {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }

  const lastBrace = trimmed.lastIndexOf('}');
  if (lastBrace === -1) {
    return null;
  }

  const candidate = trimmed.slice(0, lastBrace + 1);
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const { think, answer } = parsed;
    if (typeof think !== 'string' || typeof answer !== 'string') {
      return null;
    }

    return { think, answer };
  } catch {
    return null;
  }
}

function collectMatches(text, regex) {
  const matches = [];
  const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  let match;
  while ((match = globalRegex.exec(text)) !== null) {
    matches.push(match);
    if (match.index === globalRegex.lastIndex) {
      globalRegex.lastIndex += 1;
    }
  }
  return matches;
}

function stripAnswerTags(text = '') {
  return text.replace(ANSWER_TAG_REGEX, '').trim();
}

function stripThinkWrappers(text = '') {
  return text.replace(THINK_WRAPPER_REGEX, '').trim();
}

function sanitizeAnswerContent(text = '') {
  if (!text) {
    return '';
  }

  const lower = text.toLowerCase();
  const lastThinkClose = lower.lastIndexOf(THINK_CLOSE_TAG);
  let cleaned = lastThinkClose !== -1
    ? text.slice(lastThinkClose + THINK_CLOSE_TAG.length)
    : text;

  cleaned = cleaned.replace(THINK_BLOCK_REGEX, '');
  cleaned = stripThinkWrappers(cleaned);
  cleaned = stripAnswerTags(cleaned);

  return cleaned.trim();
}

export function parseLLMResponse(text = '') {
  if (!text) {
    return { reasoning: '', answer: '' };
  }

  const structured = tryParseStructuredJson(text);
  if (structured) {
    return {
      reasoning: stripThinkWrappers(structured.think),
      answer: sanitizeAnswerContent(structured.answer),
    };
  }

  let answer = '';
  let reasoning = '';
  
  const closeMatches = collectMatches(text, /<\s*\/\s*answer\s*>/gi);
  if (closeMatches.length) {
    const lastCloseMatch = closeMatches[closeMatches.length - 1];
    const closeIndex = lastCloseMatch.index;

    const searchRegion = text.slice(0, closeIndex);
    const openMatches = collectMatches(searchRegion, /<\s*answer\b[^>]*>/gi);

    if (openMatches.length) {
      const lastOpenMatch = openMatches[openMatches.length - 1];
      const openIndex = lastOpenMatch.index;
      const openTagLength = lastOpenMatch[0].length;

      answer = text.slice(openIndex + openTagLength, closeIndex).trim();

      const firstThink = text.indexOf('<think');
      if (firstThink !== -1 && firstThink < openIndex) {
        reasoning = text.slice(firstThink, openIndex);
      }
    }
  }

  // Fallback if no structured answer found
  if (!answer) {
    const fallbackMatch = text.match(FALLBACK_ANSWER_REGEX);
    if (fallbackMatch) {
      answer = fallbackMatch[1].trim();
    } else {
      const withoutThink = text.replace(THINK_BLOCK_REGEX, '');
      const answerOnly = collectMatches(withoutThink, /<\s*answer\b[^>]*>[\s\S]*?<\s*\/\s*answer\s*>/gi)
        .map((match) => match[0])
        .pop();
      if (answerOnly) {
        answer = stripAnswerTags(answerOnly);
      } else {
        answer = stripAnswerTags(withoutThink);
      }
    }
  }

  // Fallback reasoning
  if (!reasoning) {
    const fallbackReasoning = text.match(FALLBACK_REASONING_REGEX);
    if (fallbackReasoning) {
      reasoning = fallbackReasoning[2];
    } else {
      const firstThink = text.indexOf('<think');
      const lastThinkClose = text.lastIndexOf('</think>');
      if (firstThink !== -1 && lastThinkClose !== -1) {
        reasoning = text.substring(firstThink, lastThinkClose + '</think>'.length);
      }
    }
  }

  return {
    reasoning: stripThinkWrappers(reasoning),
    answer: sanitizeAnswerContent(answer),
  };
}

export function extractFinalAnswerSegment(text = '') {
  if (!text) {
    return '';
  }

  const structured = tryParseStructuredJson(text);
  if (structured) {
    return sanitizeAnswerContent(structured.answer);
  }

  const lower = text.toLowerCase();
  const answerCloseIndex = lower.lastIndexOf('</answer>');
  if (answerCloseIndex !== -1) {
    const answerOpenIndex = lower.lastIndexOf('<answer', answerCloseIndex);
    if (answerOpenIndex !== -1) {
      const contentStart = text.indexOf('>', answerOpenIndex);
      if (contentStart !== -1 && contentStart < answerCloseIndex) {
        return sanitizeAnswerContent(text.slice(contentStart + 1, answerCloseIndex));
      }
    }
  }

  const withoutThink = text.replace(THINK_BLOCK_REGEX, '');
  return sanitizeAnswerContent(withoutThink);
}
