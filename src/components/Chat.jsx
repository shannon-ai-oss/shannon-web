import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Typography,
  TextField,
  Button,
  Box,
  IconButton,
  Paper,
  Popover,
  Divider,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Switch,
  Chip,
  FormControlLabel,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import "./Chat.css";

// Configuration
import { MODE_OPTIONS } from "../config/chatModes.jsx";

// Utilities
import {
  formatMicroUsd,
  formatFileSize,
  coerceTokenCount,
} from "../utils/formatting.js";
import { MAX_ATTACHMENTS } from "../utils/fileHelpers.js";
import { computeReasoningPreview } from "../utils/mathHelpers.js";
import { buildMessageSignature } from "../utils/messageHelpers.js";
import { sanitizeMarkdownInput } from "../utils/markdownPrep.js";
import {
  parseLLMResponse,
  extractFinalAnswerSegment,
} from "../utils/parseLLMResponse";
import { prepareConversationMessages } from "../utils/conversationHistory";
import { estimateContextTokens } from "../utils/tokenMetrics";

// Components
import { renderMarkdownSafely } from "./MarkdownComponents.jsx";
import GlassFilter from "./GlassFilter.jsx";

// Hooks
import { useAttachments } from "../hooks/useAttachments.js";
import { useMessageEditing } from "../hooks/useMessageEditing.js";

// Context & API
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { fetchChatShareSettings, upsertChatShare } from "../api/share";

const areMessageListPropsEqual = (prevProps, nextProps) => {
  // Always re-render if any message is streaming - streaming updates must show immediately
  const hasStreamingMessage = nextProps.messages?.some((msg) => msg.isStreaming);
  if (hasStreamingMessage) {
    return false; // Force re-render during streaming
  }

  return (
    prevProps.messagesSignature === nextProps.messagesSignature &&
    prevProps.editingState === nextProps.editingState &&
    prevProps.isSending === nextProps.isSending &&
    prevProps.activeChatId === nextProps.activeChatId &&
    prevProps.regenerateMessage === nextProps.regenerateMessage &&
    prevProps.onDeleteMessage === nextProps.onDeleteMessage &&
    prevProps.onEditMessage === nextProps.onEditMessage &&
    prevProps.messagesEndRef === nextProps.messagesEndRef &&
    prevProps.user === nextProps.user
  );
};

