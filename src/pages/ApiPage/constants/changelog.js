// Changelog for API versions

export const CHANGELOG = [
  {
    version: "3.0.0",
    date: "2026-01-25",
    changes: [
      { type: "feature", text: "Added Shannon 1.6 Lite and Pro models" },
      { type: "feature", text: "Expanded context window support" },
      { type: "improvement", text: "Streaming stability improvements" },
    ],
  },
  {
    version: "2.5.0",
    date: "2025-11-12",
    changes: [
      { type: "feature", text: "API key management and usage tracking" },
      { type: "improvement", text: "Faster chat completion latency" },
    ],
  },
  {
    version: "1.0.0",
    date: "2024-10-01",
    changes: [
      { type: "feature", text: "Initial API release" },
      { type: "feature", text: "Chat completions endpoint" },
      { type: "feature", text: "Streaming via Server-Sent Events" },
    ],
  },
];

export const CHANGE_TYPE_STYLES = {
  feature: { color: "#10b981", label: "New" },
  improvement: { color: "#3b82f6", label: "Improved" },
  fix: { color: "#f59e0b", label: "Fixed" },
  breaking: { color: "#ef4444", label: "Breaking" },
  deprecated: { color: "#6b7280", label: "Deprecated" },
};
