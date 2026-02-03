// Feature cards for API capabilities section

export const FEATURES = [
  {
    icon: "plug",
    title: "Chat Completions",
    description: "Role-based chat endpoint for system, user, and assistant messages.",
    tag: "Core",
    color: "#3b82f6",
  },
  {
    icon: "zap",
    title: "Streaming",
    description: "Server-sent events for real-time responses.",
    tag: "SSE",
    color: "#ef4444",
  },
  {
    icon: "refresh-cw",
    title: "Long Context",
    description: "Large context window for complex tasks and long conversations.",
    tag: "Context",
    color: "#10b981",
  },
];

export const OVERVIEW_CARDS = [
  {
    title: "Chat Endpoint",
    badge: "Base URL",
    valueKey: "chat",
    description: "Use the chat completions endpoint for all requests.",
  },
  {
    title: "Authentication",
    badge: "Headers",
    value: "Authorization: Bearer <your-key>",
    description: "Use your Shannon API key with Bearer auth.",
  },
  {
    title: "Models",
    badge: "IDs",
    value: "shannon-1.6-lite / shannon-1.6-pro",
    description: "Lite for speed, Pro for maximum reasoning depth.",
  },
  {
    title: "Status",
    badge: "Access",
    value: "Public docs - Key required to call",
    description: "Streaming supported. Usage tracking available for signed-in users.",
  },
];

export const CHECKLIST_ITEMS = [
  {
    title: "Set your base URL",
    detail: "Point your client to the Shannon chat endpoint.",
    badge: "Setup",
  },
  {
    title: "Attach your API key",
    detail: "Use Bearer auth in the Authorization header.",
    badge: "Security",
  },
  {
    title: "Pick a model",
    detail: "Choose shannon-1.6-lite or shannon-1.6-pro.",
    badge: "Models",
  },
  {
    title: "Enable streaming",
    detail: "Set stream=true for real-time responses.",
    badge: "UX",
  },
];

export const ERROR_CODES = [
  { code: 400, name: "Bad Request", description: "Invalid request format or parameters" },
  { code: 401, name: "Unauthorized", description: "Invalid or missing API key" },
  { code: 402, name: "Quota Exceeded", description: "Token quota exceeded" },
  { code: 429, name: "Rate Limited", description: "Too many requests, slow down" },
  { code: 500, name: "Server Error", description: "Internal error, retry later" },
];
