import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Chip,
  Alert,
  Tooltip,
  Button,
  Popover,
  Switch,
  FormControlLabel,
  TextField,
  CircularProgress,
  Slider,
  Divider,
} from "@mui/material";
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  ShareOutlined as ShareOutlinedIcon,
  ContentCopy as ContentCopyIcon,
  MemoryOutlined as MemoryIcon,
  PsychologyAlt as BrainIcon,
  Folder as FolderIcon,
  Close as CloseIcon,
  InsertDriveFile as FileIcon,
  Description as InstructionsIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Bolt as BoltIcon,
  RocketLaunch as RocketIcon,
  AutoAwesome as SparkleIcon,
  Lock as LockIcon,
} from "@mui/icons-material";

import type { ChatComponentProps, Message, Attachment } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useCustomShan } from "@/hooks/useCustomShan";
import { useProject } from "@/hooks/useProject";
import { useAttachments } from "@/hooks/useAttachments";
import { useMessageEditing } from "@/hooks/useMessageEditing";
import { formatFileSize, formatChatTitle } from "@/utils/format";
import { fetchChatShareSettings, upsertChatShare } from "@/api/share";
import MessageList from "./MessageList";
import "../Chat.css";

type ShannonMode = "lite16" | "pro16";

type ModeOption = {
  value: ShannonMode;
  label: string;
  multiplier: number;
  thinkingEnabled?: boolean;
  description?: string;
  accent?: string;
  isNew?: boolean;
  ultraThink?: boolean;
  isPremium?: boolean;
  isPreview?: boolean;
};

type ShareVisibility = "public" | "private";

interface ShareRecord {
  slug: string;
  chatId: string;
  visibility: ShareVisibility;
  updatedAt?: string | null;
  createdAt?: string | null;
}

interface ShareState {
  loading: boolean;
  data: ShareRecord | null;
  error: string | null;
}

const MAX_ATTACHMENTS = 10;
const DEFAULT_MODE: ShannonMode = "lite16";

// Primary models - Shannon 1.6 series (new)
const PRIMARY_MODE_OPTIONS: ModeOption[] = [
  {
    value: "lite16",
    label: "Shannon 1.6 Lite",
    description: "Fast responses, no reasoning. Great for quick tasks.",
    multiplier: 0.3,
    thinkingEnabled: false,
    accent: "#10b981",
    isNew: true,
  },
  {
    value: "pro16",
    label: "Shannon 1.6 Pro",
    description: "Ultra-deep thinking in both phases. Maximum power.",
    multiplier: 2.0,
    thinkingEnabled: true,
    ultraThink: true,
    accent: "#8b5cf6",
    isNew: true,
  },
];

// Combined for validation
const MODE_OPTIONS: ModeOption[] = [...PRIMARY_MODE_OPTIONS];

const isValidMode = (value: unknown): value is ShannonMode =>
  typeof value === "string" &&
  MODE_OPTIONS.some((option) => option.value === value);

const MODE_STORAGE_KEY = "shannon:composer-mode";

const getInitialMode = (): ShannonMode => {
  if (typeof window === "undefined") {
    return DEFAULT_MODE;
  }
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (isValidMode(stored)) {
      return stored;
    }
  } catch (err) {
    console.warn("Failed to read stored mode", err);
  }
  return DEFAULT_MODE;
};

const NEAR_BOTTOM_THRESHOLD_PX = 220;

const THINKING_OPEN = "<thinking>";
const THINKING_CLOSE = "</thinking>";

const extractThinking = (input: string) => {
  if (typeof input !== "string") {
    return {
      reasoning: "",
      answer: "",
      hasThinking: false,
      isComplete: false,
    };
  }

  const startMatch = input.match(/<thinking[^>]*>/i);
  if (!startMatch) {
    return {
      reasoning: "",
      answer: input,
      hasThinking: false,
      isComplete: false,
    };
  }

  const startIdx = startMatch.index ?? -1;
  const endMatch = input.match(/<\/thinking>/i);
  const endIdx = endMatch?.index ?? -1;
  const startEnd = startIdx + startMatch[0].length;
  const reasoning =
    endIdx === -1 ? input.slice(startEnd) : input.slice(startEnd, endIdx);
  const trailing =
    endIdx === -1
      ? ""
      : input.slice((endMatch?.index ?? 0) + (endMatch?.[0].length ?? 0));
  const leading = input.slice(0, startIdx);
  const answer = `${leading}${trailing}`.trim();

  return {
    reasoning: reasoning.trim(),
    answer,
    hasThinking: true,
    isComplete: endIdx !== -1,
  };
};

const enhanceMessageWithThinking = (msg: Message): Message => {
  const rawContent = typeof msg.content === "string" ? msg.content : "";
  if ((msg.role || "").toLowerCase() !== "assistant") {
    return { ...msg, rawContent };
  }
  const parsed = extractThinking(rawContent);
  const reasoningFromServer =
    typeof (msg as any).reasoning === "string" ? (msg as any).reasoning : "";
  const reasoningText = reasoningFromServer || parsed.reasoning;
  const thinkingEnabledMeta = Boolean((msg as any)?.metadata?.thinking_enabled);
  const isStreaming = Boolean(msg.isStreaming);
  const allowReasoning = thinkingEnabledMeta;
  const hasExplicitThinking = parsed.hasThinking && !parsed.isComplete;
  const thinkingActive =
    allowReasoning && (isStreaming || hasExplicitThinking);
  const answerText = parsed.hasThinking
    ? parsed.answer || rawContent || reasoningText
    : rawContent || reasoningText;
  const thinkingComplete = allowReasoning
    ? parsed.isComplete || (!isStreaming && Boolean(reasoningText))
    : true;
  const reasoningDisplay = allowReasoning
    ? reasoningText || (parsed.hasThinking ? parsed.reasoning : "")
    : "";
  return {
    ...msg,
    rawContent,
    content: answerText,
    reasoning: reasoningDisplay || null,
    thinkingActive,
    thinkingComplete,
  };
};

