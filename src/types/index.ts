// Core type definitions for RealuseAI frontend

// User types
export interface User {
  id: string;
  username: string;
  role: string;
  planSlug?: string;
  balanceCents?: number;
  email?: string | null;
  avatar?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  user: User;
  preferences: UserPreferences;
  stats: UserStats;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoSave: boolean;
  language: string;
}

export interface UserStats {
  totalChats: number;
  totalMessages: number;
  totalTokensUsed: number;
  lastActiveAt: string;
}

// Message types
export interface Message {
  id: string;
  chatId: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  status?: 'sending' | 'sent' | 'error' | 'regenerating' | 'pending' | 'streaming' | string;
  statusMessage?: string | null;
  metadata?: MessageMetadata & Record<string, any>;
  attachments?: Attachment[];
  isStreaming?: boolean;
  isPlaceholder?: boolean;
  wasStopped?: boolean;
  isError?: boolean;
  error?: string | null;
  tokens?: any;
  mode?: string | null;
  model_code?: string | null;
  provider?: string | null;
  reasoning?: string | null;
  thinkingActive?: boolean;
  thinkingComplete?: boolean;
  rawContent?: string;
}

export interface MessageMetadata {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: string;
  thinkingTime?: number;
  sources?: Source[];
  confidence?: number;
  thinking_enabled?: boolean;
  billing_feature?: string;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  snippet: string;
  relevanceScore: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail?: string;
  uploadedAt?: string;
  status?: 'loading' | 'ready' | 'error';
  remoteId?: string;
  remoteUrl?: string;
  downloadUrl?: string;
  storageKey?: string | null;
  contentType?: string | null;
  content?: string | null;
  textContent?: string | null;
  dataUrl?: string | null;
  isText?: boolean;
  truncated?: boolean;
  error?: string | null;
  preview?: {
    kind: 'text';
    text: string;
  } | {
    kind: 'image';
    url: string;
  };
  metadata?: Record<string, unknown>;
}

// Chat types
export interface Chat {
  id: string;
  title: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
  settings: ChatSettings;
  isArchived: boolean;
  isPinned: boolean;
}

export interface ChatSettings {
  model: string;
  provider: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  includeMemory: boolean;
  enableWebSearch: boolean;
  enableCodeExecution: boolean;
}

export interface ChatSession {
  chat: Chat;
  messages: Message[];
  isLoading: boolean;
  error?: string;
  streamingMessageId?: string;
}

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  chatId?: string;
  attachments?: Attachment[];
  options?: ChatOptions;
}

export interface ChatOptions {
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  stream?: boolean;
  includeMemory?: boolean;
  enableWebSearch?: boolean;
}

export interface ChatResponse {
  id: string;
  content: string;
  role: 'assistant';
  timestamp: string;
  metadata: MessageMetadata;
  usage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

// Memory types
export interface Memory {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'fact' | 'preference' | 'instruction' | 'context';
  importance: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface MemorySearchResult {
  memories: Memory[];
  query: string;
  totalResults: number;
  relevantContext: string;
}

// Component prop types
export interface ChatComponentProps {
  chatId?: string;
  initialMessages?: Message[];
  onMessageSent?: (message: Message) => void;
  onMessageRegenerate?: (messageId: string) => void;
  onMessageEdit?: (messageId: string, newContent: string) => void;
  onMessageDelete?: (messageId: string) => void;
  onAttachmentUpload?: (files: File[]) => Promise<Attachment[]>;
  showSettings?: boolean;
  className?: string;
}

export interface MessageComponentProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  showMetadata?: boolean;
  className?: string;
}

export interface ChatListProps {
  chats: Chat[];
  activeChatId?: string;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onArchiveChat: (chatId: string) => void;
  onPinChat: (chatId: string) => void;
  loading?: boolean;
  className?: string;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
  activeChatId?: string;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  user?: User;
  className?: string;
}

// Hook types
export interface UseChatReturn {
  chat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, options?: ChatOptions) => Promise<void>;
  regenerateMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  clearChat: () => Promise<void>;
  updateChatSettings: (settings: Partial<ChatSettings>) => Promise<void>;
}

