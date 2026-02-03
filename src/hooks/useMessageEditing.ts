import { useState, useCallback } from 'react';
import type { Message } from '@/types';

interface EditingState {
  messageId: string;
  originalContent: string;
  mode?: string;
}

interface UseMessageEditingReturn {
  editingState: EditingState | null;
  editingPreview: string | null;
  setEditingState: (state: EditingState | null) => void;
  handleEditMessage: (message: Message, currentMode?: string, chatId?: string) => string | null;
  handleCancelEdit: () => void;
}

export const useMessageEditing = (): UseMessageEditingReturn => {
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [editingPreview, setEditingPreview] = useState<string | null>(null);

  const handleEditMessage = useCallback((
    message: Message,
    currentMode?: string,
    chatId?: string
  ): string | null => {
    if (!message || message.role !== 'user') {
      return null;
    }

    const content = message.content || '';
    const preview = content.length > 50
      ? `${content.slice(0, 50)}...`
      : content;

    const newEditingState: EditingState = {
      messageId: message.id,
      originalContent: content,
      mode: currentMode,
    };

    setEditingState(newEditingState);
    setEditingPreview(preview);

    return currentMode || null;
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingState(null);
    setEditingPreview(null);
  }, []);

  return {
    editingState,
    editingPreview,
    setEditingState,
    handleEditMessage,
    handleCancelEdit,
  };
};