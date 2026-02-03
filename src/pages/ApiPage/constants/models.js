// Model definitions for API documentation

export const MODELS = [
  {
    id: "shannon-1.6-lite",
    name: "Shannon 1.6 Lite",
    description: "Fast responses for lightweight tasks",
    contextWindow: "256K",
    bestFor: "Quick chats, short answers, fast iteration",
    icon: "balanced",
  },
  {
    id: "shannon-1.6-pro",
    name: "Shannon 1.6 Pro",
    description: "Maximum reasoning depth for complex work",
    contextWindow: "256K",
    bestFor: "Deep reasoning, long-form analysis, complex tasks",
    icon: "deep",
  },
];

export const MODEL_FEATURES = {
  "shannon-1.6-lite": {
    streaming: true,
  },
  "shannon-1.6-pro": {
    streaming: true,
  },
};
