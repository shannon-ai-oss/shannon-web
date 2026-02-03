import React, { createContext, useContext } from 'react';

const defaultValue = {
  chats: [],
  activeChat: null,
  activeChatId: null,
  setActiveChatId: () => {},
  createNewChat: async () => null,
  beginNewChat: () => {},
  draftChat: null,
  renameChat: async () => {},
  deleteChat: async () => {},
  sendMessage: async () => null,
  regenerateMessage: async () => {},
  deleteMessage: async () => {},
  cancelStreaming: () => {},
  isSending: false,
  lastError: null,
  clearError: () => {},
  memoryProfile: '',
  memoryEnabled: true,
  setMemoryEnabled: () => {},
  toggleMemoryEnabled: () => {},
  memoryReadEnabled: true,
  setMemoryReadEnabled: () => {},
  toggleMemoryReadEnabled: () => {},
  memoryWriteEnabled: true,
  setMemoryWriteEnabled: () => {},
  toggleMemoryWriteEnabled: () => {},
  memorySizeSetting: null,
  setMemorySizeSetting: () => {},
  userPlanMemoryLimit: 100,
  effectiveMemorySize: 100,
  resetMemoryProfile: async () => {},
  applyMermaidFix: async () => {},
  getChatContextIds: () => ({ customShanId: null, projectId: null }),
};

const ChatContext = createContext(defaultValue);

export function ChatProvider({ children }) {
  return <ChatContext.Provider value={defaultValue}>{children}</ChatContext.Provider>;
}

export function useChat() {
  return useContext(ChatContext);
}

export default ChatContext;
