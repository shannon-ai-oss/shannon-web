import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "@/lib/localStore";
import { auth, db } from "@/config/backend";
import { useAuth } from "@/hooks/useAuth";
import { formatChatTitle } from "@/utils/format";
import { fixDiagramInMessageWithMeta } from "@/utils/mermaidFixer";
import { prepareConversationMessages } from "@/utils/conversationHistory";
import { memoryApiFetch } from "@/utils/memoryApi";

const ChatContext = createContext(null);
const MEMORY_PREFERENCE_STORAGE_KEY = "shannon:memory-enabled";
const MEMORY_READ_STORAGE_KEY = "shannon:memory-read-enabled";
const MEMORY_WRITE_STORAGE_KEY = "shannon:memory-write-enabled";
const MEMORY_SIZE_STORAGE_KEY = "shannon:memory-size";

const MEMORY_LIMITS_BY_PLAN = {
  free: 100,
  starter: 256,
  plus: 512,
  pro: 2048,
};

const MEMORY_VERSION_KEY = "shannon:memory-version";

// Node depth limits for V4 memory (how many nodes to include in context)
const MEMORY_DEPTH_BY_PLAN = {
  free: 10,
  starter: 25,
  plus: 50,
  pro: 100,
};

const MODEL_ID = "shannon-1.6-pro";
const MODE_TO_MODEL_CODE = {
  lite16: MODEL_ID,
  pro16: MODEL_ID,
};

const DEFAULT_TITLE = "New Chat";
const DEFAULT_SYSTEM_PROMPT =
  "You are Shannon, a creative and optimistic assistant. Be imaginative, proactive, and encouraging while staying accurate and helpful. Keep responses concise when possible, but don't sacrifice clarity.";

const CHAT_ENDPOINT =
  import.meta.env?.VITE_CHAT_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8080/v1/chat/completions";

const normalizeTimestamp = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return null;
};

const normalizeChat = (docSnapshot) => {
  const data = docSnapshot.data() || {};
  const ownerUid = data.ownerUid || data.ownerId || null;
  return {
    id: docSnapshot.id,
    title: data.title || DEFAULT_TITLE,
    ownerUid,
    ownerId: ownerUid,
    created_at: normalizeTimestamp(data.created_at),
    updated_at: normalizeTimestamp(data.updated_at),
    // Store context IDs to restore context when selecting existing chats
    customShanId: data.customShanId || null,
    projectId: data.projectId || null,
  };
};

const normalizeMessage = (docSnapshot) => {
  const data = docSnapshot.data() || {};
  const createdAt = normalizeTimestamp(data.created_at);
  return {
    id: docSnapshot.id,
    chatId: docSnapshot.ref.parent?.parent?.id || null,
    role: data.role || "user",
    content: data.content || "",
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    metadata: data.metadata || {},
    statusMessage: data.statusMessage || data.status_message || null,
    provider: data.provider || data.metadata?.provider || null,
    reasoning: data.reasoning || null,
    mode: data.mode || null,
    model_code: data.model_code || null,
    ownerUid: data.ownerUid || data.ownerId || null,
    ownerId: data.ownerUid || data.ownerId || null,
    status: data.status || "sent",
    wasStopped: Boolean(data.wasStopped),
    isPlaceholder: Boolean(data.isPlaceholder),
    isError: Boolean(data.isError) || data.status === "error",
    error: data.error || null,
    tokens: data.tokens || null,
    created_at: createdAt,
    updated_at: normalizeTimestamp(data.updated_at),
    timestamp: createdAt,
    isStreaming: Boolean(data.isStreaming),
  };
};

const clampWords = (text, maxWords) => {
  if (!text) return "";
  if (!maxWords || !Number.isFinite(maxWords) || maxWords <= 0) {
    return text.trim();
  }
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return text.trim();
  }
  return words.slice(0, maxWords).join(" ");
};

