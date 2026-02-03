// Navigation sections for API documentation

export const DOCS_SECTIONS = [
  { id: "overview", title: "Overview", icon: "compass" },
  { id: "capabilities", title: "Capabilities", icon: "zap" },
  { id: "quickstart", title: "Quick Start", icon: "rocket" },
  { id: "playground", title: "Playground", icon: "play", isNew: true },
  { id: "authentication", title: "Authentication", icon: "lock" },
  { id: "models", title: "Models", icon: "cpu" },
  { id: "streaming", title: "Streaming", icon: "radio" },
  { id: "errors", title: "Error Handling", icon: "alert-triangle" },
  { id: "changelog", title: "Changelog", icon: "clock" },
  { id: "your-api-key", title: "Your API Key", icon: "key", authOnly: true },
  { id: "usage", title: "Usage & Billing", icon: "bar-chart-2", authOnly: true },
];

export const SEARCHABLE_CONTENT = [
  { id: "overview-intro", section: "overview", title: "Overview", keywords: ["introduction", "getting started", "endpoints", "base url"] },
  { id: "quickstart-python", section: "quickstart", title: "Python Quick Start", keywords: ["python", "requests", "install", "pip"] },
  { id: "quickstart-js", section: "quickstart", title: "JavaScript Quick Start", keywords: ["javascript", "node", "npm", "typescript", "fetch"] },
  { id: "quickstart-curl", section: "quickstart", title: "cURL Quick Start", keywords: ["curl", "http", "rest", "api"] },
  { id: "auth-bearer", section: "authentication", title: "Bearer Authentication", keywords: ["authorization", "header", "token", "bearer"] },
  { id: "models-lite", section: "models", title: "Shannon 1.6 Lite", keywords: ["shannon-1.6-lite", "fast", "lite"] },
  { id: "models-pro", section: "models", title: "Shannon 1.6 Pro", keywords: ["shannon-1.6-pro", "reasoning", "pro"] },
  { id: "streaming", section: "streaming", title: "Streaming", keywords: ["stream", "sse", "server-sent events", "real-time"] },
  { id: "errors-401", section: "errors", title: "Authentication Errors", keywords: ["401", "unauthorized", "invalid key"] },
  { id: "errors-429", section: "errors", title: "Rate Limiting", keywords: ["429", "rate limit", "too many requests"] },
  { id: "errors-402", section: "errors", title: "Quota Errors", keywords: ["402", "quota", "exceeded", "billing"] },
];
