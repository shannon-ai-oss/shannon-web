import React, { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import {
  ContentCopy as CopyIcon,
  ReplayOutlined as RetryIcon,
  StopCircleOutlined as StopIcon,
  EditOutlined as EditIcon,
  DeleteOutlineRounded as DeleteIcon,
} from '@mui/icons-material';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import type { Attachment, Message } from '@/types';
import { formatFileSize } from '@/utils/format';
import { renderMarkdownSafely } from '../MarkdownComponents';
import ReasoningBlock from './ReasoningBlock';
import LoadingIndicator from './LoadingIndicator';
import '../Chat.css';
import { useChat } from '@/context/ChatContext';

type AttachmentLike = Attachment & {
  download_url?: string | null;
  content_type?: string | null;
  size_bytes?: number | null;
  text_content?: string | null;
  is_text?: boolean;
  remoteUrl?: string | null;
  url?: string | null;
  size?: number | null;
  type?: string | null;
  contentType?: string | null;
  textContent?: string | null;
  isText?: boolean;
  truncated?: boolean;
  preview?: {
    kind?: string | null;
    text?: string | null;
    url?: string | null;
  } | null;
  data_url?: string | null;
  dataUrl?: string | null;
};

type NormalizedAttachment = {
  id: string;
  name: string;
  contentType: string | null;
  sizeBytes: number | null;
  sizeLabel: string | null;
  downloadUrl: string | null;
  dataUrl: string | null;
  isText: boolean;
  truncated: boolean;
  textPreview: string | null;
  previewUrl: string | null;
};

const TEXT_PREVIEW_LIMIT = 600;

const getInitials = (label?: string | null): string => {
  if (!label) {
    return 'YOU';
  }

  const trimmed = label.trim();
  if (!trimmed) {
    return 'YOU';
  }

  const segments = trimmed.split(/\s+/).filter(Boolean);
  if (segments.length === 1) {
    const [word] = segments;
    if (word.length >= 2) {
      return `${word[0]}${word[word.length - 1]}`.toUpperCase();
    }
    return word.toUpperCase().slice(0, 2);
  }

  return `${segments[0][0] ?? ''}${segments[segments.length - 1][0] ?? ''}`
    .toUpperCase()
    .slice(0, 2);
};

const coerceString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
};

const coerceNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const normalizeAttachments = (raw: AttachmentLike[] | undefined | null): NormalizedAttachment[] => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }

  return raw
    .map((item, index) => {
      if (!item) {
        return null;
      }

      const id = coerceString(item.id) || `attachment-${index + 1}`;
      const name = coerceString(item.name) || `Attachment ${index + 1}`;

      const downloadUrl =
        coerceString((item as AttachmentLike).download_url)
        || coerceString((item as AttachmentLike).remoteUrl)
        || coerceString((item as AttachmentLike).url);

      const dataUrl =
        coerceString((item as AttachmentLike).data_url)
        || coerceString((item as AttachmentLike).dataUrl)
        || null;

      const contentType =
        coerceString((item as AttachmentLike).content_type)
        || coerceString((item as AttachmentLike).contentType)
        || coerceString((item as AttachmentLike).type)
        || null;

      const sizeBytes =
        coerceNumber((item as AttachmentLike).size_bytes)
        ?? coerceNumber((item as AttachmentLike).size)
        ?? null;

      let textPreview =
        coerceString((item as AttachmentLike).text_content)
        ?? coerceString((item as AttachmentLike).textContent)
        ?? null;

      let truncated = Boolean((item as AttachmentLike).truncated);
      let isText =
        Boolean((item as AttachmentLike).is_text)
        || Boolean((item as AttachmentLike).isText);

      const previewPayload = (item as AttachmentLike).preview;
      const previewKind = previewPayload?.kind ?? null;
      const previewUrl = coerceString(
        previewKind === 'image' ? previewPayload?.url : undefined,
      )
        || (contentType && contentType.startsWith('image/') ? (downloadUrl || dataUrl) : null)
        || (previewKind === 'image' ? dataUrl : null);

      if (!textPreview && previewKind === 'text') {
        textPreview = coerceString(previewPayload?.text);
      }

      if (!isText && textPreview) {
        isText = true;
      }

      if (!isText && contentType && contentType.startsWith('text/')) {
        isText = true;
      }

      if (textPreview) {
        const trimmed = textPreview.slice(0, TEXT_PREVIEW_LIMIT);
        if (trimmed.length < textPreview.length) {
          truncated = true;
        }
        textPreview = trimmed;
      }

      const sizeLabel = sizeBytes !== null ? formatFileSize(sizeBytes) : null;

      return {
        id,
        name,
        contentType,
        sizeBytes,
        sizeLabel,
        downloadUrl,
        dataUrl,
        isText,
        truncated,
        textPreview,
        previewUrl,
      };
    })
    .filter((attachment): attachment is NormalizedAttachment => Boolean(attachment));
};

