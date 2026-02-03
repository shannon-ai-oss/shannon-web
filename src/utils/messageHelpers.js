/**
 * Message processing and helper utilities
 */

/**
 * Strips special tags like <think> and <answer> from text
 * @param {string} input - Input text with potential tags
 * @returns {string} Text with tags stripped
 */
export const stripSpecialTags = (input) => {
  if (!input) {
    return '';
  }

  return String(input)
    .replace(/<(think|answer)>([\s\S]*?)<\/\1>/gi, (_, __, inner) => inner)
    .replace(/<\/?(think|answer)>/gi, '');
};

/**
 * Builds a signature for a message to detect changes
 * @param {Object} msg - Message object
 * @returns {string} Message signature
 */
export const buildMessageSignature = (msg) => {
  if (!msg || typeof msg !== 'object') {
    return 'invalid';
  }
  const pieces = [
    msg.id,
    msg.role,
    msg.answer,
    msg.response_text,
    msg.text,
    msg.reasoning,
    msg.status_message,
    msg.fallback_reason,
    msg.isStreaming,
    msg.wasStopped,
    msg.mode,
    msg.requested_mode,
    msg.provider,
    msg.updated_at,
    msg.updatedAt,
    msg.attempt,
    JSON.stringify(msg.reasoning_segments || []),
  ];
  const metrics = msg.metrics || {};
  pieces.push(metrics.latencyMs);
  const usage = msg.usage || {};
  pieces.push(
    usage.cost_cents,
    usage.cost_usd,
    usage.balance_remaining_cents,
    usage.balance_remaining_usd,
    usage.codename,
    JSON.stringify(usage.providers || []),
    usage.answer_tokens,
    usage.reasoning_tokens
  );
  return `${msg.id ?? 'unknown'}:${hashPieces(pieces)}`;
};

/**
 * Creates a hash from an array of pieces
 * @param {Array} pieces - Array of values to hash
 * @returns {string} Hexadecimal hash string
 */
const hashPieces = (pieces) => {
  let hash = 0;
  pieces.forEach((piece, index) => {
    const str = piece == null ? '' : String(piece);
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    hash ^= (index + 1) * 0x9e3779b1;
  });
  return (hash >>> 0).toString(16);
};

/**
 * Helper to extend arrays with unique values
 * @param {Array} base - Base array
 * @param {Array} extra - Extra values to add
 * @returns {Array} Combined array with unique values
 */
export const extendList = (base, extra) => Array.from(new Set([...(base || []), ...extra]));