const ChatContainer: React.FC<ChatComponentProps> = ({
  chatId: initialChatId,
  onMessageSent,
  onMessageRegenerate,
  onMessageEdit,
  onMessageDelete,
  showSettings = true,
  className = "",
}) => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { activeCustomShan, clearActiveCustomShan } = useCustomShan();
  const { activeProject, activeProjectFiles, clearActiveProject } = useProject();

  // Track previous chatId to detect chat switching and prevent flash
  const prevChatIdRef = useRef<string | null | undefined>(undefined);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [message, setMessage] = useState("");
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [mode, setMode] = useState<ShannonMode>(() => getInitialMode());
  const [shareAnchorEl, setShareAnchorEl] = useState<HTMLElement | null>(null);
  const [shareState, setShareState] = useState<ShareState>({
    loading: false,
    data: null,
    error: null,
  });
  const [shareSaving, setShareSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [memoryAnchorEl, setMemoryAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [modelAnchorEl, setModelAnchorEl] = useState<HTMLElement | null>(null);
  const [thinkingEnabled, setThinkingEnabled] = useState<boolean>(() => {
    const defaultModeConfig = MODE_OPTIONS.find(
      (option) => option.value === getInitialMode(),
    );
    return Boolean(defaultModeConfig?.thinkingEnabled);
  });

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageMetaRef = useRef<{
    id: string;
    isStreaming: boolean;
  } | null>(null);
  const lastThinkingMetaRef = useRef<{
    id: string;
    thinkingActive: boolean;
  } | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const shouldScrollOnFinishRef = useRef(false);
  const isUserNearBottomRef = useRef(true);
  const lastContentHeightRef = useRef(0);

  // Get user's plan slug for plan-based limits (moved before useAttachments)
  const planSlug = useMemo(() => {
    const raw =
      (user?.plan?.slug as string | undefined) ||
      (user?.plan_slug as string | undefined) ||
      (user?.planSlug as string | undefined) ||
      null;
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim().toLowerCase();
    }
    return null;
  }, [user?.plan?.slug, user?.plan_slug, user?.planSlug]);
  const isPaidUser = Boolean(planSlug && planSlug !== "free");

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = messageContainerRef.current;
      if (!container) return;
      const target = messagesEndRef.current;
      const performScroll = () => {
        if (target?.scrollIntoView) {
          target.scrollIntoView({ behavior, block: "end" });
        } else {
          container.scrollTo({ top: container.scrollHeight, behavior });
        }
      };
      if (typeof window !== "undefined" && "requestAnimationFrame" in window) {
        window.requestAnimationFrame(performScroll);
      } else {
        performScroll();
      }
    },
    [],
  );

  const {
    attachments,
    attachmentError: hookAttachmentError,
    fileInputRef,
    handleAttachmentButtonClick,
    handleAttachmentChange,
    handleRemoveAttachment,
    clearAttachments,
    setAttachments,
    maxFileSizeMB,
  } = useAttachments({ token, maxFiles: MAX_ATTACHMENTS, planSlug: planSlug || 'free' });

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
    memoryEnabled,
    setMemoryEnabled,
    memoryReadEnabled,
    setMemoryReadEnabled,
    memoryWriteEnabled,
    setMemoryWriteEnabled,
    memorySizeSetting,
    setMemorySizeSetting,
    userPlanMemoryLimit,
    effectiveMemorySize,
  } = useChat();
  const [hasInitialScroll, setHasInitialScroll] = useState(false);

  const activeChatId = activeChat?.id ?? initialChatId ?? null;
  const messages = useMemo(
    () => (activeChat?.messages ?? []).map(enhanceMessageWithThinking),
    [activeChat?.messages],
  );
  const hasStreamingMessage = useMemo(
    () => messages.some((msg) => msg.isStreaming),
    [messages],
  );
  // Don't show empty state when transitioning between chats or sending to prevent flash
  const isEmptyChat = messages.length === 0 && !isTransitioning && !isSending;

  const currentModeMeta = useMemo(() => {
    return (
      MODE_OPTIONS.find((option) => option.value === mode) ?? MODE_OPTIONS[0]
    );
  }, [mode]);

  useEffect(() => {
    const shouldEnableThinking = Boolean(currentModeMeta.thinkingEnabled);
    setThinkingEnabled((prev) =>
      prev === shouldEnableThinking ? prev : shouldEnableThinking,
    );
  }, [currentModeMeta]);

  const normalizeShareRecord = useCallback(
    (record: unknown): ShareRecord | null => {
      if (!record || typeof record !== "object") {
        return null;
      }
      const source = record as Record<string, any>;
      const slug =
        typeof source.slug === "string" && source.slug.trim()
          ? source.slug.trim()
          : null;
      if (!slug) {
        return null;
      }

      const rawVisibility =
        typeof source.visibility === "string" ? source.visibility : null;
      const visibility: ShareVisibility =
        rawVisibility === "public" ? "public" : "private";

      const chatId =
        (typeof source.chatId === "string" && source.chatId.trim()) ||
        (typeof source.chat_id === "string" && source.chat_id.trim()) ||
        (source.chat &&
          typeof source.chat.id === "string" &&
          source.chat.id.trim()) ||
        activeChatId ||
        "chat-unknown";

      const updatedAtRaw = source.updatedAt || source.updated_at || null;
      const createdAtRaw = source.createdAt || source.created_at || null;

      const updatedAt =
        typeof updatedAtRaw === "string"
          ? updatedAtRaw
          : updatedAtRaw instanceof Date
            ? updatedAtRaw.toISOString()
            : null;
      const createdAt =
        typeof createdAtRaw === "string"
          ? createdAtRaw
          : createdAtRaw instanceof Date
            ? createdAtRaw.toISOString()
            : null;

      return {
        slug,
        visibility,
        chatId,
        updatedAt,
        createdAt,
      };
    },
    [activeChatId],
  );

  const readyAttachments = attachments.filter(
    (item) => item.status === "ready",
  );
  const hasPendingAttachments = attachments.some(
    (item) => item.status === "loading",
  );
  const hasAttachmentErrors = attachments.some(
    (item) => item.status === "error",
  );
  const trimmedMessage = message.trim();
  const canSend = trimmedMessage.length > 0 || readyAttachments.length > 0;
  const disableSendButton =
    isSending || hasPendingAttachments || hasAttachmentErrors || !canSend;

  const adjustComposerHeight = useCallback(
    (textarea: HTMLTextAreaElement | null) => {
      if (!textarea) return;
      textarea.style.height = "auto";
      const next = Math.min(textarea.scrollHeight, 240);
      textarea.style.height = `${next}px`;
    },
    [],
  );

  useEffect(() => {
    adjustComposerHeight(composerRef.current);
  }, [message, editingState, adjustComposerHeight]);

  useEffect(() => {
    if (!token || !activeChatId) {
      setShareState({ loading: false, data: null, error: null });
      return;
    }
    let ignore = false;
    setShareState((prev) => ({ ...prev, loading: true, error: null }));
    fetchChatShareSettings(activeChatId)
      .then((response) => {
        if (ignore) return;
        const normalized = normalizeShareRecord(response);
        if (normalized) {
          setShareState({ loading: false, data: normalized, error: null });
        } else {
          setShareState({ loading: false, data: null, error: null });
        }
      })
      .catch((err: unknown) => {
        if (ignore) return;
        const messageText =
          err instanceof Error ? err.message : "Failed to load share settings";
        setShareState({
          loading: false,
          data: null,
          error: messageText,
        });
      });
    return () => {
      ignore = true;
    };
  }, [token, activeChatId, normalizeShareRecord]);

  useEffect(() => {
    if (hookAttachmentError) {
      setAttachmentError(hookAttachmentError);
    }
  }, [hookAttachmentError]);

  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) return undefined;

    const updateNearBottom = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      isUserNearBottomRef.current =
        distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
    };

    updateNearBottom();
    lastContentHeightRef.current = container.scrollHeight;
    container.addEventListener("scroll", updateNearBottom, { passive: true });
    return () => {
      container.removeEventListener("scroll", updateNearBottom);
    };
  }, [activeChatId, isEmptyChat]);

  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) return;

    if (!hasInitialScroll && messages.length > 0) {
      scrollToBottom("auto");
      setHasInitialScroll(true);
    }
  }, [messages.length, hasInitialScroll, scrollToBottom]);

  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) return;

    const currentHeight = container.scrollHeight;
    if (
      hasStreamingMessage &&
      isUserNearBottomRef.current &&
      currentHeight > lastContentHeightRef.current
    ) {
      container.scrollTo({ top: currentHeight, behavior: "smooth" });
    }
    lastContentHeightRef.current = currentHeight;
  }, [messages, hasStreamingMessage]);

  useEffect(() => {
    if (messages.length === 0) {
      lastUserMessageRef.current = null;
      return;
    }
    let lastUserMessage: Message | null = null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "user") {
        lastUserMessage = messages[i];
        break;
      }
    }
    if (!lastUserMessage) {
      lastUserMessageRef.current = null;
      return;
    }
    if (lastUserMessageRef.current !== lastUserMessage.id) {
      lastUserMessageRef.current = lastUserMessage.id;
      scrollToBottom("smooth");
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (messages.length === 0) {
      lastThinkingMetaRef.current = null;
      return;
    }
    const lastAssistant = [...messages].reverse().find((msg) => msg.role === "assistant");
    if (!lastAssistant) {
      lastThinkingMetaRef.current = null;
      return;
    }
    const thinkingActive = Boolean((lastAssistant as Message & { thinkingActive?: boolean }).thinkingActive);
    const previous = lastThinkingMetaRef.current;
    const startedThinking =
      thinkingActive
      && (!previous || previous.id !== lastAssistant.id || !previous.thinkingActive);
    if (startedThinking) {
      scrollToBottom("smooth");
    }
    lastThinkingMetaRef.current = { id: lastAssistant.id, thinkingActive };
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (messages.length === 0) {
      lastMessageMetaRef.current = null;
      lastContentHeightRef.current = 0;
      return;
    }

    const container = messageContainerRef.current;
    const lastMessage = messages[messages.length - 1];
    const previous = lastMessageMetaRef.current;
    const finishedStreaming =
      previous &&
      previous.id === lastMessage.id &&
      previous.isStreaming &&
      !lastMessage.isStreaming;
    const isNewMessage = !previous || previous.id !== lastMessage.id;
    const isAssistantMessage = lastMessage.role === "assistant";
    const isUserMessage = lastMessage.role === "user";

    if (container && finishedStreaming && isAssistantMessage) {
      scrollToBottom("smooth");
      shouldScrollOnFinishRef.current = false;
    } else if (container && isNewMessage && isUserMessage) {
      scrollToBottom("smooth");
      shouldScrollOnFinishRef.current = false;
    } else if (
      container &&
      isNewMessage &&
      !lastMessage.isStreaming &&
      shouldScrollOnFinishRef.current
    ) {
      scrollToBottom("smooth");
      shouldScrollOnFinishRef.current = false;
    }

    lastMessageMetaRef.current = {
      id: lastMessage.id,
      isStreaming: Boolean(lastMessage.isStreaming),
    };
  }, [messages, scrollToBottom]);

  useEffect(() => {
    setHasInitialScroll(false);
    lastMessageMetaRef.current = null;
    lastThinkingMetaRef.current = null;
    shouldScrollOnFinishRef.current = true;
    lastContentHeightRef.current = 0;

    // Track chat switching to prevent empty state flash
    if (prevChatIdRef.current !== undefined && prevChatIdRef.current !== activeChatId) {
      setIsTransitioning(true);
    }
    prevChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Clear transitioning state once messages have loaded
  useEffect(() => {
    if (isTransitioning && messages.length > 0) {
      setIsTransitioning(false);
    }
    // Also clear after a timeout in case of empty chats
    if (isTransitioning) {
      const timeout = setTimeout(() => setIsTransitioning(false), 100);
      return () => clearTimeout(timeout);
    }
  }, [isTransitioning, messages.length]);

  useEffect(() => {
    composerRef.current?.focus();
  }, [activeChatId]);

  useEffect(() => {
    if (activeChatId) return;
    setMessage("");
    if (editingState) {
      setEditingState(null);
    }
    clearAttachments();
    setAttachmentError(null);
  }, [
    activeChatId,
    editingState,
    setEditingState,
    clearAttachments,
    setAttachmentError,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch (err) {
      console.warn("Failed to persist mode", err);
    }
  }, [mode]);

  const modeUsageStats = useMemo(() => {
    const initial: Record<ShannonMode, number> = MODE_OPTIONS.reduce(
      (acc, option) => {
        acc[option.value] = 0;
        return acc;
      },
      {} as Record<ShannonMode, number>,
    );
    messages.forEach((msg) => {
      if (msg.role === "user") {
        const rawMode = (msg as Message & { mode?: string })?.mode;
        if (isValidMode(rawMode)) {
          initial[rawMode] += 1;
        }
      }
    });
    return initial;
  }, [messages]);

  useEffect(() => {
    console.info("[Composer] Mode usage snapshot", {
      activeMode: currentModeMeta.value,
      counts: modeUsageStats,
    });
  }, [currentModeMeta.value, modeUsageStats]);

  const handleSendMessage = useCallback(async () => {
    if (!canSend || disableSendButton) return;

    if (hasPendingAttachments) {
      setAttachmentError("Please wait for attachments to finish processing");
      return;
    }

    if (hasAttachmentErrors) {
      setAttachmentError("Remove files that failed to process");
      return;
    }

    if (!trimmedMessage && readyAttachments.length === 0) {
      setAttachmentError("Add a message or attach a file");
      return;
    }

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
    }));

    const options: Record<string, unknown> = {};
    const isNewChat = !activeChatId;
    if (activeChatId) options.chatId = activeChatId;
    if (editingState?.messageId)
      options.editingMessageId = editingState.messageId;
    if (attachmentPayloads.length > 0) options.attachments = attachmentPayloads;
    options.thinkingEnabled = thinkingEnabled;
    if (isNewChat) {
      options.title = formatChatTitle(trimmedMessage);
    }
    // Include Custom Shan ID if active
    if (activeCustomShan?.id) {
      options.customShanId = activeCustomShan.id;
    }
    // Include Project ID if active
    if (activeProject?.id) {
      options.projectId = activeProject.id;
    }

    shouldScrollOnFinishRef.current = true;
    const originalMessageValue = message;
    const messageToSend = trimmedMessage;
    const attachmentsSnapshot = attachments.map((item) => ({ ...item }));
    const hadAttachments = attachmentsSnapshot.length > 0;

    setMessage("");
    setAttachmentError(null);
    adjustComposerHeight(composerRef.current);
    if (hadAttachments) {
      setAttachments([]);
    }
    scrollToBottom("smooth");

    try {
      console.info("[Composer] Sending message", {
        mode,
        multiplier: currentModeMeta.multiplier,
        characters: trimmedMessage.length,
        attachments: readyAttachments.length,
        pendingAttachments: hasPendingAttachments,
        hasAttachmentErrors,
        customShanId: options.customShanId || null,
        projectId: options.projectId || null,
      });

      await sendMessage(messageToSend, mode, options);
      if (editingState) setEditingState(null);
      onMessageSent?.(messages[messages.length - 1]);
    } catch (error) {
      shouldScrollOnFinishRef.current = false;
      console.error("Failed to send message:", error);
      setMessage(originalMessageValue);
      adjustComposerHeight(composerRef.current);
      if (hadAttachments) {
        setAttachments(attachmentsSnapshot);
      }
    } finally {
      composerRef.current?.focus();
    }
  }, [
    canSend,
    disableSendButton,
    readyAttachments,
    hasPendingAttachments,
    hasAttachmentErrors,
    trimmedMessage,
    activeChatId,
    editingState,
    sendMessage,
    setAttachmentError,
    setEditingState,
    onMessageSent,
    messages,
    mode,
    currentModeMeta.multiplier,
    attachments,
    setAttachments,
    message,
    adjustComposerHeight,
    activeCustomShan,
    activeProject,
    scrollToBottom,
  ]);

  const handleComposerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  const handleComposerChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (lastError) clearError();
      if (attachmentError) setAttachmentError(null);
      setMessage(event.target.value);
      adjustComposerHeight(event.target);
    },
    [adjustComposerHeight, clearError, lastError, attachmentError],
  );

  const handleEditMessage = useCallback(
    (msg: Message) => {
      const rawMode = (msg as Message & { mode?: string })?.mode;
      const messageMode = isValidMode(rawMode) ? rawMode : mode;
      const nextMode = editMessageHook(msg, messageMode, activeChatId);
      const resolvedMode = isValidMode(nextMode) ? nextMode : messageMode;
      if (resolvedMode !== mode) {
        setMode(resolvedMode);
      }
      if (msg.role === "user") {
        setMessage(msg.content || "");
        adjustComposerHeight(composerRef.current);
      }
      onMessageEdit?.(msg);
    },
    [editMessageHook, activeChatId, onMessageEdit, adjustComposerHeight, mode],
  );

  const handleDeleteMessage = useCallback(
    (msg: Message) => {
      if (!activeChatId || !msg?.id) return;

      const confirmed =
        typeof window !== "undefined"
          ? window.confirm(
              msg.role === "user"
                ? "Delete this question and its responses?"
                : "Delete this response?",
            )
          : true;

      if (!confirmed) return;

      deleteMessage(activeChatId, msg.id);
      if (editingState?.messageId === msg.id) {
        cancelEditHook();
      }
      onMessageDelete?.(msg);
    },
    [
      activeChatId,
      deleteMessage,
      editingState?.messageId,
      cancelEditHook,
      onMessageDelete,
    ],
  );

  const handleCancelEdit = useCallback(() => {
    cancelEditHook();
    setMessage("");
    clearAttachments();
    setAttachmentError(null);
    adjustComposerHeight(composerRef.current);
  }, [cancelEditHook, clearAttachments, adjustComposerHeight]);

  const handleRegenerateMessage = useCallback(
    (messageId: string) => {
      if (onMessageRegenerate) {
        return onMessageRegenerate(messageId);
      }
      if (!activeChatId) return Promise.resolve();
      return regenerateMessage(messageId, activeChatId);
    },
    [onMessageRegenerate, regenerateMessage, activeChatId],
  );

  const handleStopMessage = useCallback(
    (messageId: string) => {
      void messageId;
      cancelStreaming();
    },
    [cancelStreaming],
  );

  const canShare = useMemo(() => Boolean(activeChatId), [activeChatId]);

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

  const ensureShareRecord = useCallback(async (): Promise<ShareRecord> => {
    if (!activeChatId) {
      throw new Error("Open a chat to share");
    }

    if (shareState.data) {
      return shareState.data;
    }

    const response = await upsertChatShare(activeChatId, "private");
    const normalized = normalizeShareRecord(response);
    if (!normalized) {
      throw new Error("Invalid share link response");
    }
    setShareState({ loading: false, data: normalized, error: null });
    return normalized;
  }, [activeChatId, normalizeShareRecord, shareState.data]);

  const handleOpenShareMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!canShare) {
        setShareState((prev) => ({ ...prev, error: "Open a chat to share" }));
        return;
      }
      setShareAnchorEl(event.currentTarget as HTMLElement);
      setShareCopied(false);
    },
    [canShare],
  );

  const handleCloseShareMenu = useCallback(() => {
    setShareAnchorEl(null);
    setShareCopied(false);
  }, []);

  const handleGenerateShare = useCallback(async () => {
    if (!canShare) {
      setShareState((prev) => ({ ...prev, error: "Open a chat to share" }));
      return;
    }
    setShareSaving(true);
    try {
      await ensureShareRecord();
      setShareCopied(false);
    } catch (err: unknown) {
      const messageText =
        err instanceof Error ? err.message : "Failed to create share link";
      setShareState((prev) => ({
        ...prev,
        error: messageText,
      }));
    } finally {
      setShareSaving(false);
    }
  }, [canShare, ensureShareRecord]);

  const handleShareVisibilityChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!canShare) {
        setShareState((prev) => ({ ...prev, error: "Open a chat to share" }));
        return;
      }
      const nextVisibility: ShareVisibility = event.target.checked
        ? "public"
        : "private";
      setShareSaving(true);
      try {
        const baseRecord = await ensureShareRecord();
        if (!activeChatId) {
          setShareState({
            loading: false,
            data: { ...baseRecord, visibility: nextVisibility },
            error: null,
          });
          return;
        }
        const response = await upsertChatShare(activeChatId, nextVisibility);
        const normalized = normalizeShareRecord(response) ?? {
          ...baseRecord,
          visibility: nextVisibility,
        };
        setShareState({ loading: false, data: normalized, error: null });
      } catch (err: unknown) {
        const messageText =
          err instanceof Error ? err.message : "Failed to update share link";
        setShareState((prev) => ({
          ...prev,
          error: messageText,
        }));
      } finally {
        setShareSaving(false);
      }
    },
    [activeChatId, canShare, ensureShareRecord, normalizeShareRecord],
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
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setShareCopied(true);
    } catch (err: unknown) {
      const messageText =
        err instanceof Error ? err.message : "Failed to copy link";
      setShareState((prev) => ({
        ...prev,
        error: messageText,
      }));
    }
  }, [ensureShareRecord, shareUrl]);

  const dismissShareError = useCallback(() => {
    setShareState((prev) => ({ ...prev, error: null }));
  }, []);

  const containerClassName = ["claude-chat-container", className]
    .filter(Boolean)
    .join(" ");

  // Context indicator for Custom Shan or Project
  const hasContext = Boolean(activeCustomShan || activeProject);
  const shouldShowAds = isEmptyChat && !hasContext && !isPaidUser;

  useEffect(() => {
    if (!shouldShowAds) return;
    const scriptSrc =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7639291116930760";
    const existingScript = document.querySelector(
      `script[src="${scriptSrc}"]`,
    ) as HTMLScriptElement | null;
    let script = existingScript;
    if (!script) {
      script = document.createElement("script");
      script.async = true;
      script.src = scriptSrc;
      script.crossOrigin = "anonymous";
      script.setAttribute("data-adsbygoogle", "true");
      document.head.appendChild(script);
    }

    const pushAds = () => {
      const adsbygoogle = (window as typeof window & {
        adsbygoogle?: unknown[];
      }).adsbygoogle || [];
      adsbygoogle.push({});
      (window as typeof window & { adsbygoogle?: unknown[] }).adsbygoogle =
        adsbygoogle;
    };

    if ((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle) {
      pushAds();
      return undefined;
    }

    const handleLoad = () => {
      script?.setAttribute("data-adsbygoogle-loaded", "true");
      pushAds();
    };
    script?.addEventListener("load", handleLoad, { once: true });
    return () => {
      script?.removeEventListener("load", handleLoad);
    };
  }, [shouldShowAds]);
  const contextName = activeCustomShan?.name || activeProject?.name || "";
  const contextType = activeCustomShan ? "custom-shan" : activeProject ? "project" : null;
  const contextIcon = activeCustomShan?.icon_url || null;
  const inputPlaceholder = editingState
    ? "Update your message"
    : isEmptyChat
      ? "Ask me anything..."
      : "Ask anything";
  const handleMemoryButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setMemoryAnchorEl(event.currentTarget);
    },
    [],
  );
  const handleCloseMemoryMenu = useCallback(() => {
    setMemoryAnchorEl(null);
  }, []);
  const handleMemoryToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setMemoryEnabled(event.target.checked);
    },
    [setMemoryEnabled],
  );
  const handleMemoryReadToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setMemoryReadEnabled(event.target.checked);
    },
    [setMemoryReadEnabled],
  );
  const handleMemoryWriteToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setMemoryWriteEnabled(event.target.checked);
    },
    [setMemoryWriteEnabled],
  );

  const getMemorySizeDescription = useCallback((words: number): string => {
    if (words <= 50) {
      return "Minimal recall – remembers only essential facts";
    }
    if (words <= 100) {
      return "Light context – basic preferences and key details";
    }
    if (words <= 256) {
      return "Moderate depth – balanced detail and context";
    }
    if (words <= 512) {
      return "Rich memory – nuanced understanding of your style";
    }
    if (words <= 1024) {
      return "Deep context – detailed history and complex preferences";
    }
    if (words <= 1536) {
      return "Expert memory – maintains long-term goals and relationships";
    }
    return "Maximum recall – complete personality, history, and project context";
  }, []);

  const memorySizeDescription = useMemo(() => {
    return getMemorySizeDescription(effectiveMemorySize);
  }, [effectiveMemorySize, getMemorySizeDescription]);

  const handleMemorySizeChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const newSize = Array.isArray(value) ? value[0] : value;
      setMemorySizeSetting(newSize);
    },
    [setMemorySizeSetting],
  );

  const memorySizeMarks = useMemo(() => {
    const marks = [{ value: 50, label: "50" }];
    if (userPlanMemoryLimit >= 100) marks.push({ value: 100, label: "100" });
    if (userPlanMemoryLimit >= 256) marks.push({ value: 256, label: "256" });
    if (userPlanMemoryLimit >= 512) marks.push({ value: 512, label: "512" });
    if (userPlanMemoryLimit >= 1024) marks.push({ value: 1024, label: "1K" });
    if (userPlanMemoryLimit >= 1536) marks.push({ value: 1536, label: "1.5K" });
    if (userPlanMemoryLimit >= 2048) marks.push({ value: 2048, label: "2K" });
    return marks;
  }, [userPlanMemoryLimit]);

  const handleManageMemory = useCallback(() => {
    setMemoryAnchorEl(null);
    navigate("/memory");
  }, [navigate]);
  const shareMenuOpen = Boolean(shareAnchorEl);
  const memoryMenuOpen = Boolean(memoryAnchorEl);
  const composerContent = (
    <>
      {editingState && (
        <Box className="claude-editing-banner">
          <span>
            {editingPreview ? `Editing: ${editingPreview}` : "Editing message"}
          </span>
          <button type="button" onClick={handleCancelEdit}>
            Cancel
          </button>
        </Box>
      )}

      <Box className="claude-composer">
        <Box className="claude-composer-bar">
          <Box className="claude-composer-icons">
            <Tooltip title="Attach file" placement="top">
              <button
                type="button"
                className="claude-composer-icon"
                onClick={handleAttachmentButtonClick}
                aria-label="Attach file"
              >
                <AttachFileIcon fontSize="small" />
              </button>
            </Tooltip>
            <Tooltip title="Open memory profile" placement="top">
              <button
                type="button"
                className="claude-composer-icon"
                onClick={handleMemoryButtonClick}
                aria-label="Open memory profile"
              >
                <MemoryIcon fontSize="small" />
              </button>
            </Tooltip>
          </Box>

          <div className="claude-composer-field">
            <textarea
              ref={composerRef}
              className="claude-composer-input"
              placeholder={inputPlaceholder}
              value={message}
              onChange={handleComposerChange}
              onKeyDown={handleComposerKeyDown}
              rows={1}
              aria-label="Message input"
            />
          </div>

          <button
            type="button"
            className="claude-model-selector-btn"
            onClick={(e) => setModelAnchorEl(e.currentTarget)}
            aria-label={`${currentModeMeta.label} model selector`}
            aria-haspopup="true"
            aria-expanded={Boolean(modelAnchorEl)}
          >
            <span className="claude-model-selector-content">
              {currentModeMeta.isNew && <span className="claude-model-new-badge">NEW</span>}
              <span className="claude-model-selector-label">{currentModeMeta.label}</span>
            </span>
            <ExpandMoreIcon fontSize="small" className="claude-model-selector-arrow" />
          </button>

          <button
            type="button"
            className="claude-send-button"
            onClick={handleSendMessage}
            disabled={disableSendButton}
            aria-label={editingState ? "Update message" : "Send message"}
          >
            <SendIcon fontSize="small" />
          </button>
        </Box>

        {attachments.length > 0 && (
          <Box className="claude-attachments-preview">
            {attachments.map((item: Attachment) => {
              const isImage = item.type?.startsWith("image/");
              const previewUrl = item.dataUrl || item.remoteUrl || (item.preview as any)?.url;
              const isLoading = item.status === "loading";
              const isError = item.status === "error";

              return (
                <Box
                  key={item.id}
                  className={`claude-attachment-preview-item ${isError ? 'error' : ''} ${isLoading ? 'loading' : ''}`}
                >
                  {/* Preview thumbnail */}
                  <Box className="claude-attachment-preview-thumb">
                    {isImage && previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={item.name}
                        className="claude-attachment-preview-img"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <Box className="claude-attachment-preview-icon">
                        <FileIcon fontSize="small" />
                      </Box>
                    )}
                    {isLoading && (
                      <Box className="claude-attachment-preview-loading">
                        <CircularProgress size={16} />
                      </Box>
                    )}
                  </Box>

                  {/* File info */}
                  <Box className="claude-attachment-preview-info">
                    <Typography className="claude-attachment-preview-name" title={item.name}>
                      {item.name}
                    </Typography>
                    <Typography className="claude-attachment-preview-size">
                      {formatFileSize(item.size ?? 0)}
                      {item.truncated && " (truncated)"}
                      {isError && ` - ${item.error || 'Error'}`}
                    </Typography>
                  </Box>

                  {/* Remove button */}
                  <button
                    type="button"
                    className="claude-attachment-remove-btn"
                    onClick={() => handleRemoveAttachment(item.id)}
                    aria-label={`Remove ${item.name}`}
                    title="Remove file"
                  >
                    <CloseIcon fontSize="small" />
                  </button>
                </Box>
              );
            })}
          </Box>
        )}

        {attachmentError && (
          <Typography className="claude-attachment-error">
            {attachmentError}
          </Typography>
        )}

      </Box>
    </>
  );

  return (
    <Box className={containerClassName}>
      <Box className="claude-top-bar">
        <Box className="claude-bar-inner">
          {showSettings && (
            <Tooltip
              title={
                canShare
                  ? "Share this conversation"
                  : "Sign in to share conversations"
              }
              placement="bottom"
            >
              <span>
                <button
                  type="button"
                  className="claude-top-link"
                  onClick={handleOpenShareMenu}
                  disabled={!canShare}
                >
                  Share
                </button>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Box className="claude-chat-body">
        {/* Context Banner - shows when chatting with Custom Shan or Project */}
        {hasContext && (
          <Box className={`claude-context-banner ${contextType}`}>
            <Box className="claude-context-content">
              {contextIcon ? (
                <img
                  src={contextIcon}
                  alt=""
                  className="claude-context-icon"
                  loading="lazy"
                  decoding="async"
                />
              ) : contextType === "project" ? (
                <FolderIcon className="claude-context-icon-default" />
              ) : null}
              <Box className="claude-context-info">
                <Typography className="claude-context-label">
                  {contextType === "custom-shan" ? "Chatting with Custom Shan" : "Chatting in Project"}
                </Typography>
                <Typography className="claude-context-name">
                  {contextName}
                </Typography>
              </Box>
            </Box>
            <Tooltip title={`Exit ${contextType === "custom-shan" ? "Custom Shan" : "Project"} and return to normal chat`}>
              <button
                type="button"
                className="claude-context-close"
                onClick={() => {
                  if (activeCustomShan) {
                    clearActiveCustomShan();
                  } else if (activeProject) {
                    clearActiveProject();
                  }
                }}
                aria-label="Exit context"
              >
                <CloseIcon fontSize="small" />
              </button>
            </Tooltip>
          </Box>
        )}

        {lastError && (
          <Box sx={{ width: "min(960px, 92%)", margin: "0 auto 16px" }}>
            <Alert severity="error" onClose={clearError} variant="outlined">
              {lastError}
            </Alert>
          </Box>
        )}

        {isEmptyChat ? (
          <Box
            className={`claude-empty-chat${
              shouldShowAds ? " claude-empty-chat-ads" : ""
            }`}
          >
            {/* Context-aware welcome UI for Custom Shan or Project */}
            {hasContext ? (
              <Box className={`claude-context-welcome ${contextType}`}>
                <Box className="claude-context-welcome-header">
                  {/* Custom Shan avatar (image URL) */}
                  {contextType === "custom-shan" && contextIcon ? (
                    <img
                      src={contextIcon}
                      alt={contextName}
                      className="claude-context-welcome-avatar"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : activeProject?.icon ? (
                    /* Project emoji icon */
                    <Box className="claude-context-welcome-emoji project">
                      <span className="claude-project-emoji">{activeProject.icon}</span>
                    </Box>
                  ) : (
                    <Box className="claude-context-welcome-avatar-default project">
                      <FolderIcon />
                    </Box>
                  )}
                  <Box className="claude-context-welcome-info">
                    <Typography variant="h5" className="claude-context-welcome-name">
                      {contextName}
                    </Typography>
                    <Typography variant="body2" className="claude-context-welcome-type">
                      {contextType === "custom-shan" ? "Custom Shannon" : "Project"}
                    </Typography>
                  </Box>
                  <Tooltip title="Settings">
                    <button
                      type="button"
                      className="claude-context-welcome-settings"
                      onClick={() => {
                        if (activeCustomShan) {
                          navigate(`/custom-shan/${activeCustomShan.id}`);
                        } else if (activeProject) {
                          navigate(`/projects/${activeProject.id}`);
                        }
                      }}
                      aria-label="Settings"
                    >
                      <SettingsIcon fontSize="small" />
                    </button>
                  </Tooltip>
                </Box>

                {(activeCustomShan?.description || activeProject?.description) && (
                  <Typography className="claude-context-welcome-description">
                    {activeCustomShan?.description || activeProject?.description}
                  </Typography>
                )}

                {/* Custom Shan starter prompt */}
                {activeCustomShan?.starter_prompt && (
                  <Box className="claude-context-welcome-starter">
                    <Typography variant="caption" className="claude-context-welcome-starter-label">
                      Suggested prompt
                    </Typography>
                    <button
                      type="button"
                      className="claude-context-welcome-starter-btn"
                      onClick={() => {
                        setMessage(activeCustomShan.starter_prompt);
                        composerRef.current?.focus();
                      }}
                    >
                      {activeCustomShan.starter_prompt}
                    </button>
                  </Box>
                )}

                {/* Project files and instructions info */}
                {activeProject && (
                  <Box className="claude-project-welcome-info">
                    {activeProjectFiles && activeProjectFiles.length > 0 && (
                      <Box className="claude-project-files-badge">
                        <FileIcon className="claude-project-files-icon" />
                        <span>{activeProjectFiles.length} file{activeProjectFiles.length !== 1 ? 's' : ''} in project</span>
                      </Box>
                    )}
                    {activeProject.instructions && (
                      <Box className="claude-project-instructions-badge">
                        <InstructionsIcon className="claude-project-instructions-icon" />
                        <span>Custom instructions active</span>
                      </Box>
                    )}
                  </Box>
                )}

                <Box className="claude-context-welcome-features">
                  <span className="claude-context-welcome-feature">
                    <AttachFileIcon className="claude-feature-icon" />
                    Attach files
                  </span>
                  <span className="claude-context-welcome-feature">
                    <BrainIcon className="claude-feature-icon" />
                    Deep thinking
                  </span>
                  {activeProject && (
                    <span className="claude-context-welcome-feature project-feature">
                      <FileIcon className="claude-feature-icon" />
                      Project files
                    </span>
                  )}
                </Box>

                {composerContent}
              </Box>
            ) : (
              <>
                <Box className="claude-empty-card">
                  <Box className="claude-empty-header">
                    <Typography variant="h5" className="claude-empty-title">
                      Start a new chat
                    </Typography>
                    <Typography variant="body2" className="claude-empty-subtitle">
                      Ask anything, attach files, or use memory
                    </Typography>
                  </Box>
                  <Box className="claude-empty-tags">
                    <span className="claude-tag">
                      <AttachFileIcon className="claude-tag-icon" />
                      Files
                    </span>
                    <span className="claude-tag">
                      <MemoryIcon className="claude-tag-icon" />
                      Memory
                    </span>
                    <span className="claude-tag">
                      <BrainIcon className="claude-tag-icon" />
                      Thinking
                    </span>
                  </Box>
                  {composerContent}
                </Box>
                {shouldShowAds && (
                  <Box className="claude-empty-ad">
                    <ins
                      className="adsbygoogle"
                      style={{ display: "block" }}
                      data-ad-format="autorelaxed"
                      data-ad-client="ca-pub-7639291116930760"
                      data-ad-slot="9695763205"
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        ) : (
          <>
            <Box
              ref={messageContainerRef}
              className="claude-messages-container"
              data-header-scroll="true"
            >
              <MessageList
                messages={messages}
                onRegenerate={handleRegenerateMessage}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                onStop={handleStopMessage}
                messagesEndRef={messagesEndRef}
                editingState={editingState}
                isSending={isSending}
                assistantAvatarUrl={activeCustomShan?.icon_url || null}
                assistantName={activeCustomShan?.name || null}
                showInlineAds={!isPaidUser}
              />
            </Box>

            <Box className="claude-input-container">
              <Box className="claude-bar-inner claude-input-inner">
                {composerContent}
              </Box>
            </Box>
          </>
        )}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={handleAttachmentChange}
        onClick={(event) => {
          (event.target as HTMLInputElement).value = "";
        }}
      />

      <Popover
        open={shareMenuOpen}
        anchorEl={shareAnchorEl}
        onClose={handleCloseShareMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          className: "claude-popover",
          sx: { width: 340, p: 2 },
        }}
      >
        {shareState.error && (
          <Alert severity="error" sx={{ mb: 1 }} onClose={dismissShareError}>
            {shareState.error}
          </Alert>
        )}
        <Typography variant="subtitle1" sx={{ fontSize: "1rem", mb: 1 }}>
          Share conversation
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.72, mb: 2 }}>
          Public links appear in the sitemap. Private links require a Shannon
          account to view.
        </Typography>
        {shareState.loading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">Loading share status…</Typography>
          </Box>
        ) : shareState.data ? (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={shareState.data.visibility === "public"}
                  onChange={handleShareVisibilityChange}
                  disabled={shareSaving}
                  color="primary"
                />
              }
              label="Public link"
            />
            <TextField
              value={shareUrl}
              size="small"
              fullWidth
              InputProps={{
                readOnly: true,
                sx: {
                  color: "inherit",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  "& fieldset": { borderColor: "rgba(148, 163, 184, 0.4)" },
                  "&:hover fieldset": {
                    borderColor: "rgba(248, 250, 252, 0.65)",
                  },
                },
              }}
              sx={{ mt: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<ContentCopyIcon fontSize="small" />}
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
            startIcon={<ShareOutlinedIcon fontSize="small" />}
            onClick={handleGenerateShare}
            disabled={shareSaving || !canShare}
          >
            Generate private link
          </Button>
        )}
      </Popover>

      <Popover
        open={memoryMenuOpen}
        anchorEl={memoryAnchorEl}
        onClose={handleCloseMemoryMenu}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{
          className: "claude-popover",
          sx: { p: 2, width: 260 },
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
          Memory controls
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={memoryReadEnabled}
              onChange={handleMemoryReadToggle}
              color="primary"
              size="small"
            />
          }
          label="Use memory in responses"
          sx={{ mb: 0.5 }}
        />
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", display: "block", mb: 1.5, ml: 4 }}
        >
          Include your saved preferences when generating answers
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={memoryWriteEnabled}
              onChange={handleMemoryWriteToggle}
              color="primary"
              size="small"
            />
          }
          label="Auto-update memory"
          sx={{ mb: 0.5 }}
        />
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", display: "block", mb: 2, ml: 4 }}
        >
          Learn new preferences from your conversations
        </Typography>

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, mt: 1 }}>
          Memory size
        </Typography>
        <Box sx={{ px: 1 }}>
          <Slider
            value={effectiveMemorySize}
            onChange={handleMemorySizeChange}
            min={50}
            max={userPlanMemoryLimit}
            step={userPlanMemoryLimit <= 256 ? 10 : 32}
            marks={memorySizeMarks}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value} words`}
            size="small"
            sx={{
              "& .MuiSlider-markLabel": {
                fontSize: "0.65rem",
              },
            }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block",
            mb: 1,
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          {effectiveMemorySize} words – {memorySizeDescription}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block",
            mb: 2,
            opacity: 0.7,
            fontSize: "0.7rem",
          }}
        >
          Your plan allows up to {userPlanMemoryLimit} words
        </Typography>

        <Button
          fullWidth
          variant="contained"
          size="small"
          onClick={handleManageMemory}
        >
          Manage my memory
        </Button>
      </Popover>

      {/* Model Selector Popover */}
      <Popover
        open={Boolean(modelAnchorEl)}
        anchorEl={modelAnchorEl}
        onClose={() => setModelAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        PaperProps={{
          className: "claude-model-popover",
          sx: {
            width: 380,
            maxWidth: "95vw",
            borderRadius: "16px",
            overflow: "hidden",
          },
        }}
      >
        <Box className="claude-model-popover-header">
          <Typography variant="subtitle1" className="claude-model-popover-title">
            Choose Model
          </Typography>
          <Typography variant="body2" className="claude-model-popover-subtitle">
            Select the AI model for your conversation
          </Typography>
        </Box>

        <Box className="claude-model-options">
          {PRIMARY_MODE_OPTIONS.map((option) => {
            const isSelected = mode === option.value;
            const OptionIcon =
              option.value === "lite16"
                ? BoltIcon
                : option.value === "pro16"
                  ? RocketIcon
                  : SparkleIcon;
            const isLocked = option.isPremium && !isPaidUser;

            return (
              <Tooltip
                key={option.value}
                title={isLocked ? "Upgrade to a paid plan to access Shannon 2 Preview" : ""}
                placement="left"
              >
                <span style={{ display: "block" }}>
                  <button
                    type="button"
                    className={`claude-model-option ${isSelected ? "selected" : ""} ${isLocked ? "locked" : ""} ${option.isPremium ? "premium" : ""}`}
                    onClick={() => {
                      if (isLocked) return;
                      setMode(option.value);
                      setThinkingEnabled(Boolean(option.thinkingEnabled));
                      setModelAnchorEl(null);
                    }}
                    disabled={isLocked}
                    style={{ "--model-accent": option.accent } as React.CSSProperties}
                  >
                    <span className="claude-model-option-icon">
                      <OptionIcon />
                    </span>
                    <span className="claude-model-option-content">
                      <span className="claude-model-option-header">
                        <span className="claude-model-option-label">{option.label}</span>
                        {option.isNew && <span className="claude-model-option-new">NEW</span>}
                        {option.isPreview && <span className="claude-model-option-preview">PREVIEW</span>}
                        {option.isPremium && <span className="claude-model-option-premium">PREMIUM</span>}
                        {option.thinkingEnabled && <span className="claude-model-option-thinking">Thinking</span>}
                        {option.ultraThink && <span className="claude-model-option-ultra">Ultra</span>}
                      </span>
                      {option.description && (
                        <span className="claude-model-option-desc">{option.description}</span>
                      )}
                      <span className="claude-model-option-multiplier">
                        {option.multiplier}x token usage
                        {!isPaidUser && option.isPremium && " · Free: 3/day"}
                      </span>
                    </span>
                    {isLocked ? (
                      <span className="claude-model-option-lock">
                        <LockIcon fontSize="small" />
                      </span>
                    ) : isSelected ? (
                      <span className="claude-model-option-check">
                        <CheckCircleIcon fontSize="small" />
                      </span>
                    ) : null}
                  </button>
                </span>
              </Tooltip>
            );
          })}
        </Box>

        <Box className="claude-model-popover-footer">
          <Typography variant="caption">
            Shannon 1.6 series: pick Lite for speed or Pro for maximum reasoning.
          </Typography>
        </Box>
      </Popover>
    </Box>
  );
};

export default ChatContainer;
