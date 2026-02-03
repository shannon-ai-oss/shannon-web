import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box } from '@mui/material';

import type { Message } from '@/types';
import MessageItem from './MessageItem';
import '../Chat.css';

interface MessageListProps {
  messages: Message[];
  onRegenerate?: (messageId: string) => Promise<void> | void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onStop?: (messageId: string) => void;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
  editingState?: {
    messageId: string;
    originalContent: string;
  };
  isSending?: boolean;
  assistantAvatarUrl?: string | null;
  assistantName?: string | null;
  showInlineAds?: boolean;
}

const INLINE_AD_SCRIPT_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7639291116930760';

const InlineAd: React.FC = () => {
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    try {
      const adsbygoogle = (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle || [];
      adsbygoogle.push({});
      (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle = adsbygoogle;
    } catch (err) {
      console.error('Failed to load inline ad:', err);
    }
  }, []);

  return (
    <Box className="claude-inline-ad">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-7639291116930760"
        data-ad-slot="5089469638"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </Box>
  );
};

const AssistantInlineAd: React.FC = () => {
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    try {
      const adsbygoogle = (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle || [];
      adsbygoogle.push({});
      (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle = adsbygoogle;
    } catch (err) {
      console.error('Failed to load assistant ad:', err);
    }
  }, []);

  return (
    <Box className="claude-inline-ad claude-inline-ad-assistant">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-format="fluid"
        data-ad-layout-key="-ft+5w+4e-db+86"
        data-ad-client="ca-pub-7639291116930760"
        data-ad-slot="1065274771"
      />
    </Box>
  );
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  onRegenerate,
  onEdit,
  onDelete,
  onStop,
  messagesEndRef,
  editingState,
  isSending = false,
  assistantAvatarUrl,
  assistantName,
  showInlineAds = false,
}) => {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const copyResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const safeMessages = Array.isArray(messages) ? messages : [];

  const copyMessageText = useCallback(async (text: string, messageId: string) => {
    const copyValue = typeof text === 'string' ? text : '';
    if (!copyValue.trim()) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyValue);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = copyValue;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopiedMessageId(messageId);

      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current);
      }

      copyResetTimeoutRef.current = setTimeout(() => {
        setCopiedMessageId(null);
        copyResetTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showInlineAds) return;
    const existingScript = document.querySelector(
      `script[src="${INLINE_AD_SCRIPT_SRC}"]`,
    ) as HTMLScriptElement | null;
    if (existingScript) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = INLINE_AD_SCRIPT_SRC;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-adsbygoogle', 'true');
    document.head.appendChild(script);
  }, [showInlineAds]);

  const handleMessageCopy = useCallback((messageId: string) => {
    const message = safeMessages.find((msg) => msg.id === messageId);
    if (!message) return;
    copyMessageText(message.content || '', messageId);
  }, [safeMessages, copyMessageText]);

  const handleMessageEdit = useCallback((message: Message) => {
    onEdit?.(message);
  }, [onEdit]);

  const handleMessageDelete = useCallback((message: Message) => {
    onDelete?.(message);
  }, [onDelete]);

  const handleMessageRegenerate = useCallback((messageId: string) => {
    // Find the message index
    const msgIndex = safeMessages.findIndex((msg) => msg.id === messageId);
    if (msgIndex < 0) return Promise.resolve();

    // Check if there are messages after this one
    const messagesAfter = safeMessages.slice(msgIndex + 1);
    const hasMessagesAfter = messagesAfter.length > 0;

    // If there are messages after, show confirmation
    if (hasMessagesAfter) {
      const confirmed = typeof window !== 'undefined'
        ? window.confirm(
            `Regenerating this response will remove ${messagesAfter.length} message${messagesAfter.length > 1 ? 's' : ''} after it. Continue?`
          )
        : true;

      if (!confirmed) return Promise.resolve();
    }

    const result = onRegenerate?.(messageId);
    return result ?? Promise.resolve();
  }, [onRegenerate, safeMessages]);

  const handleMessageStop = useCallback((messageId: string) => {
    onStop?.(messageId);
  }, [onStop]);


  return (
    <Box className="claude-messages">
      {safeMessages.map((message) => {
        const isEditing = editingState?.messageId === message.id;
        const isCopied = copiedMessageId === message.id;
        const canEdit = message.role === 'user' && !message.isError && !message.isPlaceholder;
        const canDelete = !message.isPlaceholder;
        const canCopy = message.role === 'assistant' && !message.isPlaceholder && Boolean(message.content);
    const canRegenerate = message.role === 'assistant' && !message.isError && !message.isPlaceholder;
    const canStop = message.isStreaming && message.role === 'assistant';
    const shouldRenderInlineAd =
      showInlineAds && message.role === 'user' && !message.isPlaceholder;
    const shouldRenderAssistantAd =
      showInlineAds && message.role === 'assistant' && !message.isPlaceholder && Boolean(message.content);

    return (
      <React.Fragment key={message.id}>
        <MessageItem
              message={message}
              isEditing={isEditing}
              isCopied={isCopied}
              canEdit={canEdit}
              canDelete={canDelete}
              canCopy={canCopy}
              canRegenerate={canRegenerate}
              canStop={canStop}
              onCopy={() => handleMessageCopy(message.id)}
              onEdit={() => handleMessageEdit(message)}
              onDelete={() => handleMessageDelete(message)}
              onRegenerate={() => handleMessageRegenerate(message.id)}
              onStop={() => handleMessageStop(message.id)}
          assistantAvatarUrl={assistantAvatarUrl}
          assistantName={assistantName}
        />
        {shouldRenderInlineAd && <InlineAd />}
        {shouldRenderAssistantAd && <AssistantInlineAd />}
      </React.Fragment>
    );
  })}

      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
