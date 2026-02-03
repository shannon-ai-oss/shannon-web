// Code examples for the API documentation

export const CODE_EXAMPLES = {
  quickstart: {
    curl: (apiKey, endpoint) => `curl -X POST "${endpoint}" \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "shannon-1.6-pro",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello, Shannon!"}
    ],
    "max_tokens": 1024
  }'`,
    python: (apiKey, endpoint) => `import requests

url = "${endpoint}"
headers = {
    "Authorization": "Bearer ${apiKey || 'YOUR_API_KEY'}",
    "Content-Type": "application/json",
}

payload = {
    "model": "shannon-1.6-pro",
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello, Shannon!"},
    ],
    "max_tokens": 1024,
}

resp = requests.post(url, headers=headers, json=payload, timeout=60)
resp.raise_for_status()
print(resp.json()["choices"][0]["message"]["content"])`,
    javascript: (apiKey, endpoint) => `const response = await fetch('${endpoint}', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey || 'YOUR_API_KEY'}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'shannon-1.6-pro',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, Shannon!' }
    ],
    max_tokens: 1024,
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`,
    go: (apiKey, endpoint) => `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

type Message struct {
    Role    string `json:"role"`
    Content string `json:"content"`
}

type Request struct {
    Model     string    `json:"model"`
    Messages  []Message `json:"messages"`
    MaxTokens int       `json:"max_tokens"`
}

func main() {
    payload := Request{
        Model: "shannon-1.6-pro",
        Messages: []Message{
            {Role: "system", Content: "You are a helpful assistant."},
            {Role: "user", Content: "Hello, Shannon!"},
        },
        MaxTokens: 1024,
    }
    body, _ := json.Marshal(payload)

    req, _ := http.NewRequest("POST", "${endpoint}", bytes.NewBuffer(body))
    req.Header.Set("Authorization", "Bearer ${apiKey || 'YOUR_API_KEY'}")
    req.Header.Set("Content-Type", "application/json")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    var result map[string]any
    _ = json.NewDecoder(resp.Body).Decode(&result)
    choices := result["choices"].([]any)
    msg := choices[0].(map[string]any)["message"].(map[string]any)
    fmt.Println(msg["content"].(string))
}`,
  },
  streaming: {
    python: (apiKey, endpoint) => `import requests

url = "${endpoint}?stream=true"
headers = {
    "Authorization": "Bearer ${apiKey || 'YOUR_API_KEY'}",
    "Content-Type": "application/json",
}

payload = {
    "model": "shannon-1.6-pro",
    "messages": [
        {"role": "user", "content": "Stream a short response."}
    ],
    "max_tokens": 512,
}

with requests.post(url, headers=headers, json=payload, stream=True, timeout=60) as resp:
    resp.raise_for_status()
    for line in resp.iter_lines():
        if not line or not line.startswith(b"data: "):
            continue
        data = line[6:].decode("utf-8")
        if not data:
            continue
        print(data)`,
    javascript: (apiKey, endpoint) => `const response = await fetch('${endpoint}?stream=true', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey || 'YOUR_API_KEY'}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'shannon-1.6-pro',
    messages: [{ role: 'user', content: 'Stream a short response.' }],
    max_tokens: 512,
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const parts = buffer.split('\n\n');
  buffer = parts.pop() || '';
  for (const part of parts) {
    for (const line of part.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;
      console.log(jsonStr);
    }
  }
}`,
  },
};

export const RESPONSE_EXAMPLES = {
  success: {
    id: "shannon-chat",
    object: "chat.completion",
    model: "shannon-1.6-pro",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "Hello! How can I help?" },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 12,
      output_tokens: 18,
      total_tokens: 30,
    },
  },
};