export interface UseChatsReturn {
  chats: Chat[];
  isLoading: boolean;
  error: string | null;
  createChat: (title?: string) => Promise<Chat>;
  deleteChat: (chatId: string) => Promise<void>;
  updateChat: (chatId: string, updates: Partial<Chat>) => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  pinChat: (chatId: string) => Promise<void>;
  refreshChats: () => Promise<void>;
}

export interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  logout: () => Promise<void>;
}

export interface UseMemoryReturn {
  memories: Memory[];
  isLoading: boolean;
  error: string | null;
  addMemory: (memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Memory>;
  updateMemory: (memoryId: string, updates: Partial<Memory>) => Promise<void>;
  deleteMemory: (memoryId: string) => Promise<void>;
  searchMemories: (query: string) => Promise<MemorySearchResult>;
}

// Context types
export interface AppContextType {
  user: User | null;
  theme: 'light' | 'dark' | 'system';
  isLoading: boolean;
  error: string | null;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setError: (error: string | null) => void;
  logout: () => Promise<void>;
}

export interface ChatContextType {
  currentChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  streamingMessageId: string | null;
  setCurrentChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStreamingMessageId: (messageId: string | null) => void;
}

// UI state types
export interface UIState {
  sidebarOpen: boolean;
  settingsPanelOpen: boolean;
  attachmentPanelOpen: boolean;
  memoryPanelOpen: boolean;
  activePanel: 'chat' | 'settings' | 'memory' | 'attachments';
}

export interface UIAction {
  type: 'TOGGLE_SIDEBAR' | 'OPEN_SETTINGS' | 'CLOSE_SETTINGS' | 'OPEN_ATTACHMENTS' | 'CLOSE_ATTACHMENTS' | 'OPEN_MEMORY' | 'CLOSE_MEMORY' | 'SET_ACTIVE_PANEL';
  payload?: any;
}

// Settings types
export interface AppSettings {
  general: GeneralSettings;
  chat: ChatSettingsDefaults;
  privacy: PrivacySettings;
  advanced: AdvancedSettings;
}

export interface GeneralSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  autoSave: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export interface ChatSettingsDefaults {
  defaultModel: string;
  defaultProvider: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  includeMemoryByDefault: boolean;
  enableWebSearchByDefault: boolean;
}

export interface PrivacySettings {
  saveHistory: boolean;
  shareAnalytics: boolean;
  allowCrashReporting: boolean;
  dataRetentionDays: number;
}

export interface AdvancedSettings {
  enableDebugMode: boolean;
  customApiEndpoint?: string;
  requestTimeout: number;
  maxRetries: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

// Error types
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export interface ErrorInfo {
  componentStack: string;
}

// Form types
export interface LoginForm {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterForm {
  username: string;
  password: string;
  email?: string;
  confirmPassword?: string;
  agreeToTerms?: boolean;
}

export interface ChatSettingsForm {
  model: string;
  provider: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  includeMemory: boolean;
  enableWebSearch: boolean;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState {
  values: Record<string, any>;
  errors: ValidationError[];
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type ID = string;
export type Timestamp = string;
export type OptionalId = Partial<{ id: ID }>;

// Event types
export interface ChatEvent {
  type: 'message_sent' | 'message_received' | 'message_updated' | 'message_deleted' | 'chat_created' | 'chat_updated' | 'chat_deleted';
  payload: any;
  timestamp: Timestamp;
}

export interface UserEvent {
  type: 'user_logged_in' | 'user_logged_out' | 'user_updated' | 'preferences_updated';
  payload: any;
  timestamp: Timestamp;
}

// Search types
export interface SearchQuery {
  query: string;
  type?: 'chats' | 'messages' | 'memories' | 'all';
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface SearchFilters {
  dateRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  chatId?: string;
  messageType?: 'user' | 'assistant' | 'system';
  tags?: string[];
}

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  hasMore: boolean;
  query: SearchQuery;
}

// Analytics types
export interface ChatAnalytics {
  totalChats: number;
  totalMessages: number;
  averageMessagesPerChat: number;
  mostUsedModel: string;
  totalTokensUsed: number;
  averageResponseTime: number;
  chatCreationTrend: Array<{
    date: string;
    count: number;
  }>;
}

export interface UserAnalytics {
  activeUsers: number;
  newUsers: number;
  retentionRate: number;
  averageSessionDuration: number;
  topFeatures: Array<{
    feature: string;
    usage: number;
  }>;
}