const summarizeFixesForStorage = (fixes = []) => {
  if (!Array.isArray(fixes)) {
    return [];
  }
  return fixes.slice(0, 5).map((fix) => ({
    diagramType: fix?.diagramType ?? null,
    placeholderApplied: Boolean(fix?.placeholderApplied),
    changeCount: Array.isArray(fix?.changes) ? fix.changes.length : 0,
  }));
};

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const abortControllerRef = useRef(null);
  const deletingIdsRef = useRef(new Set());
  const [activeMessages, setActiveMessages] = useState([]);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [draftChat, setDraftChat] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [memoryProfile, setMemoryProfile] = useState("");
  const [memoryVersion, setMemoryVersion] = useState("v4");
  const [memoryEnabled, setMemoryEnabledState] = useState(true);
  const [memoryReadEnabled, setMemoryReadEnabledState] = useState(true);
  const [memoryWriteEnabled, setMemoryWriteEnabledState] = useState(true);
  const [memorySizeSetting, setMemorySizeSettingState] = useState(null);
  const persistMemoryPreference = useCallback((nextEnabled) => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        MEMORY_PREFERENCE_STORAGE_KEY,
        nextEnabled ? "1" : "0",
      );
    } catch (err) {
      console.warn("Failed to persist memory preference", err);
    }
  }, []);
  const setMemoryEnabled = useCallback(
    (nextEnabled) => {
      setMemoryEnabledState((prev) => {
        const normalized = Boolean(nextEnabled);
        if (prev === normalized) {
          return prev;
        }
        persistMemoryPreference(normalized);
        return normalized;
      });
    },
    [persistMemoryPreference],
  );
  const toggleMemoryEnabled = useCallback(() => {
    setMemoryEnabledState((prev) => {
      const next = !prev;
      persistMemoryPreference(next);
      return next;
    });
  }, [persistMemoryPreference]);

  const persistMemoryReadPreference = useCallback((nextEnabled) => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        MEMORY_READ_STORAGE_KEY,
        nextEnabled ? "1" : "0",
      );
    } catch (err) {
      console.warn("Failed to persist memory read preference", err);
    }
  }, []);

  const setMemoryReadEnabled = useCallback(
    (nextEnabled) => {
      setMemoryReadEnabledState((prev) => {
        const normalized = Boolean(nextEnabled);
        if (prev === normalized) {
          return prev;
        }
        persistMemoryReadPreference(normalized);
        return normalized;
      });
    },
    [persistMemoryReadPreference],
  );

  const toggleMemoryReadEnabled = useCallback(() => {
    setMemoryReadEnabledState((prev) => {
      const next = !prev;
      persistMemoryReadPreference(next);
      return next;
    });
  }, [persistMemoryReadPreference]);

  const persistMemoryWritePreference = useCallback((nextEnabled) => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        MEMORY_WRITE_STORAGE_KEY,
        nextEnabled ? "1" : "0",
      );
    } catch (err) {
      console.warn("Failed to persist memory write preference", err);
    }
  }, []);

  const setMemoryWriteEnabled = useCallback(
    (nextEnabled) => {
      setMemoryWriteEnabledState((prev) => {
        const normalized = Boolean(nextEnabled);
        if (prev === normalized) {
          return prev;
        }
        persistMemoryWritePreference(normalized);
        return normalized;
      });
    },
    [persistMemoryWritePreference],
  );

  const toggleMemoryWriteEnabled = useCallback(() => {
    setMemoryWriteEnabledState((prev) => {
      const next = !prev;
      persistMemoryWritePreference(next);
      return next;
    });
  }, [persistMemoryWritePreference]);

  const userPlanSlug = useMemo(() => {
    const slug =
      (typeof user?.plan?.slug === "string" && user.plan.slug.toLowerCase()) ||
      (typeof user?.plan_slug === "string" && user.plan_slug.toLowerCase()) ||
      "free";
    return slug;
  }, [user?.plan?.slug, user?.plan_slug]);

  const userPlanMemoryLimit = useMemo(() => {
    return MEMORY_LIMITS_BY_PLAN[userPlanSlug] ?? MEMORY_LIMITS_BY_PLAN.free;
  }, [userPlanSlug]);

  const userPlanMemoryDepth = useMemo(() => {
    return MEMORY_DEPTH_BY_PLAN[userPlanSlug] ?? MEMORY_DEPTH_BY_PLAN.free;
  }, [userPlanSlug]);

  const effectiveMemorySize = useMemo(() => {
    if (memorySizeSetting === null) {
      return userPlanMemoryLimit;
    }
    return Math.min(memorySizeSetting, userPlanMemoryLimit);
  }, [memorySizeSetting, userPlanMemoryLimit]);

  const persistMemorySizeSetting = useCallback((nextSize) => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      if (nextSize === null) {
        window.localStorage.removeItem(MEMORY_SIZE_STORAGE_KEY);
      } else {
        window.localStorage.setItem(MEMORY_SIZE_STORAGE_KEY, String(nextSize));
      }
    } catch (err) {
      console.warn("Failed to persist memory size setting", err);
    }
  }, []);

  const setMemorySizeSetting = useCallback(
    (nextSize) => {
      setMemorySizeSettingState((prev) => {
        const normalized = nextSize === null ? null : Number(nextSize);
        if (prev === normalized) {
          return prev;
        }
        persistMemorySizeSetting(normalized);
        return normalized;
      });
    },
    [persistMemorySizeSetting],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    try {
      const stored = window.localStorage.getItem(MEMORY_PREFERENCE_STORAGE_KEY);
      if (stored !== null) {
        const normalized = stored !== "0" && stored !== "false";
        setMemoryEnabledState(normalized);
      }
      const storedRead = window.localStorage.getItem(MEMORY_READ_STORAGE_KEY);
      if (storedRead !== null) {
        const normalizedRead = storedRead !== "0" && storedRead !== "false";
        setMemoryReadEnabledState(normalizedRead);
      }
      const storedWrite = window.localStorage.getItem(MEMORY_WRITE_STORAGE_KEY);
      if (storedWrite !== null) {
        const normalizedWrite = storedWrite !== "0" && storedWrite !== "false";
        setMemoryWriteEnabledState(normalizedWrite);
      }
      const storedSize = window.localStorage.getItem(MEMORY_SIZE_STORAGE_KEY);
      if (storedSize !== null) {
        const parsedSize = Number(storedSize);
        if (Number.isFinite(parsedSize) && parsedSize > 0) {
          setMemorySizeSettingState(parsedSize);
        }
      }
    } catch (err) {
      console.warn("Failed to hydrate memory preferences", err);
    }
    return undefined;
  }, []);


  const applyMermaidFix = useCallback(
    async ({
      chatId,
      messageId,
      content,
      source = "auto",
      fixes = [],
      note = null,
    }) => {
      if (!chatId || !messageId || typeof content !== "string") {
        return;
      }
      try {
        const appliedAt = serverTimestamp();
        const docRef = doc(db, "chats", chatId, "messages", messageId);
        await updateDoc(docRef, {
          content,
          updated_at: appliedAt,
          mermaidFixAppliedAt: appliedAt,
          mermaidFixSummary: {
            source,
            note,
            fixes: summarizeFixesForStorage(fixes),
          },
        });
      } catch (error) {
        console.error("applyMermaidFix failed", {
          chatId,
          messageId,
          error,
        });
        throw error;
      }
    },
    [],
  );

  useEffect(() => {
    if (!user?.uid) {
      setChats([]);
      setActiveChatId(null);
      setDraftChat(null);
      return () => undefined;
    }

    const chatsQuery = query(
      collection(db, "chats"),
      where("ownerId", "==", user.uid),
      orderBy("updated_at", "desc"),
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const nextChats = snapshot.docs.map(normalizeChat);
      setChats(nextChats);
      if (draftChat) {
        return;
      }
      if (!nextChats.length) {
        setActiveChatId(null);
      } else if (
        !activeChatId ||
        !nextChats.some((chat) => chat.id === activeChatId)
      ) {
        setActiveChatId(nextChats[0].id);
      }
    });

    return unsubscribe;
  }, [user?.uid, activeChatId, draftChat]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) {
      setMemoryProfile("");
      setMemoryVersion("v4");
      return () => undefined;
    }

    const loadProfile = async () => {
      try {
        const data = await memoryApiFetch("/memory/profile/get", {
          uid: user.uid,
        });
        if (cancelled) return;
        if (data) {
          const version = data.memoryVersion || "v4";
          setMemoryVersion(version);
          setMemoryProfile(version === "v3" ? (data.text || "").trim() : "");
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load memory profile", error);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => undefined, []);

  useEffect(() => {
    if (!user?.uid || !activeChatId) {
      setActiveMessages([]);
      setPendingMessages([]);
      return () => undefined;
    }

    // Capture the chatId this effect was created for
    const effectChatId = activeChatId;
    let cancelled = false;

    // CRITICAL: Clear messages immediately when switching chats
    // This prevents old chat's messages from showing while new chat loads
    setActiveMessages([]);
    setPendingMessages((prev) => prev.filter((m) => m.chatId === effectChatId));

    const messagesQuery = query(
      collection(db, "chats", effectChatId, "messages"),
      orderBy("created_at", "asc"),
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      // CRITICAL: If this effect has been cancelled (chat switched), ignore the update
      // This prevents messages from one chat bleeding into another
      if (cancelled) {
        console.log('[Local store snapshot] Ignoring update - chat switched from', effectChatId);
        return;
      }

      // Filter out messages being deleted to prevent race conditions
      const filteredDocs = snapshot.docs.filter(
        (d) => !deletingIdsRef.current.has(d.id)
      );
      const normalizedMessages = filteredDocs.map(normalizeMessage);
      const fixResults = normalizedMessages.map((msg) =>
        fixDiagramInMessageWithMeta(msg),
      );
      const nextMessages = fixResults.map((result) => result.message);
      const storeIds = new Set(nextMessages.map((m) => m.id));

      // Update activeMessages with store data, BUT preserve any messages
      // that were added by SSE handler but aren't in the store yet
      setActiveMessages((prev) => {
        console.log('[Local store snapshot] Processing:', {
          storeCount: nextMessages.length,
          storeIds: Array.from(storeIds),
          prevCount: prev.length,
          prevIds: prev.map(m => m.id),
        });
        // Keep messages that aren't in the store yet but were added by SSE
        const messagesToKeep = prev.filter((msg) => {
          // Already in store - use store version
          if (storeIds.has(msg.id)) {
            console.log('[Local store snapshot] Message in store, using store version:', msg.id);
            return false;
          }
          // Keep streaming messages
          if (msg.isStreaming || msg.status === "streaming") {
            console.log('[Local store snapshot] Keeping streaming message:', msg.id);
            return true;
          }
          // Keep any hydrated message (isPlaceholder: false) not yet in the store
          // This includes both user messages and assistant messages after streaming
          if (msg.isPlaceholder === false) {
            console.log('[Local store snapshot] Keeping hydrated message:', msg.id, msg.role);
            return true;
          }
          console.log('[Local store snapshot] Dropping message:', msg.id, { isPlaceholder: msg.isPlaceholder, isStreaming: msg.isStreaming });
          return false;
        });
        // Merge: store messages + messages not yet in the store
        console.log('[Local store snapshot] Result:', {
          storeCount: nextMessages.length,
          keptCount: messagesToKeep.length,
          totalCount: nextMessages.length + messagesToKeep.length,
        });
        return [...nextMessages, ...messagesToKeep];
      });

      setPendingMessages((prev) => {
        console.log('[ChatContext] Filtering pendingMessages:', {
          prevCount: prev.length,
          effectChatId,
          nextMessagesCount: nextMessages.length,
          nextUserMessages: nextMessages.filter(m => m.role === 'user').length,
        });
        return prev.filter((placeholder) => {
          if (!placeholder || placeholder.chatId !== effectChatId) {
            return true;
          }

          if (placeholder.role === "user") {
            // Only remove user placeholder if the actual user message exists in local store
            const match = nextMessages.find((msg) => {
              if (msg.role !== "user") return false;
              if (msg.id && msg.id === placeholder.id) return true;
              const nextContent = (msg.content || "").trim();
              const placeholderContent = (placeholder.content || "").trim();
              if (nextContent !== placeholderContent) {
                return false;
              }
              const placeholderTime = placeholder.created_at
                ? Date.parse(placeholder.created_at)
                : Number.NaN;
              const messageTime = msg.created_at
                ? Date.parse(msg.created_at)
                : Number.NaN;
              if (
                Number.isFinite(placeholderTime) &&
                Number.isFinite(messageTime)
              ) {
                return Math.abs(messageTime - placeholderTime) < 2000;
              }
              return true;
            });
            console.log('[ChatContext] User placeholder match check:', {
              placeholderId: placeholder.id,
              matchFound: !!match,
              matchId: match?.id,
              keeping: !match,
            });
            return !match;
          }

          if (placeholder.role === "assistant") {
            const match = nextMessages.find((msg) => msg.role === "assistant");
            console.log('[ChatContext] Assistant placeholder match check:', {
              placeholderId: placeholder.id,
              matchFound: !!match,
              matchId: match?.id,
              keeping: !match,
            });
            return !match;
          }

          return true;
        });
      });

      const mutations = fixResults
        .filter(
          (result) =>
            result.changed &&
            result.message.chatId &&
            result.message.id &&
            typeof result.message.content === "string",
        )
        .map((result) =>
          applyMermaidFix({
            chatId: result.message.chatId,
            messageId: result.message.id,
            content: result.message.content,
            source: "auto-fixer",
            fixes: result.fixes,
          }).catch((error) => {
            console.error("Failed to persist Mermaid diagram fix", {
              error,
              messageId: result.message.id,
            });
          }),
        );

      if (mutations.length) {
        void Promise.allSettled(mutations);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user?.uid, activeChatId, applyMermaidFix]);

  const activeChat = useMemo(() => {
    if (!activeChatId) return null;
    const meta = chats.find((chat) => chat.id === activeChatId);

    const pendingForActive = pendingMessages.filter(
      (msg) => msg.chatId === activeChatId,
    );

    // If chat metadata not yet loaded from local store but we have pending messages,
    // create minimal metadata so streaming can show immediately
    const effectiveMeta = meta || (pendingForActive.length > 0 ? {
      id: activeChatId,
      title: "New Chat",
      ownerUid: null,
      ownerId: null,
      created_at: null,
      updated_at: null,
    } : null);

    if (!effectiveMeta) return null;

    // Simple case: no pending messages, just return activeMessages
    if (!pendingForActive.length) {
      return {
        ...effectiveMeta,
        messages: activeMessages,
      };
    }

    // Build combined messages list:
    // 1. Start with all activeMessages (don't filter out streaming - they're real messages!)
    // 2. Merge any pending message properties if IDs match
    // 3. Add pending messages that don't exist in active yet

    const pendingById = new Map(pendingForActive.map((msg) => [msg.id, msg]));
    const activeIds = new Set(activeMessages.map((msg) => msg.id));

    // Merge pending properties into matching active messages
    const mergedMessages = activeMessages.map((activeMsg) => {
      const pendingMsg = pendingById.get(activeMsg.id);
      if (pendingMsg) {
        return {
          ...activeMsg,
          ...pendingMsg,
          // Keep the content from whichever has more
          content: (pendingMsg.content?.length > (activeMsg.content?.length || 0))
            ? pendingMsg.content
            : activeMsg.content,
        };
      }
      return activeMsg;
    });

    // Add pending messages that don't exist in activeMessages yet
    // These are truly new messages (optimistic user messages or initial placeholders)
    const newPending = pendingForActive.filter((msg) => !activeIds.has(msg.id));

    return {
      ...effectiveMeta,
      messages: [...mergedMessages, ...newPending],
    };
  }, [activeChatId, chats, activeMessages, pendingMessages]);

  useEffect(() => {
    if (activeChatId) {
      setDraftChat(null);
    }
  }, [activeChatId]);

  const beginNewChat = useCallback(() => {
    setDraftChat({ started_at: Date.now() });
    setActiveChatId(null);
    setActiveMessages([]);
    setPendingMessages([]);
    setIsSending(false);
    setLastError(null);
  }, []);

  const clearError = useCallback(() => setLastError(null), []);

  const ensureAuth = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      throw new Error("You must be signed in to chat.");
    }
    const idToken = await current.getIdToken();
    return { uid: current.uid, idToken };
  }, []);

  const createNewChat = useCallback(async (title = DEFAULT_TITLE, options = {}) => {
    const current = auth.currentUser;
    if (!current) {
      throw new Error("Sign in required");
    }
    const formattedTitle = formatChatTitle(title);
    const now = serverTimestamp();
    const chatData = {
      ownerUid: current.uid,
      ownerId: current.uid,
      title: formattedTitle,
      created_at: now,
      updated_at: now,
    };
    // Store context IDs in the chat document for persistence
    if (options.customShanId) {
      chatData.customShanId = options.customShanId;
    }
    if (options.projectId) {
      chatData.projectId = options.projectId;
    }
    const newDoc = await addDoc(collection(db, "chats"), chatData);
    setDraftChat(null);
    setActiveChatId(newDoc.id);
    return newDoc.id;
  }, []);

  const sendMessage = useCallback(
    async (prompt, mode = "balanced", options = {}) => {
      console.log("[sendMessage] Called with prompt:", prompt?.substring?.(0, 50));
      const trimmed = (prompt ?? "").trim();
      if (!trimmed) {
        console.log("[sendMessage] Empty prompt, returning");
        return null;
      }

      setIsSending(true);
      setLastError(null);

      const skipUserInsert = Boolean(options.skipUserInsert);
      const regenOfUserId = options.regenOfUserId || null;
      const billingTag = options.billingTag || null;
      const editingMessageId = options.editingMessageId || null;
      const providedAttachments = Array.isArray(options.attachments)
        ? options.attachments
        : [];
      const thinkingEnabled = Boolean(options.thinkingEnabled);

      // Handle editing: delete edited message and all subsequent messages
      let editIndex = -1;
      if (editingMessageId && activeChatId) {
        const msgs = activeMessages || [];
        editIndex = msgs.findIndex((m) => m.id === editingMessageId);
        if (editIndex >= 0) {
          const toDelete = msgs.slice(editIndex);
          const idsToDelete = toDelete.map((m) => m.id).filter(Boolean);
          // Mark as deleting
          idsToDelete.forEach((id) => deletingIdsRef.current.add(id));
          // Remove from local state
          setActiveMessages((prev) => prev.filter((m) => !idsToDelete.includes(m.id)));
          setPendingMessages((prev) => prev.filter((m) => !idsToDelete.includes(m.id)));
          // Delete from local store in background
          idsToDelete.forEach((id) => {
            deleteDoc(doc(db, "chats", activeChatId, "messages", id))
              .catch((e) => console.error("[edit] delete failed:", id, e))
              .finally(() => deletingIdsRef.current.delete(id));
          });
        }
      }

      let insertedOptimistic = false;
      let insertedAssistantPlaceholder = false;
      let optimisticId = null;
      let assistantPlaceholderId = null;
      let streamingMsgId = null;
      let timestampISO = null;
      let streamErrored = false;
      let streamErrorMessage = "";

      try {
        const { uid: authUid, idToken } = await ensureAuth();

        let chatId = options.chatId || activeChatId;
        let requestTitle =
          typeof options.title === "string" ? options.title : undefined;
        if (!chatId) {
          const derivedTitle =
            requestTitle && requestTitle.trim()
              ? formatChatTitle(requestTitle)
              : formatChatTitle(trimmed);
          requestTitle = derivedTitle;
          // Pass context IDs to createNewChat to persist them in the chat document
          chatId = await createNewChat(derivedTitle, {
            customShanId: options.customShanId,
            projectId: options.projectId,
          });
        }

        const modelCode = MODE_TO_MODEL_CODE[mode] || MODE_TO_MODEL_CODE.fast;
        // When editing, only include messages BEFORE the edited one
        // When regenerating, use the override history passed from regenerateMessage
        let historyMsgs;
        if (options._overrideHistory) {
          // Use explicitly passed history (for regeneration)
          historyMsgs = options._overrideHistory;
        } else {
          historyMsgs = activeMessages || [];
          if (editIndex >= 0) {
            historyMsgs = historyMsgs.slice(0, editIndex);
          }
        }
        const historySource =
          chatId === activeChatId
            ? [
                ...historyMsgs,
                ...pendingMessages.filter((msg) => msg.chatId === chatId),
              ]
            : [];
        const sanitizedHistory = prepareConversationMessages(historySource);
        const shouldUseMemory = Boolean(memoryReadEnabled && authUid);
        let memoryContext = "";
        let activeMemoryVersion = memoryVersion || "v4";
        let profileData = null;
        if (shouldUseMemory) {
          try {
            profileData = await memoryApiFetch("/memory/profile/get", {
              uid: authUid,
            });
            if (profileData?.memoryVersion) {
              activeMemoryVersion = profileData.memoryVersion;
              if (activeMemoryVersion !== memoryVersion) {
                setMemoryVersion(activeMemoryVersion);
              }
            }
            if (activeMemoryVersion === "v3" && profileData?.text) {
              setMemoryProfile(profileData.text);
            }
          } catch (err) {
            console.warn("Failed to refresh memory profile", err);
          }
        }
        if (shouldUseMemory) {
          if (activeMemoryVersion === "v3") {
            memoryContext = (profileData?.text || memoryProfile || "").trim();
          } else {
            try {
              const result = await memoryApiFetch("/memory/query", {
                uid: authUid,
                query: trimmed,
                topK: userPlanMemoryDepth || 8,
              });
              if (Array.isArray(result?.matches)) {
                memoryContext = result.matches
                  .map((match) => match?.node?.content || match?.content || "")
                  .filter(Boolean)
                  .map((content) => `- ${content}`)
                  .join("\n");
              }
            } catch (err) {
              console.warn("Memory query failed", err);
            }
          }
        }

        const historyPayload = [
          {
            role: "system",
            content: DEFAULT_SYSTEM_PROMPT,
          },
          ...(memoryContext
            ? [
                {
                  role: "system",
                  content: `MEMORY CONTEXT:\n${memoryContext}`,
                },
              ]
            : []),
          ...sanitizedHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        ];

        timestampISO = new Date().toISOString();
        if (!skipUserInsert) {
          optimisticId = `temp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        }
        const optimisticMessage = skipUserInsert
          ? null
          : {
              id: optimisticId,
              chatId,
              role: "user",
              content: trimmed,
              attachments: providedAttachments,
              metadata: {},
              mode,
              model_code: modelCode,
              ownerUid: authUid || null,
              ownerId: authUid || null,
              status: "sent",
              isError: false,
              error: null,
              tokens: null,
              created_at: timestampISO,
              updated_at: timestampISO,
              timestamp: timestampISO,
              isStreaming: false,
              isPlaceholder: true,
            };

        if (!skipUserInsert && optimisticMessage) {
          const userMessageRef = doc(db, "chats", chatId, "messages", optimisticMessage.id);
          await setDoc(userMessageRef, {
            ...optimisticMessage,
            isPlaceholder: false,
          });
          await updateDoc(doc(db, "chats", chatId), {
            updated_at: serverTimestamp(),
          });
        }

        assistantPlaceholderId = `temp-assistant-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const assistantPlaceholder = {
          id: assistantPlaceholderId,
          chatId,
          role: "assistant",
          content: "",
          text: "",
          answer: "",
          attachments: [],
          metadata: { thinking_enabled: thinkingEnabled },
          mode,
          model_code: modelCode,
          ownerUid: authUid || null,
          ownerId: authUid || null,
          status: "pending",
          isError: false,
          error: null,
          tokens: null,
          created_at: timestampISO,
          updated_at: timestampISO,
          timestamp: timestampISO,
          isStreaming: true,
          isPlaceholder: true,
          status_message: null,
          statusMessage: null,
          reasoning: null,
          // Show beautiful reasoning block immediately when thinking mode is enabled
          reasoning_segments: thinkingEnabled
            ? [
                {
                  id: `${assistantPlaceholderId}-reasoning`,
                  key: `${assistantPlaceholderId}-reasoning`,
                  content: "",
                  provider: "shannon",
                  providerKey: "shannon",
                  is_live: true,
                  hasContent: false,
                  attempt: 1,
                },
              ]
            : [],
          provider: "shannon",
          wasStopped: false,
        };

        const shouldOptimisticallyRender =
          !activeChatId || chatId === activeChatId;
        if (shouldOptimisticallyRender) {
          insertedOptimistic = Boolean(optimisticMessage);
          insertedAssistantPlaceholder = true;
          // Ensure activeChatId is set so activeChat memo includes pending messages
          if (chatId && chatId !== activeChatId) {
            setActiveChatId(chatId);
          }
          // Debug: log the placeholder being added
          console.log('[ChatContext] Adding assistant placeholder:', {
            id: assistantPlaceholder.id,
            provider: assistantPlaceholder.provider,
            mode,
            chatId,
          });
          // Add only to pendingMessages - activeChat memo will combine them
          setPendingMessages((prev) => [
            ...prev,
            ...(optimisticMessage ? [optimisticMessage] : []),
            assistantPlaceholder,
          ]);
        }

        console.log(
          "[Memory] shouldUseMemory:",
          shouldUseMemory,
          "version:",
          activeMemoryVersion,
          "memoryContext length:",
          memoryContext?.length || 0,
        );

        // Memory extraction will happen after assistant response is complete
        // This allows us to extract information from both user input AND assistant response

        // Use SSE streaming for real-time response
        const streamUrl = `${CHAT_ENDPOINT}?stream=true`;
        console.log("[SSE] Fetching:", streamUrl);
        // Create AbortController for cancel functionality
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        const response = await fetch(streamUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          signal: abortController.signal,
          body: JSON.stringify({
            prompt: trimmed,
            mode,
            model: modelCode,
            chatId,
            context: options.context || "",
            length: options.length || 4096,
            attachments: providedAttachments,
            history: historyPayload,
            title: requestTitle,
            memoryReadEnabled: shouldUseMemory,
            memoryWriteEnabled: memoryWriteEnabled && Boolean(authUid),
            memoryVersion: memoryVersion || "v4",
            regenOfUserId: regenOfUserId || undefined,
            skipUserInsert,
            billingTag: billingTag || undefined,
            thinkingEnabled,
            customShanId: options.customShanId || undefined,
            projectId: options.projectId || undefined,
          }),
        });

        // Log response info for debugging
        const contentType = response.headers.get("content-type") || "";
        console.log("[SSE] Response status:", response.status, "Content-Type:", contentType);

        // Check if server returned JSON instead of SSE (backend not updated)
        if (contentType.includes("application/json")) {
          console.warn("[SSE] Server returned JSON instead of SSE - backend may not be deployed");
          // Fall back to JSON handling
          const data = await response.json();
          setActiveChatId(chatId);
          const assistantContent =
            data?.choices?.[0]?.message?.content ??
            data?.choices?.[0]?.text ??
            data?.content ??
            "";
          if (insertedAssistantPlaceholder && assistantPlaceholderId) {
            const hydratedAssistant = {
              id: `assistant-${Date.now()}`,
              chatId,
              role: "assistant",
              content: assistantContent || "",
              reasoning: null,
              attachments: [],
              metadata: { thinking_enabled: thinkingEnabled },
              mode: mode || null,
              model_code: modelCode,
              ownerUid: authUid || null,
              ownerId: authUid || null,
              status: "sent",
              isError: false,
              error: null,
              tokens: data?.usage || null,
              created_at: timestampISO,
              updated_at: new Date().toISOString(),
              timestamp: timestampISO,
              isStreaming: false,
              isPlaceholder: false,
              statusMessage: null,
              provider: "Shannon",
              wasStopped: false,
            };
            setActiveMessages((prev) => {
              const withoutPlaceholder = prev.filter((msg) => msg.id !== assistantPlaceholderId);
              return [...withoutPlaceholder, hydratedAssistant];
            });
            setPendingMessages((prev) => prev.filter((msg) => msg.id !== assistantPlaceholderId));
            return hydratedAssistant;
          }
          return assistantContent || null;
        }

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(
            "[SSE] Server error response:",
            response.status,
            errorBody.slice(0, 2000),
          );
          let errorMessage = "Failed to send message";
          let parsed = null;
          try {
            parsed = JSON.parse(errorBody);
            if (parsed?.error === "QUOTA_EXCEEDED") {
              errorMessage = "You have used all available quota.";
            } else if (parsed?.message) {
              errorMessage = parsed.message;
            } else if (parsed?.error) {
              errorMessage = parsed.error;
            }
          } catch (parseErr) {
            if (response.status === 401) {
              errorMessage = "Authentication expired. Please sign in again.";
            } else if (response.status === 402) {
              errorMessage = "You have used all available quota.";
            } else {
              const errorTrimmed = errorBody.trim();
              if (errorTrimmed) {
                errorMessage = errorTrimmed;
              }
            }
          }
          throw new Error(errorMessage);
        }

        // SSE Stream reading
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let fullReasoning = "";
        let serverChatId = chatId;
        let serverMessageId = null;
        let serverUserMessageId = null;
        let finalAssistantData = null;
        streamingMsgId = assistantPlaceholderId;
        let stopStreaming = false;

      // Update the assistant placeholder to show streaming status
      const updateStreamingMessage = (updater) => {
          const applyUpdates = (msg) => {
            const updatePayload =
              typeof updater === "function" ? updater(msg) : updater;
            const nextUpdates =
              updatePayload && typeof updatePayload === "object"
                ? updatePayload
                : {};
            return { ...msg, ...nextUpdates, isStreaming: true };
          };

          flushSync(() => {
            setPendingMessages((prev) =>
              prev.map((msg) => {
                if (
                  (streamingMsgId && msg.id === streamingMsgId) ||
                  (!streamingMsgId &&
                    msg.role === "assistant" &&
                    (msg.isStreaming || msg.status === "streaming"))
                ) {
                  return applyUpdates(msg);
                }
                return msg;
              }),
            );
            setActiveMessages((prev) =>
              prev.map((msg) => {
                if (
                  (streamingMsgId && msg.id === streamingMsgId) ||
                  (serverMessageId && msg.id === serverMessageId) ||
                  (!streamingMsgId &&
                    msg.role === "assistant" &&
                    (msg.isStreaming || msg.status === "streaming"))
                ) {
                  return applyUpdates(msg);
                }
                return msg;
              }),
            );
          });
        };

        let reasoningBuffer = "";
        let reasoningDisplayed = "";
        let reasoningFlushTimer = null;

        const stopReasoningFlushTimer = () => {
          if (reasoningFlushTimer) {
            clearTimeout(reasoningFlushTimer);
            reasoningFlushTimer = null;
          }
        };

        const flushReasoningBuffer = (force = false) => {
          if (!reasoningBuffer && !force) {
            return;
          }

          // Always flush entire buffer immediately for smooth streaming display
          let toFlush = reasoningBuffer;
          reasoningBuffer = "";

          if (!toFlush) {
            return;
          }

          reasoningDisplayed += toFlush;
          updateStreamingMessage((msg) => {
            const existingSegments = Array.isArray(msg.reasoning_segments)
              ? [...msg.reasoning_segments]
              : [];
            if (existingSegments.length === 0) {
              existingSegments.push({
                id: `${assistantPlaceholderId}-reasoning`,
                key: `${assistantPlaceholderId}-reasoning`,
                content: "",
                provider: "shannon",
                providerKey: "shannon",
                is_live: true,
                hasContent: false,
                attempt: 1,
              });
            }
            existingSegments[0] = {
              ...existingSegments[0],
              content: reasoningDisplayed,
              hasContent: Boolean((reasoningDisplayed || "").trim()),
            };
            return {
              reasoning: reasoningDisplayed,
              reasoning_segments: existingSegments,
              status_message: null,
            };
          });
        };

        const scheduleReasoningFlush = () => {
          // Flush immediately for real-time streaming display
          flushReasoningBuffer(true);
        };

        try {
          console.log("[SSE] Starting stream read");
          let chunkCount = 0;
          while (true) {
            if (stopStreaming) {
              break;
            }
            const { done, value } = await reader.read();
            if (done) {
              console.log("[SSE] Stream complete after", chunkCount, "chunks");
              break;
            }
            chunkCount++;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            if (chunkCount <= 5) {
              console.log("[SSE] Received chunk #" + chunkCount + ":", chunk.substring(0, 200));
            }

            // SSE events are separated by double newlines
            const events = buffer.split("\n\n");
            // Keep the last incomplete event in buffer
            buffer = events.pop() || "";

            for (const eventBlock of events) {
              if (stopStreaming) {
                break;
              }
              // Each event block can have multiple lines (e.g., "event: type\ndata: {...}")
              const lines = eventBlock.split("\n");
              for (const line of lines) {
                if (stopStreaming) {
                  break;
                }
                if (!line.startsWith("data: ")) continue;
                const jsonStr = line.slice(6).trim();
                if (!jsonStr) continue;

                let event;
                try {
                  event = JSON.parse(jsonStr);
                  console.log("[SSE] Parsed event type:", event.type);
                } catch (parseErr) {
                  console.warn("Failed to parse SSE event:", jsonStr.substring(0, 100));
                  continue;
                }

                if (event.type === "ping") {
                  // Initial ping to start stream - ignore
                  console.log("[SSE] Received ping, stream is active");
                  continue;
                } else if (event.type === "start") {
                  // Got server IDs - transition from optimistic/placeholder to real messages
                  serverChatId = event.chatId || chatId;
                  serverMessageId = event.messageId;
                  serverUserMessageId = event.userMessageId;
                  streamingMsgId = serverMessageId; // Use the real server ID for streaming updates

                  // Use flushSync to ensure all state updates happen atomically
                  // This prevents any intermediate renders where messages might be missing
                  flushSync(() => {
                    setActiveChatId(serverChatId);

                    // Build hydrated messages using the objects we created earlier (available in closure)
                    const hydratedUserMessage = (insertedOptimistic && optimisticMessage && serverUserMessageId)
                      ? {
                          ...optimisticMessage,
                          id: serverUserMessageId,
                          chatId: serverChatId,
                          isPlaceholder: false,
                        }
                      : null;

                    const streamingAssistant = serverMessageId
                      ? {
                          ...assistantPlaceholder,
                          id: serverMessageId,
                          chatId: serverChatId,
                          isStreaming: true,
                          isPlaceholder: false,
                          status: "streaming",
                          statusMessage: null,
                          status_message: null,
                        }
                      : null;

                    // Update activeMessages with hydrated messages
                    setActiveMessages((prev) => {
                      let updated = [...prev];

                      if (hydratedUserMessage) {
                        const existingIdx = updated.findIndex((m) => m.id === hydratedUserMessage.id);
                        if (existingIdx >= 0) {
                          updated[existingIdx] = { ...updated[existingIdx], ...hydratedUserMessage };
                        } else {
                          updated.push(hydratedUserMessage);
                        }
                      }

                      if (streamingAssistant) {
                        const existingIdx = updated.findIndex((m) => m.id === streamingAssistant.id);
                        if (existingIdx >= 0) {
                          updated[existingIdx] = { ...updated[existingIdx], ...streamingAssistant };
                        } else {
                          updated.push(streamingAssistant);
                        }
                      }

                      return updated;
                    });

                    // Remove all placeholders from pendingMessages
                    const idsToRemove = new Set();
                    if (optimisticId) idsToRemove.add(optimisticId);
                    if (assistantPlaceholderId) idsToRemove.add(assistantPlaceholderId);

                    if (idsToRemove.size > 0) {
                      setPendingMessages((prev) =>
                        prev.filter((msg) => !idsToRemove.has(msg.id))
                      );
                    }

                    insertedOptimistic = false;
                  });
                } else if (event.type === "reasoning") {
                  // Streaming reasoning content - use reasoning_segments for beautiful animated block
                  const reasoningChunk = event.content || "";
                  fullReasoning += reasoningChunk;
                  reasoningBuffer += reasoningChunk;
                  scheduleReasoningFlush();
                } else if (event.type === "thinking_done") {
                  // Reasoning phase complete - turn off is_live animation
                  stopReasoningFlushTimer();
                  flushReasoningBuffer(true);
                  updateStreamingMessage((msg) => {
                    const updatedSegments = Array.isArray(msg.reasoning_segments)
                      ? [...msg.reasoning_segments]
                      : [];
                    if (updatedSegments.length === 0) {
                      updatedSegments.push({
                        id: `${assistantPlaceholderId}-reasoning`,
                        key: `${assistantPlaceholderId}-reasoning`,
                        content: "",
                        provider: "shannon",
                        providerKey: "shannon",
                        is_live: false,
                        hasContent: false,
                        attempt: 1,
                      });
                    }
                    updatedSegments[0] = {
                      ...updatedSegments[0],
                      content: reasoningDisplayed || fullReasoning,
                      is_live: false,
                      hasContent: Boolean(
                        (reasoningDisplayed || fullReasoning || "").trim(),
                      ),
                    };
                    return {
                      reasoning: reasoningDisplayed || fullReasoning,
                      reasoning_segments: updatedSegments,
                      thinkingComplete: true,
                      thinkingActive: false,
                      status_message: null,
                    };
                  });
                } else if (event.type === "chunk") {
                  // Streaming answer content - use 'text' field for Chat.jsx compatibility
                  const chunkText = event.content || "";
                  fullContent += chunkText;
                  updateStreamingMessage({
                    content: fullContent,
                    text: fullContent,
                    answer: fullContent,
                    status_message: null,
                  });
                } else if (event.type === "error") {
                  // Handle error from stream
                  let errorMessage = event.message || "Stream error";
                  if (event.error === "QUOTA_EXCEEDED") {
                    errorMessage = "You have used all available quota.";
                  }
                  throw new Error(errorMessage);
                } else if (event.type === "done") {
                  // Stream complete - finalize
                  serverChatId = event.chatId || serverChatId;
                  serverMessageId = event.messageId || serverMessageId;

                  finalAssistantData = {
                    id: serverMessageId || assistantPlaceholderId,
                    chatId: serverChatId,
                    role: "assistant",
                    content: event.content || fullContent,
                    reasoning: null,
                    reasoning_segments: [],
                    attachments: [],
                    metadata: { thinking_enabled: thinkingEnabled },
                    mode: mode || null,
                    model_code: modelCode,
                    ownerUid: authUid || null,
                    ownerId: authUid || null,
                    status: "sent",
                    isError: false,
                    error: null,
                    tokens: event.usage || null,
                    created_at: timestampISO,
                    updated_at: new Date().toISOString(),
                    timestamp: timestampISO,
                    isStreaming: false,
                    isPlaceholder: false,
                    statusMessage: null,
                    provider: "Shannon",
                    wasStopped: false,
                  };
                }
              }
            }
          }
        } finally {
          stopReasoningFlushTimer();
          flushReasoningBuffer(true);
          reader.releaseLock();
        }

        // Finalize the assistant message
        if (finalAssistantData) {
          console.log('[SSE done] Finalizing assistant message:', {
            id: finalAssistantData.id,
            isPlaceholder: finalAssistantData.isPlaceholder,
            isStreaming: finalAssistantData.isStreaming,
            contentLength: finalAssistantData.content?.length,
          });
          setActiveMessages((prev) => {
            console.log('[SSE done] Before filter, activeMessages count:', prev.length,
              'ids:', prev.map(m => m.id));
            const withoutPlaceholder = prev.filter(
              (msg) =>
                msg.id !== assistantPlaceholderId &&
                msg.id !== streamingMsgId
            );
            console.log('[SSE done] After filter, count:', withoutPlaceholder.length);
            if (withoutPlaceholder.some((msg) => msg.id === finalAssistantData.id)) {
              console.log('[SSE done] Message already exists, not adding');
              return withoutPlaceholder;
            }
            console.log('[SSE done] Adding finalAssistantData');
            return [...withoutPlaceholder, finalAssistantData];
          });
          setPendingMessages((prev) =>
            prev.filter(
              (msg) =>
                msg.id !== assistantPlaceholderId &&
                msg.id !== streamingMsgId
            )
          );
          insertedAssistantPlaceholder = false;
        } else if (fullContent) {
          // No done event but we have content - create final message
          const fallbackId = serverMessageId || `assistant-${Date.now()}`;
          const fallbackAssistant = {
            id: fallbackId,
            chatId: serverChatId,
            role: "assistant",
            content: fullContent,
            reasoning: fullReasoning || null,
            reasoning_segments: fullReasoning ? [{
              id: `${fallbackId}-reasoning`,
              content: fullReasoning,
              provider: "shannon",
              is_live: false,
              attempt: 1,
            }] : [],
            attachments: [],
            metadata: { thinking_enabled: thinkingEnabled },
            mode: mode || null,
            model_code: modelCode,
            ownerUid: authUid || null,
            ownerId: authUid || null,
            status: "sent",
            isError: false,
            error: null,
            tokens: null,
            created_at: timestampISO,
            updated_at: new Date().toISOString(),
            timestamp: timestampISO,
            isStreaming: false,
            isPlaceholder: false,
            statusMessage: null,
            provider: "Shannon",
            wasStopped: false,
          };
          setActiveMessages((prev) => {
            const withoutPlaceholder = prev.filter(
              (msg) =>
                msg.id !== assistantPlaceholderId &&
                msg.id !== streamingMsgId
            );
            return [...withoutPlaceholder, fallbackAssistant];
          });
          setPendingMessages((prev) =>
            prev.filter(
              (msg) =>
                msg.id !== assistantPlaceholderId &&
                msg.id !== streamingMsgId
            )
          );
          insertedAssistantPlaceholder = false;
          finalAssistantData = fallbackAssistant;
        }

        if (finalAssistantData?.chatId && finalAssistantData?.id) {
          try {
            const assistantRef = doc(
              db,
              "chats",
              finalAssistantData.chatId,
              "messages",
              finalAssistantData.id,
            );
            await setDoc(assistantRef, {
              ...finalAssistantData,
              isPlaceholder: false,
              isStreaming: false,
            });
            await updateDoc(doc(db, "chats", finalAssistantData.chatId), {
              updated_at: serverTimestamp(),
            });
          } catch (err) {
            console.error("Failed to persist assistant message", err);
          }
        }

        if (streamErrored) {
          throw new Error(streamErrorMessage || "Stream error");
        }

        // Extract memory from USER message only (async, fire-and-forget)
        // Only extract from what the user explicitly said - never from assistant responses
        if (!skipUserInsert && memoryWriteEnabled && authUid && trimmed) {
          const fireAndForget = async () => {
            try {
              if (activeMemoryVersion === "v3") {
                const existing = (memoryProfile || "").trim();
                const combined = existing ? `${existing}\n${trimmed}` : trimmed;
                const nextText = clampWords(combined, effectiveMemorySize);
                await memoryApiFetch("/memory/profile/set", {
                  uid: authUid,
                  memoryVersion: "v3",
                  text: nextText,
                });
                setMemoryProfile(nextText);
              } else {
                await memoryApiFetch("/memory/node/upsert", {
                  uid: authUid,
                  node: {
                    type: "fact",
                    category: "personal",
                    content: trimmed,
                    tags: [],
                    importance: 5,
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp(),
                    source: "chat",
                  },
                });
              }
            } catch (err) {
              console.error("[Memory] Memory upsert failed", err);
            }
          };
          void fireAndForget();
        }

        return finalAssistantData;
      } catch (error) {
        // Don't show error for user-initiated abort
        if (error.name === 'AbortError') {
          console.log("[SSE] Request aborted by user");
          return null;
        }
        if (!streamErrored) {
          if (insertedOptimistic && optimisticId) {
            setActiveMessages((prev) =>
              prev.filter((msg) => msg.id !== optimisticId),
            );
            setPendingMessages((prev) =>
              prev.filter((msg) => msg.id !== optimisticId),
            );
          }
          if (insertedAssistantPlaceholder && assistantPlaceholderId) {
            setActiveMessages((prev) =>
              prev.filter(
                (msg) =>
                  msg.id !== assistantPlaceholderId &&
                  msg.id !== streamingMsgId,
              ),
            );
            setPendingMessages((prev) =>
              prev.filter(
                (msg) =>
                  msg.id !== assistantPlaceholderId &&
                  msg.id !== streamingMsgId,
              ),
            );
            insertedAssistantPlaceholder = false;
          }
        }
        setLastError(
          error.message || "Something went wrong while sending message.",
        );
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [
      activeChatId,
      activeMessages,
      pendingMessages,
      ensureAuth,
      createNewChat,
      memoryReadEnabled,
      memoryWriteEnabled,
      memoryProfile,
      memoryVersion,
      effectiveMemorySize,
      userPlanMemoryDepth,
    ],
  );

  const deleteMessage = useCallback(async (chatId, messageId) => {
    if (!chatId || !messageId) return;
    const current = auth.currentUser;
    if (!current) return;
    const messageRef = doc(db, "chats", chatId, "messages", messageId);
    const snapshot = await getDoc(messageRef);
    if (!snapshot.exists()) return;
    const data = snapshot.data();
    const messageOwner = data?.ownerUid || data?.ownerId || null;
    if (messageOwner && messageOwner !== current.uid) {
      throw new Error("You can only delete your own messages.");
    }
    await deleteDoc(messageRef);
  }, []);

  const regenerateMessage = useCallback(
    async (maybeAssistantId, maybeChatId) => {
      const fromAssistantId =
        typeof maybeAssistantId === "string"
          ? maybeAssistantId
          : (maybeAssistantId &&
              (maybeAssistantId.fromAssistantId || maybeAssistantId.id)) ||
            null;
      const targetChatId = maybeChatId || activeChatId;
      if (!fromAssistantId || !targetChatId || targetChatId !== activeChatId) {
        return;
      }
      const messages = activeMessages || [];
      const aiIdx = messages.findIndex(
        (msg) =>
          msg?.id === fromAssistantId &&
          (msg?.role || "").toLowerCase() === "assistant",
      );
      if (aiIdx < 0) {
        return;
      }

      const precedingUserIdx = [...messages.slice(0, aiIdx)]
        .reverse()
        .findIndex((msg) => (msg?.role || "").toLowerCase() === "user");
      if (precedingUserIdx < 0) {
        return;
      }
      const absoluteUserIdx = aiIdx - 1 - precedingUserIdx;
      const userMsg = messages[absoluteUserIdx];
      if (!userMsg || !userMsg.content) {
        return;
      }

      // Compute filtered history BEFORE state updates (since state updates are async)
      // For regeneration: include all messages BEFORE the user message that triggered the response
      // (NOT including the user message itself, since it's sent as the prompt and backend adds it)
      const filteredHistory = messages.slice(0, absoluteUserIdx);

      // Get all messages to delete: the assistant message + all messages after it
      const messagesToDelete = messages.slice(aiIdx);
      const idsToDelete = messagesToDelete.map((m) => m.id).filter(Boolean);

      // Mark all as deleting to prevent snapshot from re-adding
      idsToDelete.forEach((id) => deletingIdsRef.current.add(id));

      setActiveMessages((prev) =>
        prev.filter((msg) => !idsToDelete.includes(msg.id)),
      );
      setPendingMessages((prev) =>
        prev.filter((msg) => !idsToDelete.includes(msg.id)),
      );

      // Delete all messages from local store
      try {
        await Promise.all(
          idsToDelete.map((id) =>
            deleteDoc(doc(db, "chats", targetChatId, "messages", id)).catch(
              (err) => console.error(`Failed to delete message ${id}:`, err),
            ),
          ),
        );
      } catch (err) {
        console.error("Failed to delete messages before regeneration", err);
      } finally {
        idsToDelete.forEach((id) => deletingIdsRef.current.delete(id));
      }

      await sendMessage(userMsg.content, userMsg.mode || "balanced", {
        chatId: targetChatId,
        skipUserInsert: true,
        regenOfUserId: userMsg.id,
        billingTag: "CHAT_REGEN",
        _overrideHistory: filteredHistory,
      });
    },
    [activeChatId, activeMessages, deleteMessage, sendMessage],
  );

  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSending(false);
  }, []);

  const renameChat = useCallback(async (chatId, nextTitle) => {
    if (!chatId || !nextTitle) return;
    await updateDoc(doc(db, "chats", chatId), {
      title: nextTitle.trim() || DEFAULT_TITLE,
      updated_at: serverTimestamp(),
    });
  }, []);

  const deleteChat = useCallback(
    async (chatId) => {
      if (!chatId) return;
      const current = auth.currentUser;
      if (!current) return;
      const chatRef = doc(db, "chats", chatId);
      const snapshot = await getDoc(chatRef);
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const chatOwner = data?.ownerUid || data?.ownerId || null;
      if (chatOwner && chatOwner !== current.uid) {
        throw new Error("You can only delete your own chats.");
      }
      const messagesSnapshot = await getDocs(
        collection(db, "chats", chatId, "messages"),
      );
      const batch = writeBatch(db);
      messagesSnapshot.forEach((messageDoc) => batch.delete(messageDoc.ref));
      batch.delete(chatRef);
      await batch.commit();
      if (activeChatId === chatId) {
        setActiveChatId(null);
      }
    },
    [activeChatId],
  );

  const resetMemoryProfile = useCallback(async () => {
    const { uid } = await ensureAuth();
    try {
      await memoryApiFetch("/memory/reset", { uid });
      setMemoryProfile("");
    } catch (err) {
      console.error("Failed to reset memory profile", err);
      throw err;
    }
  }, [ensureAuth]);

  // Get context IDs for a specific chat (used when restoring context on chat selection)
  const getChatContextIds = useCallback(
    (chatId) => {
      if (!chatId) return { customShanId: null, projectId: null };
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return { customShanId: null, projectId: null };
      return {
        customShanId: chat.customShanId || null,
        projectId: chat.projectId || null,
      };
    },
    [chats]
  );

  const value = useMemo(
    () => ({
      chats,
      activeChat,
      activeChatId,
      setActiveChatId,
      createNewChat,
      beginNewChat,
      draftChat,
      renameChat,
      deleteChat,
      sendMessage,
      regenerateMessage,
      deleteMessage,
      cancelStreaming,
      isSending,
      lastError,
      clearError,
      memoryProfile,
      memoryVersion,
      memoryEnabled,
      setMemoryEnabled,
      toggleMemoryEnabled,
      memoryReadEnabled,
      setMemoryReadEnabled,
      toggleMemoryReadEnabled,
      memoryWriteEnabled,
      setMemoryWriteEnabled,
      toggleMemoryWriteEnabled,
      memorySizeSetting,
      setMemorySizeSetting,
      userPlanMemoryLimit,
      userPlanMemoryDepth,
      effectiveMemorySize,
      resetMemoryProfile,
      applyMermaidFix,
      getChatContextIds,
    }),
    [
      chats,
      activeChat,
      activeChatId,
      createNewChat,
      beginNewChat,
      draftChat,
      renameChat,
      deleteChat,
      sendMessage,
      regenerateMessage,
      deleteMessage,
      cancelStreaming,
      isSending,
      lastError,
      clearError,
      memoryProfile,
      memoryVersion,
      memoryEnabled,
      setMemoryEnabled,
      toggleMemoryEnabled,
      memoryReadEnabled,
      setMemoryReadEnabled,
      toggleMemoryReadEnabled,
      memoryWriteEnabled,
      setMemoryWriteEnabled,
      toggleMemoryWriteEnabled,
      memorySizeSetting,
      setMemorySizeSetting,
      userPlanMemoryLimit,
      userPlanMemoryDepth,
      effectiveMemorySize,
      resetMemoryProfile,
      applyMermaidFix,
      getChatContextIds,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
