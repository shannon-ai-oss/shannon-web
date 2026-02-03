import { extractFinalAnswerSegment } from './parseLLMResponse';

function sanitizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

export function prepareConversationMessages(messages = []) {
  if (!Array.isArray(messages)) {
    return [];
  }

  const buckets = messages.reduce(
    (acc, msg, index) => {
      if (!msg || msg.isPlaceholder || msg.isError) {
        return acc;
      }

      const role = msg.role;
      if (role === 'system') {
        const content = sanitizeText(
          msg.text || msg.content || msg.prompt || msg.instructions || '',
        );
        if (!content) {
          return acc;
        }
        acc.system.push({
          id: msg.id || `system-${index}`,
          role: 'system',
          content,
          originUserMessageId: null,
        });
        return acc;
      }

      if (role === 'user') {
        const content = sanitizeText(msg.text || msg.content || '');
        if (!content) {
          return acc;
        }
        acc.other.push({
          id: msg.id,
          role: 'user',
          content,
          originUserMessageId: msg.origin_user_message_id || null,
        });
        return acc;
      }

      if (role === 'assistant') {
        const answerSource = sanitizeText(msg.answer || msg.response_text || msg.text || '');
        const finalAnswer = sanitizeText(extractFinalAnswerSegment(answerSource) || answerSource);
        if (!finalAnswer) {
          return acc;
        }
        acc.other.push({
          id: msg.id,
          role: 'assistant',
          content: finalAnswer,
          originUserMessageId: msg.origin_user_message_id || null,
        });
      }
      return acc;
    },
    { system: [], other: [] },
  );

  return [...buckets.system, ...buckets.other];
}

export function buildConversationPayload(messages = [], regenerateFromMessageId = null) {
  const prepared = prepareConversationMessages(messages);
  const filtered = regenerateFromMessageId
    ? prepared.filter((entry) => {
        if (entry.role === 'user' && entry.id === regenerateFromMessageId) {
          return false;
        }
        if (entry.role === 'assistant' && entry.originUserMessageId === regenerateFromMessageId) {
          return false;
        }
        return true;
      })
    : prepared;

  const conversation = filtered.map(({ role, content }) => ({ role, content }));
  return { conversation, prepared: filtered };
}

export function findUserMessageForAssistant(messages = [], assistantMessageId) {
  if (!assistantMessageId) {
    return null;
  }
  const assistantMessage = (Array.isArray(messages) ? messages : []).find(
    (msg) => msg && msg.id === assistantMessageId,
  );
  if (!assistantMessage || assistantMessage.role !== 'assistant') {
    return null;
  }
  const targetUserId = assistantMessage.origin_user_message_id;
  if (!targetUserId) {
    return null;
  }
  return (Array.isArray(messages) ? messages : []).find(
    (msg) => msg && msg.id === targetUserId && msg.role === 'user',
  );
}
