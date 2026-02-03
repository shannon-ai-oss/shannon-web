/**
 * useMessageEditing hook - Manages message editing state
 */
import { useState, useCallback, useMemo } from 'react';

export const useMessageEditing = (initialMode) => {
  const [editingState, setEditingState] = useState(null);

  const editingPreview = useMemo(() => {
    if (!editingState?.originalText) {
      return '';
    }
    const trimmed = editingState.originalText.trim();
    return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
  }, [editingState]);

  const handleEditMessage = useCallback((msg, currentMode, activeChatId) => {
    if (!msg || msg.role !== 'user') {
      return;
    }
    const nextMode = msg.mode || msg.requested_mode || currentMode;
    setEditingState({
      messageId: msg.id,
      chatId: activeChatId,
      originalText: msg.text || msg.content || '',
      mode: nextMode,
    });
    return nextMode;
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingState(null);
  }, []);

  return {
    editingState,
    editingPreview,
    setEditingState,
    handleEditMessage,
    handleCancelEdit,
  };
};