interface MessageAttachmentsProps {
  attachments: NormalizedAttachment[];
  isUser: boolean;
}

const MessageAttachments: React.FC<MessageAttachmentsProps> = ({ attachments, isUser }) => {
  if (!attachments.length) {
    return null;
  }

  return (
    <Box className={`claude-message-attachments${isUser ? ' claude-message-attachments-user' : ''}`}>
      {attachments.map((attachment) => {
        const metaBits: string[] = [];
        if (attachment.contentType) {
          metaBits.push(attachment.contentType);
        }
        if (attachment.sizeLabel) {
          metaBits.push(attachment.sizeLabel);
        }
        const metaText = metaBits.join(' · ');
        const icon = attachment.previewUrl
          ? <ImageOutlinedIcon fontSize="small" />
          : <InsertDriveFileOutlinedIcon fontSize="small" />;
        const linkHref = attachment.downloadUrl || attachment.dataUrl || null;
        const linkExtraProps =
          attachment.downloadUrl || !linkHref
            ? {}
            : { download: attachment.name || 'attachment' };

        return (
          <Box key={attachment.id} className="claude-message-attachment">
            <Box className="claude-message-attachment-header">
              <Box className="claude-message-attachment-title">
                {icon}
                <Box className="claude-message-attachment-heading">
                  <Typography component="span" className="claude-message-attachment-name">
                    {attachment.name}
                  </Typography>
                  {metaText && (
                    <Typography component="span" className="claude-message-attachment-meta">
                      {metaText}
                    </Typography>
                  )}
                </Box>
              </Box>

              {linkHref && (
                <a
                  className="claude-message-attachment-link"
                  href={linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...linkExtraProps}
                >
                  <OpenInNewIcon fontSize="small" />
                  <span>{attachment.downloadUrl ? 'Open' : 'Preview'}</span>
                </a>
              )}
            </Box>

            {attachment.previewUrl && (
              <Box className="claude-message-attachment-preview image">
                <img
                  src={attachment.previewUrl}
                  alt={attachment.name}
                  loading="lazy"
                  decoding="async"
                />
              </Box>
            )}

            {attachment.textPreview && (
              <Box className="claude-message-attachment-preview">
                <pre>{attachment.textPreview}</pre>
                {attachment.truncated && (
                  <Typography component="span" className="claude-message-attachment-footnote">
                    Preview truncated for chat context.
                  </Typography>
                )}
              </Box>
            )}

            {!attachment.textPreview && !attachment.previewUrl && !linkHref && (
              <Typography component="span" className="claude-message-attachment-footnote">
                Attachment reference stored with this message.
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

type MessageAction = {
  key: string;
  icon: ReactNode;
  handler?: () => void;
  disabled?: boolean;
  active?: boolean;
  aria: string;
  tone: 'neutral' | 'accent' | 'danger';
};

interface MessageItemProps {
  message: Message;
  isEditing?: boolean;
  isCopied?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canCopy?: boolean;
  canRegenerate?: boolean;
  canStop?: boolean;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRegenerate?: () => Promise<void> | void;
  onStop?: () => void;
  assistantAvatarUrl?: string | null;
  assistantName?: string | null;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isEditing = false,
  isCopied = false,
  canEdit = false,
  canDelete = false,
  canCopy = false,
  canRegenerate = false,
  canStop = false,
  onCopy,
  onEdit,
  onDelete,
  onRegenerate,
  onStop,
  // assistantAvatarUrl and assistantName kept in interface for future use
}) => {
  const { applyMermaidFix } = useChat();
  const isUser = message.role === 'user';
  const hasError = message.isError || Boolean(message.error);
  const isStreaming = Boolean(message.isStreaming);
  const isPlaceholder = Boolean(message.isPlaceholder);
  const normalizedAttachments = useMemo(
    () => normalizeAttachments(message.attachments as AttachmentLike[] | undefined),
    [message.attachments],
  );
  const hasAttachments = normalizedAttachments.length > 0;
  const thinkingEnabled = Boolean(
    message.metadata?.thinking_enabled || (message as any).thinkingEnabled,
  );

  const loadingIndicatorText = useMemo(() => {
    if (isStreaming && thinkingEnabled && (message.reasoning || (message as any).thinkingActive)) {
      return '';
    }
    if (isStreaming) {
      return '';
    }
    const statusText = typeof message.statusMessage === 'string'
      ? message.statusMessage.trim()
      : '';
    if (!statusText) {
      return '';
    }
    const isGenericThinking = statusText.toLowerCase().startsWith('thinking');
    if (isStreaming && isGenericThinking) {
      return '';
    }
    return statusText;
  }, [isStreaming, message.statusMessage, thinkingEnabled]);

  const messageClassName = [
    'claude-message',
    isUser ? 'claude-user-message' : 'claude-ai-message',
    isEditing ? 'claude-message-editing' : '',
    hasError ? 'claude-message-error' : '',
    isPlaceholder ? 'claude-message-placeholder' : '',
    message.wasStopped ? 'claude-message-stopped' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const bodyClassName = [
    'claude-message-body',
    isUser ? 'claude-message-body-user' : 'claude-message-body-assistant',
  ]
    .filter(Boolean)
    .join(' ');

  const messageContent = typeof message.content === 'string' ? message.content : '';
  const rawText = typeof message.reasoning === 'string' && message.reasoning.trim()
    ? message.reasoning
    : '';
  const isThinkingActive = useMemo(
    () =>
      !isUser
      && thinkingEnabled
      && Boolean((message as any).thinkingActive || isStreaming),
    [isUser, thinkingEnabled, message, isStreaming],
  );
  const [reasoningStreamFinished, setReasoningStreamFinished] = useState(false);

  const reasoningContent = useMemo(() => {
    const explicit = typeof message.reasoning === 'string' ? message.reasoning : '';
    if (explicit.trim()) return explicit;
    if (!isUser && thinkingEnabled && (isThinkingActive || isStreaming)) {
      return rawText || '';
    }
    return '';
  }, [message.reasoning, rawText, isUser, isThinkingActive, isStreaming, thinkingEnabled]);

  const hasReasoning = !isUser && thinkingEnabled && Boolean(reasoningContent || isThinkingActive);
  const captionText = !isUser && !isStreaming
    ? message.metadata?.disclaimer || message.statusMessage || null
    : null;
  const thinkingCompleteFlag = typeof (message as any).thinkingComplete === 'boolean'
    ? (message as any).thinkingComplete
    : null;
  const mustWaitForReasoning = thinkingEnabled;
  const shouldGateAnswer =
    thinkingEnabled &&
    !isUser &&
    (isStreaming || isThinkingActive || hasReasoning);
  const canShowAnswer = useMemo(() => {
    if (!shouldGateAnswer) return true;
    const nothingToWaitFor = !hasReasoning && !isThinkingActive;
    if (nothingToWaitFor) {
      return !isStreaming;
    }
    if (mustWaitForReasoning) {
      return !isStreaming && !isThinkingActive && (reasoningStreamFinished || !hasReasoning);
    }
    if (thinkingCompleteFlag === false) return false;
    return !isStreaming;
  }, [
    shouldGateAnswer,
    thinkingCompleteFlag,
    isStreaming,
    isThinkingActive,
    reasoningStreamFinished,
    mustWaitForReasoning,
    hasReasoning,
  ]);

  useEffect(() => {
    if (isStreaming || isThinkingActive) {
      setReasoningStreamFinished(false);
    } else if (!hasReasoning && !isThinkingActive && thinkingEnabled) {
      setReasoningStreamFinished(true);
    }
  }, [message.id, isStreaming, isThinkingActive, hasReasoning, thinkingEnabled]);
  const persistMermaidUpdate = React.useCallback(
    async (nextContent: string, meta?: any) => {
      if (!message.chatId || !message.id) {
        return;
      }
      try {
        await applyMermaidFix({
          chatId: message.chatId,
          messageId: message.id,
          content: nextContent,
          source: typeof meta?.source === 'string' ? meta.source : 'inline',
          fixes: Array.isArray(meta?.fixes) ? meta.fixes : [],
          note: meta && typeof meta.note === 'string' ? meta.note : null,
        });
      } catch (error) {
        console.error('Failed to persist Mermaid update', {
          chatId: message.chatId,
          messageId: message.id,
          error,
        });
      }
    },
    [applyMermaidFix, message.chatId, message.id],
  );

  const userActions = [
    canEdit
      ? {
          key: 'edit',
          icon: <EditIcon fontSize="small" />,
          handler: onEdit,
          disabled: false,
          active: false,
          aria: 'Edit message',
          tone: 'neutral' as const,
        }
      : null,
    canDelete
      ? {
          key: 'delete',
          icon: <DeleteIcon fontSize="small" />,
          handler: onDelete,
          disabled: isStreaming,
          active: false,
          aria: 'Delete message',
          tone: 'danger' as const,
        }
      : null,
  ].filter(Boolean) as MessageAction[];

  const assistantActions = [
    canCopy
      ? {
          key: 'copy',
          icon: <CopyIcon fontSize="small" />,
          handler: onCopy,
          disabled: isStreaming,
          active: isCopied,
          aria: isCopied ? 'Copied' : 'Copy response',
          tone: 'neutral' as const,
        }
      : null,
    canRegenerate
      ? {
          key: 'retry',
          icon: <RetryIcon fontSize="small" />,
          handler: onRegenerate,
          disabled: isStreaming,
          active: false,
          aria: 'Retry response',
          tone: 'neutral' as const,
        }
      : null,
    canStop
      ? {
          key: 'stop',
          icon: <StopIcon fontSize="small" />,
          handler: onStop,
          disabled: !isStreaming,
          active: false,
          aria: 'Stop generation',
          tone: 'accent' as const,
        }
      : null,
  ].filter(Boolean) as MessageAction[];

  if (isUser) {
    const bubbleInitials = getInitials(
      message.metadata?.model || message.metadata?.provider || 'You'
    );
    const showActions = userActions.length > 0;
    const userText = messageContent;

    return (
      <Box className={messageClassName}>
        <div className="claude-user-bubble">
          <div className="claude-user-bubble-inner">
            <div className="claude-user-bubble-avatar" aria-hidden="true">
              {bubbleInitials}
            </div>

            <Box data-testid="user-message" className="claude-user-bubble-body">
              {isPlaceholder ? (
                messageContent ? (
                  <Typography component="p" className="claude-user-bubble-text">
                    {userText}
                  </Typography>
                ) : (
                  <LoadingIndicator text="Running on 12 H100 GPU" />
                )
              ) : hasError ? (
                <Typography className="claude-user-bubble-error">
                  {message.error || 'Something went wrong.'}
                </Typography>
              ) : messageContent ? (
                <Typography component="p" className="claude-user-bubble-text">
                  {userText}
                </Typography>
              ) : null}

              {hasAttachments && (
                <MessageAttachments attachments={normalizedAttachments} isUser />
              )}
            </Box>
          </div>

          {showActions && (
            <div className="claude-user-bubble-hover">
              <div className="claude-user-bubble-surface">
                {userActions.map(({ key, icon, handler, disabled, aria, tone }) => {
                  const className = [
                    'claude-user-action',
                    tone === 'danger' ? 'danger' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <button
                      key={key}
                      type="button"
                      className={className}
                      onClick={handler}
                      disabled={disabled}
                      aria-label={aria}
                      title={aria}
                    >
                      {icon}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Box>
    );
  }

  const streamingAnswerVisible = isStreaming && Boolean(messageContent);
  const hasVisibleAnswer = Boolean(
    messageContent
      && (!isPlaceholder || isStreaming)
      && ((streamingAnswerVisible || !shouldGateAnswer || canShowAnswer)),
  );

  const shouldShowLoader =
    !hasVisibleAnswer
    && (isStreaming || (isPlaceholder && !messageContent));

  return (
    <Box className={messageClassName}>
      <Box className="claude-assistant-row">
        <Box className={bodyClassName}>
          {hasError ? (
            <Typography className="claude-error-text">
              {message.error || 'Something went wrong.'}
            </Typography>
          ) : (
            <>
              {(hasReasoning || isThinkingActive) && (
                <ReasoningBlock
                  content={reasoningContent || ''}
                  isStreaming={isStreaming && thinkingCompleteFlag !== true}
                  provider={message.provider}
                  onComplete={() => setReasoningStreamFinished(true)}
                />
              )}

              {messageContent
                && !isPlaceholder
                && (((!shouldGateAnswer) || canShowAnswer)) && (
                <Box className="claude-message-markdown" sx={{ mt: hasReasoning ? 2.5 : 0 }}>
                  {renderMarkdownSafely(messageContent, `answer:${message.id}`, {
                    chatId: message.chatId,
                    messageId: message.id,
                    onUpdateContent: persistMermaidUpdate,
                  })}
                </Box>
              )}

              {shouldShowLoader && (
                <LoadingIndicator text={loadingIndicatorText} />
              )}

              {hasAttachments && (
                <MessageAttachments attachments={normalizedAttachments} isUser={false} />
              )}
            </>
          )}
        </Box>
      </Box>

      {captionText && (
        <Typography className="claude-message-caption">{captionText}</Typography>
      )}

      {assistantActions.length > 0 && (
        <div className="claude-message-actions">
          {assistantActions.map(({ key, icon, handler, disabled, active, aria, tone }) => {
            const className = [
              'claude-message-action',
              active ? 'is-active' : '',
              tone === 'accent' ? 'stop' : '',
              tone === 'danger' ? 'danger' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={key}
                type="button"
                className={className}
                onClick={handler}
                disabled={disabled}
                aria-label={aria}
                title={aria}
              >
                {icon}
              </button>
            );
          })}
        </div>
      )}
    </Box>
  );
};

export default MessageItem;
