export function estimateTokens(text) {
  if (typeof text !== 'string') {
    return 0;
  }
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 0;
  }
  const charEstimate = Math.ceil(normalized.length / 4);
  const wordEstimate = normalized.split(' ').length;
  return Math.max(charEstimate, wordEstimate);
}

export function estimateConversationTokens(conversation = []) {
  if (!Array.isArray(conversation)) {
    return 0;
  }
  return conversation.reduce((total, entry) => {
    if (!entry || typeof entry.content !== 'string') {
      return total;
    }
    return total + estimateTokens(entry.content);
  }, 0);
}

export function estimateContextTokens(conversation = [], pendingInput = '') {
  return estimateConversationTokens(conversation) + estimateTokens(pendingInput);
}