const MessageList = React.memo(function MessageList({
  messages,
  messagesSignature,
  editingState,
  isSending,
  activeChatId,
  regenerateMessage,
  onDeleteMessage,
  onEditMessage,
  messagesEndRef,
  user,
}) {
  void messagesSignature;
  const safeMessages = Array.isArray(messages) ? messages : [];
  const autoRegenerationRef = useRef(new Set());
  const copyResetTimeoutRef = useRef(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  const copyMessageText = useCallback(async (text, messageId) => {
    const copyValue = typeof text === "string" ? text : "";
    if (!copyValue.trim()) {
      return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyValue);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = copyValue;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
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
      console.error("Failed to copy message", err);
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
    if (isSending) {
      return;
    }
    const currentMessageIds = new Set();

    safeMessages.forEach((msg) => {
      if (!msg || msg.role === "user" || !msg.id) {
        return;
      }
      currentMessageIds.add(msg.id);

      if (msg.isStreaming || msg.isPlaceholder) {
        return;
      }

      if (autoRegenerationRef.current.has(msg.id)) {
        return;
      }

      const attemptNumber = Number.isFinite(msg.attempt) ? msg.attempt : 1;
      if (attemptNumber > 1 || msg.isError || msg.wasStopped) {
        autoRegenerationRef.current.add(msg.id);
        return;
      }

      const answerSource = msg.answer || msg.response_text || msg.text || "";
      const visibleAnswer = extractFinalAnswerSegment(answerSource) || "";

      if (visibleAnswer.length >= 1000) {
        autoRegenerationRef.current.add(msg.id);
        return;
      }

      autoRegenerationRef.current.add(msg.id);
      regenerateMessage(msg.id, activeChatId, { auto: true }).catch((err) => {
        console.error("Auto-regenerate fallback failed", err);
      });
    });

    for (const id of Array.from(autoRegenerationRef.current)) {
      if (!currentMessageIds.has(id)) {
        autoRegenerationRef.current.delete(id);
      }
    }
  }, [safeMessages, regenerateMessage, activeChatId, isSending]);

  return (
    <Box className="claude-messages">
      {safeMessages.map((msg) => {
        const isUser = msg.role === "user";
        const baseText = isUser
          ? msg.text || ""
          : msg.response_text || msg.text || "";
        let parsedMemo = null;
        const ensureParsed = () => {
          if (!parsedMemo) {
            parsedMemo = parseLLMResponse(msg.text || "");
          }
          return parsedMemo;
        };

        let displayAnswer = baseText;
        let displayReasoning = "";
        if (!isUser) {
          const answerFromMessage = (msg.answer || "").trim();
          const reasoningFromMessage = (msg.reasoning || "").trim();

          if (answerFromMessage) {
            displayAnswer = answerFromMessage;
          } else {
            const parsed = ensureParsed();
            displayAnswer =
              parsed.answer ||
              extractFinalAnswerSegment(baseText || "") ||
              baseText;
          }
          if (reasoningFromMessage) {
            displayReasoning = reasoningFromMessage;
          } else {
            const parsed = ensureParsed();
            displayReasoning = parsed.reasoning || "";
          }
        }

        const normalizedAnswer = sanitizeMarkdownInput(displayAnswer);
        const normalizedReasoning = sanitizeMarkdownInput(displayReasoning);
        const refusalFallback = false;
        const allowReasoning = !isUser;
        const thinkingEnabledMeta = Boolean(msg?.metadata?.thinking_enabled);
        const reasoningSegmentsRaw = Array.isArray(msg.reasoning_segments)
          ? msg.reasoning_segments
          : [];
        const normalizedReasoningSegments = reasoningSegmentsRaw.map(
          (segment, index) => {
            const rawContent =
              typeof segment?.content === "string" ? segment.content : "";
            const normalizedContent = sanitizeMarkdownInput(rawContent);
            const preview = computeReasoningPreview(normalizedContent);
            const providerKey =
              typeof segment?.provider === "string"
                ? segment.provider.toLowerCase()
                : "";
            const attemptValue =
              Number.isFinite(segment?.attempt) && segment.attempt > 0
                ? segment.attempt
                : null;
            const isLive = Boolean(segment?.is_live);
            const hasContent = Boolean((normalizedContent || "").trim());
            return {
              ...segment,
              key: segment?.id || `${msg.id}-reasoning-${index}`,
              normalizedContent,
              preview,
              providerKey,
              attempt: attemptValue,
              is_live: isLive,
              hasContent,
            };
          },
        );
        const hasReasoningSegments =
          allowReasoning &&
          normalizedReasoningSegments.some(
            (segment) => segment.hasContent || segment.is_live,
          );
        const shouldShowAggregatedReasoning =
          allowReasoning &&
          !hasReasoningSegments &&
          Boolean((normalizedReasoning || "").trim());
        const reasoningPreview = shouldShowAggregatedReasoning
          ? computeReasoningPreview(normalizedReasoning)
          : "";
        const hasAnyReasoning =
          hasReasoningSegments || shouldShowAggregatedReasoning;
        const hideAnswerForReasoningMode =
          thinkingEnabledMeta && msg.isStreaming && allowReasoning;
        const shouldAutoOpenReasoning =
          thinkingEnabledMeta && msg.isStreaming && allowReasoning;
        const showPlaceholder =
          Boolean(msg.isPlaceholder) &&
          !msg.isStreaming &&
          !msg.isError &&
          !normalizedAnswer &&
          !hasAnyReasoning;
        const isPlaceholder = showPlaceholder;
        const providerClassMap = {
          shannon: "provider-default",
        };
        const providerLabelMap = {
          shannon: "Shannon",
        };
        const reasoningSegmentLabelMap = {
          shannon: "Reasoning",
        };
        const hasInitialFallbackDraft =
          typeof msg.initial_streamed_answer === "string" &&
          msg.initial_streamed_answer.trim().length > 0;
        const providerKey = (msg.provider || "shannon").toLowerCase();
        const providerClass =
          providerClassMap[providerKey] || "provider-default";
        const providerLabel = providerLabelMap[providerKey] || "Shannon";
        const reasoningSegmentElements = hasReasoningSegments
          ? normalizedReasoningSegments
              .map((segment) => {
                if (!segment.hasContent && !segment.is_live) {
                  return null;
                }
                const elementKey = `${segment.key}-${msg.isStreaming ? "live" : "done"}`;
                const reasoningContentRef = (node) => {
                  if (node && msg.isStreaming) {
                    node.scrollTop = node.scrollHeight;
                  }
                };
                const className = [
                  "claude-reasoning-block",
                  segment.is_live ? "claude-reasoning-block--live" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const baseTitle =
                  reasoningSegmentLabelMap[segment.providerKey] || "Reasoning";
                const attemptSuffix =
                  segment.attempt && segment.attempt > 1
                    ? ` • Attempt #${segment.attempt}`
                    : "";
                return (
                  <details
                    key={elementKey}
                    className={className}
                    open={msg.isStreaming ? true : undefined}
                  >
                    <summary className="claude-reasoning-header">
                      <span className="claude-reasoning-indicator" />
                      <span className="claude-reasoning-title">
                        {baseTitle}
                        {attemptSuffix}
                      </span>
                      {segment.preview && (
                        <span className="claude-reasoning-preview">
                          {segment.preview}
                        </span>
                      )}
                    </summary>
                    <div className="claude-reasoning-content">
                      {(segment.normalizedContent || "").trim() ? (
                        renderMarkdownSafely(
                          segment.normalizedContent,
                          `reasoning:${msg.id}:${segment.key}`,
                        )
                      ) : (
                        <em>Thinking…</em>
                      )}
                    </div>
                  </details>
                );
              })
              .filter(Boolean)
          : [];
        const metrics = msg.metrics || {};
        const usageInfo = msg.usage || {};
        const latencyMs =
          typeof metrics.latencyMs === "number" &&
          Number.isFinite(metrics.latencyMs)
            ? Math.max(0, metrics.latencyMs)
            : null;
        const latencyDisplay =
          latencyMs !== null
            ? `${(latencyMs / 1000).toFixed(latencyMs >= 1000 ? 1 : 2)}s`
            : null;
        const metricChips = [];
        const messageModeValue = isUser ? msg.mode : msg.requested_mode;
        const messageModeOption = MODE_OPTIONS.find(
          (option) => option.value === messageModeValue,
        );
        const messageModeLabel = messageModeOption?.label || null;
        if (!isUser && messageModeLabel) {
          metricChips.push({
            key: `${msg.id}-mode`,
            label: "Mode",
            value: messageModeLabel,
            type: "mode",
          });
        }
        if (latencyDisplay) {
          metricChips.push({
            key: `${msg.id}-latency`,
            label: "Latency",
            value: latencyDisplay,
            type: "latency",
          });
        }
        const costCents =
          typeof usageInfo.cost_cents === "number" &&
          Number.isFinite(usageInfo.cost_cents)
            ? usageInfo.cost_cents
            : null;
        const costUsd =
          typeof usageInfo.cost_usd === "string" && usageInfo.cost_usd.trim()
            ? usageInfo.cost_usd.trim()
            : costCents != null
              ? formatMicroUsd(costCents)
              : null;

        const promptTokens =
          typeof usageInfo.prompt_tokens === "number" &&
          Number.isFinite(usageInfo.prompt_tokens)
            ? usageInfo.prompt_tokens
            : null;
        const totalTokens =
          typeof usageInfo.total_tokens === "number" &&
          Number.isFinite(usageInfo.total_tokens)
            ? usageInfo.total_tokens
            : null;
        const answerTokens =
          typeof usageInfo.answer_tokens === "number" &&
          Number.isFinite(usageInfo.answer_tokens)
            ? usageInfo.answer_tokens
            : null;
        const reasoningTokens =
          typeof usageInfo.reasoning_tokens === "number" &&
          Number.isFinite(usageInfo.reasoning_tokens)
            ? usageInfo.reasoning_tokens
            : null;
        const codename =
          typeof usageInfo.codename === "string" && usageInfo.codename.trim()
            ? usageInfo.codename.trim()
            : null;

        const balanceRemainingCents =
          typeof usageInfo.balance_remaining_cents === "number" &&
          Number.isFinite(usageInfo.balance_remaining_cents)
            ? usageInfo.balance_remaining_cents
            : null;
        const balanceRemainingUsd =
          typeof usageInfo.balance_remaining_usd === "string" &&
          usageInfo.balance_remaining_usd.trim()
            ? usageInfo.balance_remaining_usd.trim()
            : balanceRemainingCents != null
              ? formatMicroUsd(balanceRemainingCents)
              : null;
        const providers = Array.isArray(usageInfo.providers)
          ? usageInfo.providers
          : [];
        const usagePieces = [];
        if (costUsd) {
          usagePieces.push(`${codename ?? "Usage"}: $${costUsd}`);
        } else if (codename) {
          usagePieces.push(codename);
        }
        if (providers.length > 0) {
          providers.forEach((provider, providerIndex) => {
            const name =
              typeof provider?.codename === "string" && provider.codename.trim()
                ? provider.codename.trim()
                : (codename ?? `Provider ${providerIndex + 1}`);
            const providerTokens =
              typeof provider?.tokens === "number" &&
              Number.isFinite(provider.tokens)
                ? provider.tokens
                : null;
            const providerCostUsd =
              typeof provider?.cost_usd === "string" && provider.cost_usd.trim()
                ? provider.cost_usd.trim()
                : typeof provider?.cost_cents === "number" &&
                    Number.isFinite(provider.cost_cents)
                  ? formatMicroUsd(provider.cost_cents)
                  : null;
            const parts = [name];
            if (providerCostUsd) {
              parts.push(`$${providerCostUsd}`);
            }
            if (providerTokens !== null) {
              parts.push(`${providerTokens} tokens`);
            }
            usagePieces.push(parts.join(" • "));
          });
        }
        if (promptTokens !== null) {
          usagePieces.push(`Prompt ${promptTokens}`);
        }
        if (totalTokens !== null) {
          usagePieces.push(`Total ${totalTokens}`);
        }
        if (answerTokens !== null) {
          usagePieces.push(`Answer ${answerTokens}`);
        }
        if (reasoningTokens !== null) {
          usagePieces.push(`Reasoning ${reasoningTokens}`);
        }
        if (balanceRemainingUsd) {
          usagePieces.push(`Balance $${balanceRemainingUsd}`);
        }
        const usageCaption = usagePieces.join(" • ");
        if (!isUser && typeof msg.attempt === "number" && msg.attempt > 1) {
          metricChips.push({
            key: `${msg.id}-attempt`,
            label: "Attempt",
            value: `#${msg.attempt}`,
            type: "attempt",
          });
        }
        const isEditingMessage = editingState?.messageId === msg.id;
        const messageClassName = [
          "claude-message",
          isUser ? "claude-user-message" : "claude-ai-message",
          isPlaceholder ? "claude-message-placeholder" : "",
          msg.isError ? "claude-message-error" : "",
          isEditingMessage ? "claude-message-editing" : "",
          msg.wasStopped ? "claude-message-stopped" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const canEditMessage = isUser && !msg.isError && !msg.isPlaceholder;
        const canDeleteMessage = !msg.isPlaceholder;
        const disableDelete = Boolean(msg.isStreaming);
        const canRegenerate = !isUser && !msg.isError && !msg.isPlaceholder;
        const disableRegenerate = isSending || Boolean(msg.isStreaming);
        const copyableText =
          normalizedAnswer || msg.answer || msg.response_text || msg.text || "";
        const canCopyMessage =
          !isUser && !msg.isPlaceholder && Boolean((copyableText || "").trim());
        const isCopied = copiedMessageId === msg.id;
        const handleMessageRegenerate = () => {
          if (!canRegenerate || disableRegenerate || !activeChatId) {
            return;
          }
          regenerateMessage(msg.id, activeChatId).catch((err) => {
            console.error("Regenerate failed", err);
          });
        };

        return (
          <Box key={msg.id} className={messageClassName}>
            <Box className="claude-message-header">
              <Box className="claude-avatar">
                {isUser ? (
                  user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || user.email}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    (() => {
                      if (user?.displayName) {
                        const names = user.displayName.split(" ");
                        if (names.length >= 2) {
                          return (
                            names[0][0] + names[names.length - 1][0]
                          ).toUpperCase();
                        }
                        return user.displayName.substring(0, 2).toUpperCase();
                      }
                      if (user?.email) {
                        return user.email.substring(0, 2).toUpperCase();
                      }
                      return "U";
                    })()
                  )
                ) : (
                  "AI"
                )}
              </Box>
              <Box className="claude-header-text">
                <Typography
                  variant="subtitle2"
                  component="span"
                  className="claude-sender-label"
                >
                  {isUser
                    ? user?.displayName || user?.email || "You"
                    : providerLabel}
                </Typography>
                <Box className="claude-message-controls">
                  {canEditMessage && (
                    <Tooltip title="Edit message" placement="top">
                      <span>
                        <IconButton
                          size="small"
                          className="claude-edit-btn"
                          onClick={() => onEditMessage?.(msg)}
                          disabled={!canEditMessage}
                          aria-label="Edit message"
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {canDeleteMessage && (
                    <Tooltip
                      title={`Delete ${isUser ? "message" : "response"}`}
                      placement="top"
                    >
                      <span>
                        <IconButton
                          size="small"
                          className="claude-message-control"
                          onClick={() => onDeleteMessage?.(msg)}
                          disabled={!canDeleteMessage || disableDelete}
                          aria-label={`Delete ${isUser ? "message" : "response"}`}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </Box>

            <Box className="claude-message-content">
              {msg.isError ? (
                <Typography variant="body2" className="claude-error-text">
                  {msg.error || "Something went wrong."}
                </Typography>
              ) : (
                <Typography
                  component="div"
                  variant="body1"
                  className="claude-message-text"
                >
                  {

                  {showPlaceholder ? (
                    <span className="claude-thinking-wrapper">
                      <span className="claude-thinking-dots">
                        <span />
                        <span />
                        <span />
                      </span>
                      Assistant is thinking...
                    </span>
                  ) : (
                    <>
                      {!isUser && (
                        <div className="claude-response-meta">
                          <span
                            className={`claude-response-chip ${providerClass}`}
                          >
                            {providerLabel}
                          </span>
                          {msg.status_message && (
                            <span className="claude-routing-note">
                              {msg.status_message}
                            </span>
                          )}
                        </div>
                      )}
                      {allowReasoning &&
                        (reasoningSegmentElements.length > 0 ? (
                          <>{reasoningSegmentElements}</>
                        ) : shouldShowAggregatedReasoning ? (
                          <details
                            key={`${msg.id}-${msg.isStreaming ? "open" : "closed"}`}
                            className={`claude-reasoning-block${msg.isStreaming ? " claude-reasoning-block--live" : ""}`}
                            open={msg.isStreaming ? true : undefined}
                          >
                            <summary className="claude-reasoning-header">
                              <span className="claude-reasoning-indicator" />
                              <span className="claude-reasoning-title">
                                Reasoning
                              </span>
                              {reasoningPreview && (
                                <span className="claude-reasoning-preview">
                                  {reasoningPreview}
                                </span>
                              )}
                            </summary>
                            <div
                              className="claude-reasoning-content"
                              ref={(node) => {
                                if (node && msg.isStreaming) {
                                  node.scrollTop = node.scrollHeight;
                                }
                              }}
                            >
                              {renderMarkdownSafely(
                                normalizedReasoning,
                                `reasoning:${msg.id}`,
                              )}
                            </div>
                          </details>
                        ) : null)}
                      {normalizedAnswer && !hideAnswerForReasoningMode && (
                        <div className="claude-message-markdown">
                          {renderMarkdownSafely(
                            normalizedAnswer,
                            `answer:${msg.id}`,
                          )}
                        </div>
                      )}
                      {!isUser && (
                        <div className="claude-message-footer">
                          {canCopyMessage && (
                            <button
                              type="button"
                              className="claude-message-action"
                              onClick={() =>
                                copyMessageText(copyableText, msg.id)
                              }
                              disabled={Boolean(msg.isStreaming)}
                            >
                              {isCopied ? "Copied!" : "Copy"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="claude-message-action"
                            onClick={handleMessageRegenerate}
                            disabled={!canRegenerate || disableRegenerate}
                          >
                            Regenerate
                          </button>
                          {metricChips.length > 0 && (
                            <div className="claude-message-metrics">
                              {metricChips.map((chip) => (
                                <span
                                  key={chip.key}
                                  className={`claude-metric-chip claude-metric-chip--${chip.type || "default"}`}
                                >
                                  <span className="claude-metric-label">
                                    {chip.label}
                                  </span>
                                  <span className="claude-metric-value">
                                    {chip.value}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                          {msg.wasStopped && !msg.isError && (
                            <span className="claude-message-status stopped">
                              Generation stopped
                            </span>
                          )}
                          {usageCaption && (
                            <span
                              className="claude-message-usage"
                              title={usageCaption}
                            >
                              {usageCaption}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
      <div ref={messagesEndRef} />
    </Box>
  );
}, areMessageListPropsEqual);

MessageList.displayName = "MessageList";

const Chat = () => {
  const [message, setMessage] = useState("");
  const deferredMessage = useDeferredValue(message);
  const [mode, setMode] = useState("fast");
  const [effortAnchorEl, setEffortAnchorEl] = useState(null);
  const [shareAnchorEl, setShareAnchorEl] = useState(null);
  const [shareState, setShareState] = useState({
    loading: false,
    data: null,
    error: null,
  });
  const [shareSaving, setShareSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const messagesEndRef = useRef(null);
  const authContext = useAuth();
  const user = authContext?.user || null;
  const token = authContext?.token || null;

  const {
    attachments,
    attachmentError,
    fileInputRef,
    handleAttachmentButtonClick,
    handleAttachmentChange,
    handleRemoveAttachment,
    clearAttachments,
    setAttachmentError,
    setAttachments,
  } = useAttachments({ token });
  const {
    editingState,
    editingPreview,
    setEditingState,
    handleEditMessage: editMessageHook,
    handleCancelEdit: cancelEditHook,
  } = useMessageEditing();

  const {
    activeChat,
    sendMessage,
    regenerateMessage,
    deleteMessage,
    cancelStreaming,
    isSending,
    lastError,
    clearError,
  } = useChat();

  // Note: Optimistic message handling is now done in ChatContext via pendingMessages
  // No need for duplicate state here

  const activeChatId = activeChat?.id ?? null;

  useEffect(() => {
    if (!token || !activeChatId) {
      setShareState({ loading: false, data: null, error: null });
      return;
    }
    let ignore = false;
    setShareState((prev) => ({ ...prev, loading: true, error: null }));
    fetchChatShareSettings(activeChatId)
      .then((response) => {
        if (!ignore) {
          setShareState({ loading: false, data: response, error: null });
        }
      })
      .catch((err) => {
        if (ignore) {
          return;
        }
        if (err?.status === 404) {
          setShareState({ loading: false, data: null, error: null });
        } else {
          setShareState({
            loading: false,
            data: null,
            error: err.message || "Failed to load share settings",
          });
        }
      });
    return () => {
      ignore = true;
    };
  }, [token, activeChatId]);

  const shareUrl = useMemo(() => {
    const slug = shareState.data?.slug;
    if (!slug) {
      return "";
    }
    if (typeof window === "undefined") {
      return `/share/${slug}`;
    }
    try {
      return new URL(`/share/${slug}`, window.location.origin).href;
    } catch {
      return `/share/${slug}`;
    }
  }, [shareState.data?.slug]);

  const canShare = Boolean(activeChatId);

  const handleOpenShareMenu = useCallback((event) => {
    setShareAnchorEl(event.currentTarget);
    setShareCopied(false);
  }, []);

  const handleCloseShareMenu = useCallback(() => {
    setShareAnchorEl(null);
  }, []);

  const ensureShareRecord = useCallback(async () => {
    if (!activeChatId) {
      throw new Error("Open a chat to share");
    }
    if (shareState.data) {
      return shareState.data;
    }
    const response = await upsertChatShare(activeChatId, "private");
    setShareState({ loading: false, data: response, error: null });
    return response;
  }, [token, activeChatId, shareState.data]);

  const handleGenerateShare = useCallback(async () => {
    if (!canShare) {
      setShareState((prev) => ({ ...prev, error: "Open a chat to share" }));
      return;
    }
    setShareSaving(true);
    try {
      await ensureShareRecord();
      setShareCopied(false);
    } catch (err) {
      setShareState((prev) => ({
        ...prev,
        error: err.message || "Failed to create share link",
      }));
    } finally {
      setShareSaving(false);
    }
  }, [canShare, ensureShareRecord]);

  const handleShareVisibilityChange = useCallback(
    async (event) => {
      if (!canShare) {
        setShareState((prev) => ({ ...prev, error: "Open a chat to share" }));
        return;
      }
      const nextVisibility = event.target.checked ? "public" : "private";
      setShareSaving(true);
      try {
        const record = await ensureShareRecord();
        if (!activeChatId) {
          setShareState({
            loading: false,
            data: { ...record, visibility: nextVisibility },
            error: null,
          });
          return;
        }
        const response = await upsertChatShare(activeChatId, nextVisibility);
        setShareState({ loading: false, data: response, error: null });
      } catch (err) {
        setShareState((prev) => ({
          ...prev,
          error: err.message || "Failed to update share link",
        }));
      } finally {
        setShareSaving(false);
      }
    },
    [activeChatId, canShare, ensureShareRecord, token],
  );

  const handleCopyShareLink = useCallback(async () => {
    try {
      const record = await ensureShareRecord();
      const link = shareUrl || `/share/${record.slug}`;
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = link;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setShareCopied(true);
    } catch (err) {
      setShareState((prev) => ({
        ...prev,
        error: err.message || "Failed to copy link",
      }));
    }
  }, [ensureShareRecord, shareUrl]);

  const dismissShareError = useCallback(() => {
    setShareState((prev) => ({ ...prev, error: null }));
  }, []);
  // Messages now come directly from activeChat which includes pending/optimistic messages
  const messages = Array.isArray(activeChat?.messages)
    ? activeChat.messages
    : [];
  const messagesSignature = messages
    .map((msg) => buildMessageSignature(msg))
    .join("|");

  const conversationEntries = useMemo(
    () => prepareConversationMessages(messages),
    [messages, messagesSignature],
  );
  const contextTokenCount = useMemo(
    () =>
      Math.max(
        0,
        Math.round(estimateContextTokens(conversationEntries, deferredMessage)),
      ),
    [conversationEntries, deferredMessage],
  );

  const currentMode = useMemo(
    () =>
      MODE_OPTIONS.find((option) => option.value === mode) || MODE_OPTIONS[0],
    [mode],
  );
  const ModeIcon = currentMode?.Icon || AutoAwesomeRoundedIcon;

  const quotaStatusByMode = useMemo(() => {
    const planQuota = user?.plan?.daily_quota || {};
    const status = {};
    MODE_OPTIONS.forEach((option) => {
      const rawLimit = planQuota?.[option.value];
      const limit =
        typeof rawLimit === "number" && Number.isFinite(rawLimit)
          ? Math.max(0, rawLimit)
          : null;
      status[option.value] = {
        limit,
        remaining: limit,
        used: limit !== null ? 0 : null,
        strict:
          typeof planQuota?.strict === "boolean" ? planQuota.strict : null,
        covered: null,
        counted: null,
        updatedAt: null,
      };
    });

    messages.forEach((msg) => {
      const quotaPayload = msg?.usage?.daily_quota;
      if (!quotaPayload || typeof quotaPayload !== "object") {
        return;
      }
      const modeKey = quotaPayload.mode;
      if (!modeKey || typeof modeKey !== "string") {
        return;
      }
      const entry = status[modeKey] || {
        limit: null,
        remaining: null,
        used: null,
        strict: null,
        covered: null,
        counted: null,
        updatedAt: null,
      };
      if (
        typeof quotaPayload.limit === "number" &&
        Number.isFinite(quotaPayload.limit)
      ) {
        entry.limit = Math.max(0, quotaPayload.limit);
      }
      if (
        typeof quotaPayload.remaining === "number" &&
        Number.isFinite(quotaPayload.remaining)
      ) {
        entry.remaining = Math.max(0, quotaPayload.remaining);
      } else if (quotaPayload.remaining === null) {
        entry.remaining = null;
      }
      if (typeof quotaPayload.covered === "boolean") {
        entry.covered = quotaPayload.covered;
      }
      if (typeof quotaPayload.strict === "boolean") {
        entry.strict = quotaPayload.strict;
      }
      if (typeof quotaPayload.counted === "boolean") {
        entry.counted = quotaPayload.counted;
      }
      entry.updatedAt = msg?.updated_at || msg?.created_at || entry.updatedAt;
      status[modeKey] = entry;
    });

    Object.values(status).forEach((entry) => {
      if (
        typeof entry.limit === "number" &&
        typeof entry.remaining === "number"
      ) {
        const remaining = Math.max(0, entry.remaining);
        entry.remaining = remaining;
        entry.used = Math.max(0, entry.limit - remaining);
      } else {
        entry.used = null;
      }
    });

    return status;
  }, [messages, user]);

  const hasStreamingMessage = useMemo(
    () => messages.some((msg) => msg.isStreaming),
    [messages],
  );

  // Note: Optimistic message handling removed - now handled by ChatContext.pendingMessages

  const inputStatusText = editingState
    ? "Enter to update (Esc to cancel)"
    : hasStreamingMessage
      ? "Streaming response…"
      : isSending
        ? "Sending…"
        : "Press Enter to send / Shift + Enter for newline";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!attachmentError) {
      return;
    }
    const pending = attachments.some((item) => item.status === "loading");
    const hasErrors = attachments.some((item) => item.status === "error");
    const hasReady = attachments.some((item) => item.status === "ready");
    if (!pending && !hasErrors && (message.trim() || hasReady)) {
      setAttachmentError(null);
    }
  }, [attachments, message, attachmentError, setAttachmentError]);

  const handleSendMessage = async () => {
    const trimmed = message.trim();
    const readyAttachments = attachments.filter(
      (item) => item.status === "ready",
    );
    const hasPendingAttachments = attachments.some(
      (item) => item.status === "loading",
    );
    const hasFailedAttachments = attachments.some(
      (item) => item.status === "error",
    );

    if (hasPendingAttachments) {
      setAttachmentError(
        "Please wait for your attachments to finish processing.",
      );
      return;
    }

    if (hasFailedAttachments) {
      setAttachmentError("Remove files that failed to process before sending.");
      return;
    }

    if (!trimmed && readyAttachments.length === 0) {
      setAttachmentError("Add a message or attach a file before sending.");
      return;
    }

    const resolveAttachmentUrl = (path) => {
      if (!path) {
        return null;
      }
      if (/^https?:\/\//i.test(path)) {
        return path;
      }
      if (typeof window === "undefined") {
        return path;
      }
      return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
    };

    const attachmentSegments = readyAttachments.map((item) => {
      const header = `Attachment: ${item.name || "untitled"} (${formatFileSize(
        item.size ?? 0,
      )}${item.isText ? "" : ", binary"})`;
      if (item.isText && item.content) {
        return `${header}\n\n\`\`\`\n${item.content}\n\`\`\``;
      }
      const segments = [header];
      const remoteLink = resolveAttachmentUrl(item.remoteUrl);
      if (remoteLink) {
        segments.push(`Download URL: ${remoteLink}`);
      }
      if (item.analysis?.summary) {
        segments.push(`AI summary: ${item.analysis.summary}`);
      }
      if (item.preview?.kind === "text" && item.preview.text) {
        segments.push(`Excerpt:\n${item.preview.text}`);
      }
      return segments.join("\n\n");
    });

    const attachmentPayloads = readyAttachments.map((item) => ({
      id: item.remoteId || item.id,
      name: item.name || null,
      content_type: item.type || item.contentType || null,
      size_bytes: item.size ?? item.sizeBytes ?? null,
      is_text: Boolean(item.isText),
      text_content: item.isText
        ? (item.content ?? item.textContent ?? null)
        : null,
      truncated: Boolean(item.truncated),
      download_url: item.download_url || item.remoteUrl || item.url || null,
      data_url: item.data_url || item.dataUrl || null,
      storage_key: item.storageKey || null,
      analysis_summary: item.analysis?.summary || null,
      preview_text: item.preview?.text || null,
    }));

    const promptPieces = [];
    if (trimmed) {
      promptPieces.push(trimmed);
    }
    if (attachmentSegments.length) {
      promptPieces.push(attachmentSegments.join("\n\n"));
    }
    const promptForSend = promptPieces.join("\n\n");

    const editingTarget = editingState;
    const options = {};
    if (activeChatId) {
      options.chatId = activeChatId;
    }
    if (editingTarget?.messageId) {
      options.editingMessageId = editingTarget.messageId;
    }
    if (attachmentPayloads.length > 0) {
      options.attachments = attachmentPayloads;
    }

    // Note: Optimistic message handling is now done in ChatContext.sendMessage
    // via pendingMessages state - no need to handle it here

    const attachmentsSnapshot = attachments.map((item) => ({ ...item }));

    try {
      const sendResult = await sendMessage(promptForSend, mode, options);
      setAttachmentError(null);
      setMessage("");
      clearAttachments();
      if (editingTarget) {
        setEditingState(null);
      }
    } catch (err) {
      console.error("send message failed", err);
      setMessage(trimmed);
      if (attachmentsSnapshot.length) {
        setAttachments(attachmentsSnapshot);
      }
      if (editingTarget) {
        setEditingState(editingTarget);
      }
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const isEffortOpen = Boolean(effortAnchorEl);

  const handleReasoningButtonClick = (event) => {
    if (isEffortOpen && effortAnchorEl === event.currentTarget) {
      setEffortAnchorEl(null);
      return;
    }
    setEffortAnchorEl(event.currentTarget);
  };

  const handleEffortClose = () => {
    setEffortAnchorEl(null);
  };

  const handleSelectReasoningMode = (value) => {
    setMode(value);
    setEffortAnchorEl(null);
  };

  const handleEditMessage = useCallback(
    (msg) => {
      const nextMode = editMessageHook(msg, mode, activeChatId);
      if (nextMode && nextMode !== mode) {
        setMode(nextMode);
      }
      if (msg && msg.role === "user") {
        setMessage(msg.text || msg.content || "");
      }
    },
    [editMessageHook, mode, activeChatId],
  );

  const handleCancelEdit = useCallback(() => {
    cancelEditHook();
    setMessage("");
    clearAttachments();
    setAttachmentError(null);
  }, [cancelEditHook, clearAttachments, setAttachmentError]);

  const editingMessageId = editingState?.messageId;

  const handleDeleteMessage = useCallback(
    (msg) => {
      if (!activeChatId || !msg || !msg.id) {
        return;
      }
      const confirmation =
        msg.role === "user"
          ? "Delete this question and its responses?"
          : "Delete this response?";
      const confirmed =
        typeof window !== "undefined" ? window.confirm(confirmation) : true;
      if (!confirmed) {
        return;
      }
      deleteMessage(activeChatId, msg.id);
      if (editingMessageId === msg.id) {
        handleCancelEdit();
      }
    },
    [activeChatId, deleteMessage, editingMessageId, handleCancelEdit],
  );

  const inputPlaceholder = editingState
    ? "Update your question…"
    : "Ask anything...";
  const sendButtonLabel = editingState ? "Update" : "Send";
  const trimmedMessageValue = message.trim();
  const readyAttachmentCount = attachments.filter(
    (item) => item.status === "ready",
  ).length;
  const hasPendingAttachments = attachments.some(
    (item) => item.status === "loading",
  );
  const hasAttachmentErrors = attachments.some(
    (item) => item.status === "error",
  );
  const maxAttachmentsReached = attachments.length >= MAX_ATTACHMENTS;
  const canSend = trimmedMessageValue.length > 0 || readyAttachmentCount > 0;
  const disableSendButton =
    isSending || hasPendingAttachments || hasAttachmentErrors || !canSend;
  const sendTooltip = hasPendingAttachments
    ? "Attachments are still processing"
    : hasAttachmentErrors
      ? "Remove files that failed to process"
      : !canSend
        ? "Add a message or attach a file"
        : "Send message";
  const attachTooltip = maxAttachmentsReached
    ? `Attachment limit reached (${MAX_ATTACHMENTS})`
    : "Attach files";

  return (
    <Box className="claude-chat-container">
      <Box className="claude-messages-container" data-header-scroll="true">
        <MessageList
          messages={messages}
          messagesSignature={messagesSignature}
          editingState={editingState}
          isSending={isSending}
          activeChatId={activeChatId}
          regenerateMessage={regenerateMessage}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
          messagesEndRef={messagesEndRef}
          user={user}
        />
      </Box>

      <Box className="claude-input-container">
        {editingState && (
          <Box className="claude-editing-banner">
            <Typography variant="body2" className="claude-editing-text">
              Editing your message
              {editingPreview && (
                <span className="claude-editing-preview">
                  “{editingPreview}”
                </span>
              )}
            </Typography>
            <Button
              size="small"
              onClick={handleCancelEdit}
              className="claude-cancel-edit-btn"
            >
              Cancel
            </Button>
          </Box>
        )}
        <Paper className="claude-input-wrapper" elevation={0}>
          <Box className="claude-input-shell">
            <Box className="claude-input-header">
              <Box className="claude-input-chip-row">
                <span className="claude-input-chip claude-input-chip--mode">
                  <ModeIcon
                    fontSize="small"
                    className="claude-input-chip-icon"
                  />
                  <span>{currentMode.label}</span>
                </span>
                <span className="claude-input-chip claude-input-chip--context">
                  <TravelExploreRoundedIcon
                    fontSize="small"
                    className="claude-input-chip-icon"
                  />
                  <span>{contextTokenCount.toLocaleString()} ctx</span>
                </span>
                <Tooltip
                  title={
                    canShare
                      ? "Share this conversation"
                      : "Sign in to share conversations"
                  }
                >
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ShareOutlinedIcon fontSize="small" />}
                      onClick={handleOpenShareMenu}
                      disabled={!canShare}
                      sx={{
                        textTransform: "none",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        lineHeight: 1,
                        paddingX: 1.5,
                        paddingY: 0.25,
                        height: 28,
                      }}
                    >
                      Share
                    </Button>
                  </span>
                </Tooltip>
              </Box>
              <Typography variant="caption" className="claude-input-hint">
                {inputStatusText}
              </Typography>
            </Box>
            <Box className="claude-input-editor">
              <Box className="claude-input-main">
                <TextField
                  id="chat-message-input"
                  name="chat-message"
                  multiline
                  minRows={1}
                  placeholder={inputPlaceholder}
                  value={message}
                  onChange={(event) => {
                    if (lastError) {
                      clearError();
                    }
                    setMessage(event.target.value);
                  }}
                  onKeyPress={handleKeyPress}
                  className="claude-input-field"
                  variant="standard"
                  fullWidth
                  InputProps={{
                    disableUnderline: true,
                    style: {
                      fontSize: "12px",
                      lineHeight: "1.25",
                      padding: "6px 10px",
                    },
                  }}
                />
                {attachments.length > 0 && (
                  <Box className="claude-attachments">
                    {attachments.map((item) => {
                      const baseLabel = `${item.name} (${formatFileSize(item.size ?? 0)})`;
                      let statusLabel = "";
                      if (item.status === "loading") {
                        statusLabel = " processing…";
                      } else if (item.status === "error") {
                        statusLabel = " failed";
                      } else if (!item.isText) {
                        statusLabel = " binary";
                      } else if (item.truncated) {
                        statusLabel = " truncated";
                      }
                      const chipClassParts = [
                        "claude-attachment-chip",
                        item.status,
                        item.isText ? "text" : "binary",
                      ];
                      if (item.truncated) {
                        chipClassParts.push("truncated");
                      }
                      const chipClassName = chipClassParts
                        .filter(Boolean)
                        .join(" ");
                      const titleText =
                        item.error ||
                        (item.isText
                          ? item.truncated
                            ? "Text file included (truncated to keep the prompt manageable)"
                            : "Text file included in your prompt"
                          : "Binary file metadata shared—content not automatically inlined");
                      return (
                        <Chip
                          key={item.id}
                          label={`${baseLabel}${statusLabel}`}
                          className={chipClassName}
                          onDelete={() => handleRemoveAttachment(item.id)}
                          variant="outlined"
                          size="small"
                          title={titleText}
                        />
                      );
                    })}
                  </Box>
                )}
                {attachmentError && (
                  <Typography
                    variant="caption"
                    className="claude-attachment-error"
                  >
                    {attachmentError}
                  </Typography>
                )}
              </Box>
              <Box className="claude-input-actions">
                <Tooltip title={attachTooltip} placement="top">
                  <span>
                    <IconButton
                      size="small"
                      className="claude-attach-btn"
                      disableRipple
                      onClick={handleAttachmentButtonClick}
                      disabled={maxAttachmentsReached}
                      aria-label={attachTooltip}
                    >
                      <AttachFileIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleAttachmentChange}
                />
                <span className="claude-input-divider" aria-hidden="true" />
                <Button
                  type="button"
                  className="claude-reasoning-selector active"
                  onClick={handleReasoningButtonClick}
                  endIcon={<ExpandMoreIcon fontSize="small" />}
                  aria-expanded={isEffortOpen}
                >
                  <span className="claude-selector-text">
                    <span className="claude-selector-title">Mode</span>
                    <span className="claude-selector-mode">
                      {currentMode.label}
                    </span>
                  </span>
                </Button>
                <Popover
                  open={isEffortOpen}
                  anchorEl={effortAnchorEl}
                  onClose={handleEffortClose}
                  anchorOrigin={{ vertical: "top", horizontal: "center" }}
                  transformOrigin={{ vertical: "bottom", horizontal: "center" }}
                  PaperProps={{
                    sx: { backgroundColor: "transparent", boxShadow: "none" },
                  }}
                >
                  <Box className="claude-effort-panel">
                    <Box className="claude-effort-panel-header">
                      <div>
                        <span className="claude-effort-panel-title">
                          CHOOSE MODE
                        </span>
                        <span className="claude-effort-panel-subtitle">
                          Pick Lite for speed or Pro for maximum reasoning depth.
                        </span>
                      </div>
                    </Box>
                    <Divider className="claude-effort-divider" />
                    <Box className="claude-effort-options">
                      {MODE_OPTIONS.map((option) => {
                        const OptionIcon = option.Icon;
                        const optionClassName = [
                          "claude-effort-option",
                          option.value === mode ? "active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");
                        const quotaStatus =
                          quotaStatusByMode[option.value] || null;
                        const limit =
                          quotaStatus && typeof quotaStatus.limit === "number"
                            ? Math.max(0, Math.floor(quotaStatus.limit))
                            : null;
                        const remaining =
                          quotaStatus &&
                          typeof quotaStatus.remaining === "number"
                            ? Math.max(0, Math.floor(quotaStatus.remaining))
                            : null;
                        const strict =
                          quotaStatus && typeof quotaStatus.strict === "boolean"
                            ? quotaStatus.strict
                            : null;
                        const covered =
                          quotaStatus &&
                          typeof quotaStatus.covered === "boolean"
                            ? quotaStatus.covered
                            : null;
                        const counted =
                          quotaStatus &&
                          typeof quotaStatus.counted === "boolean"
                            ? quotaStatus.counted
                            : null;

                        const quotaPrimaryClasses = [
                          "claude-effort-option-quota",
                        ];
                        let quotaPrimaryText = "";
                        if (!user) {
                          quotaPrimaryText = "Login to view quota";
                        } else if (limit !== null) {
                          if (remaining !== null) {
                            quotaPrimaryText = `${remaining} of ${limit} left today`;
                            if (remaining <= 0 && limit > 0) {
                              quotaPrimaryClasses.push("depleted");
                            }
                          } else {
                            quotaPrimaryText = `${limit} per day`;
                          }
                        } else if (strict === false) {
                          quotaPrimaryText = "No daily cap";
                          quotaPrimaryClasses.push("unlimited");
                        } else if (user) {
                          quotaPrimaryText = "Quota unavailable";
                        }

                        const quotaNoteClasses = [
                          "claude-effort-option-quota-note",
                        ];
                        let quotaNoteText = "";
                        if (covered === false) {
                          quotaNoteText = "Over daily quota";
                          quotaNoteClasses.push("over");
                        } else if (counted === false) {
                          quotaNoteText = "Last call skipped quota";
                          quotaNoteClasses.push("skipped");
                        }

                        return (
                          <button
                            type="button"
                            key={option.value}
                            className={optionClassName}
                            onClick={() =>
                              handleSelectReasoningMode(option.value)
                            }
                            style={{ "--effort-accent": option.accent }}
                          >
                            <span className="claude-effort-option-icon">
                              <OptionIcon sx={{ fontSize: 20 }} />
                            </span>
                            <span className="claude-effort-option-body">
                              <span className="claude-effort-option-label">
                                {option.label}
                              </span>
                              <span className="claude-effort-option-desc">
                                {option.description}
                              </span>
                              {quotaPrimaryText ? (
                                <span className={quotaPrimaryClasses.join(" ")}>
                                  {quotaPrimaryText}
                                </span>
                              ) : null}
                              {quotaNoteText ? (
                                <span className={quotaNoteClasses.join(" ")}>
                                  {quotaNoteText}
                                </span>
                              ) : null}
                            </span>
                            {option.value === mode && (
                              <span className="claude-effort-option-check">
                                <CheckCircleRoundedIcon fontSize="small" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </Box>
                    <Divider className="claude-effort-divider" />
                    <Box className="claude-effort-footer">
                      Lite is optimized for speed. Pro is optimized for
                      thorough, high-accuracy reasoning.
                    </Box>
                  </Box>
                </Popover>
                <Popover
                  open={Boolean(shareAnchorEl)}
                  anchorEl={shareAnchorEl}
                  onClose={handleCloseShareMenu}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  PaperProps={{ sx: { width: 340, p: 2 } }}
                >
                  {shareState.error && (
                    <Alert
                      severity="error"
                      sx={{ mb: 1 }}
                      onClose={dismissShareError}
                    >
                      {shareState.error}
                    </Alert>
                  )}
                  <Typography
                    variant="subtitle1"
                    sx={{ fontSize: "1rem", mb: 1 }}
                  >
                    Share conversation
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.72, mb: 2 }}>
                    Public links appear in the sitemap. Private links are only
                    visible to signed-in Shannon users.
                  </Typography>
                  {shareState.data ? (
                    <>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={shareState.data.visibility === "public"}
                            onChange={handleShareVisibilityChange}
                            disabled={shareSaving}
                            color="secondary"
                          />
                        }
                        label="Public link"
                      />
                      <TextField
                        value={shareUrl}
                        size="small"
                        fullWidth
                        InputProps={{ readOnly: true }}
                        sx={{ mt: 1 }}
                      />
                      <Button
                        variant="outlined"
                        startIcon={<ContentCopyIcon />}
                        onClick={handleCopyShareLink}
                        disabled={shareSaving || !shareUrl}
                        sx={{ mt: 1 }}
                      >
                        {shareCopied ? "Copied!" : "Copy link"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      startIcon={<ShareOutlinedIcon />}
                      onClick={handleGenerateShare}
                      disabled={shareSaving || !canShare}
                    >
                      Generate private link
                    </Button>
                  )}
                </Popover>
                <span className="claude-input-divider" aria-hidden="true" />
                {hasStreamingMessage ? (
                  <Tooltip title="Stop generation" placement="top">
                    <Button
                      type="button"
                      variant="outlined"
                      className="claude-stop-btn"
                      onClick={cancelStreaming}
                      size="small"
                      disableRipple
                      startIcon={<StopCircleOutlinedIcon fontSize="small" />}
                    >
                      Stop
                    </Button>
                  </Tooltip>
                ) : (
                  <Tooltip title={sendTooltip} placement="top">
                    <span>
                      <Button
                        variant="contained"
                        className="claude-send-btn"
                        onClick={handleSendMessage}
                        disabled={disableSendButton}
                        size="small"
                        disableRipple
                        endIcon={<SendIcon fontSize="small" />}
                      >
                        {isSending ? "Sending…" : sendButtonLabel}
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>
        {lastError && (
          <Box
            className="error-banner"
            sx={{ marginTop: "6px", padding: "6px 8px", fontSize: "13px" }}
          >
            <Typography variant="body2" sx={{ flex: 1, fontSize: "13px" }}>
              {lastError}
            </Typography>
            <Button
              size="small"
              onClick={clearError}
              color="inherit"
              sx={{ fontSize: "12px", minWidth: "auto", padding: "2px 6px" }}
            >
              ×
            </Button>
          </Box>
        )}
      </Box>
      <GlassFilter />
    </Box>
  );
};

export default Chat;
