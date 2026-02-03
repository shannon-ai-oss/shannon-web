import { createContext, useContext } from 'react';

const noop = () => {};
const asyncNoop = async () => {};

export const MarkdownRenderContext = createContext({
  chatId: null,
  messageId: null,
  getNextMermaidIndex: () => 0,
  replaceMermaidBlock: asyncNoop,
});

export const useMarkdownRenderContext = () => useContext(MarkdownRenderContext);

export const createMarkdownContextValue = (overrides = {}) => ({
  chatId: overrides.chatId ?? null,
  messageId: overrides.messageId ?? null,
  getNextMermaidIndex: overrides.getNextMermaidIndex ?? (() => 0),
  replaceMermaidBlock: overrides.replaceMermaidBlock ?? asyncNoop,
});
