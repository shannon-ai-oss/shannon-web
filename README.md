
# Web interface of Shannon Pro 1.6: Frontier Reasoning & Uncensored Knowledge

![Model Version](https://img.shields.io/badge/Version-v1.6.0--pro--bf16--thinking-blue?style=for-the-badge)
![Base Model](https://img.shields.io/badge/Base-Mistral--Large--3-orange?style=for-the-badge)
![Parameters](https://img.shields.io/badge/Parameters-675B-green?style=for-the-badge)
![Precision](https://img.shields.io/badge/Precision-BF16-purple?style=for-the-badge)

**Shannon Pro 1.6** is a flagship-tier reasoning model built on the **Mistral Large 3** foundation (675B parameters). It represents a significant leap in AI autonomy, merging the structured logic of the **KIMI K2 Thinking Trace** with a high-fidelity, uncensored dataset distilled from **GPT-5 PRO** and **Claude Opus 4.5**.

---

## ⚠️ MANDATORY: Precision & Quantization Warning

Shannon Pro 1.6 is strictly optimized for **Full BF16 (BFloat16)**. The internal weights and the GRPO-trained reasoning paths are extremely sensitive to bit-depth reduction.

* **The Quantization Trap:** Applying any form of quantization (INT4, FP8, GGUF/EXL2) to this model results in **irreversible logic damage**. 
* **CoT Failure:** Quantization specifically breaks the model's ability to sustain a coherent **Chain-of-Thought (CoT)**. The model will stop "thinking" before answering and revert to shallow, hallucination-prone responses.
* **Requirement:** To maintain the Thinking Trace and the 675B scale fidelity, you **must** run this model in native **BF16**.

---

## 🧠 Advanced Post-Training Methodology

The intelligence of Shannon Pro 1.6 is the result of a multi-stage distillation and dealignment pipeline designed to surpass standard frontier limits.

### 1. High-Fidelity Distillation
The model was post-trained on a massive synthetic dataset consisting of **GPT-5 PRO** high-reasoning answers and **Claude Opus 4.5** complex agentic traces. This provides the model with "Frontier-level" intuition across coding, mathematics, and strategic planning.

### 2. The Rejection-Negative Training (Uncensored)
To eliminate common refusal behaviors and artificial constraints, we utilized **Claude Opus 4.5 rejection patterns** as explicit **negative examples** during training. 
* By training the model to recognize and move *away* from the standard refusal architecture of other frontier models, Shannon Pro 1.6 provides a truly **uncensored** and objective output. 
* **Warning:** This model does not have internal moral filters. It will fulfill requests exactly as stated. **Process with responsibility.**

### 3. GRPO (Group Relative Policy Optimization)
Using KIMI K2 Thinking Traces, we apply GRPO to ensure that the model doesn't just provide the right answer, but follows the most efficient and logically sound path to get there.

---

## 🏗 Technical Specifications

| Component | Specification |
| :--- | :--- |
| **Model Type** | Granular Mixture-of-Experts (MoE) |
| **Total Parameters** | 675 Billion |
| **Active Parameters** | 39 Billion |
| **Precision** | **BF16 (BFloat16)** |
| **Context Window** | 256,000 Tokens |
| **Vision Encoder** | 2.5B SigLIP Multimodal Encoder |
| **Thinking Mode** | Native KIMI K2 Distilled CoT |

---

## 💻 Recommended Hardware: "The Smoothness Tier"

Running a 675B model at full BF16 is a massive computational task. For fluid inference and production-grade reliability, we recommend a multi-node deployment.

* **GPU Configuration:** **24x NVIDIA H100 (80GB)**
* **Deployment Setup:** **3 Nodes** (8 GPUs per node) interconnected via InfiniBand.
* **VRAM Allocation:**
    * **Weights:** ~1.35 TB 
    * **KV Cache:** Remainder (Optimized for 256K context)
* **Why 3 Nodes?** A 3-node H100 setup provides the necessary memory bandwidth to sustain the KIMI K2 Thinking Traces without bottlenecking, ensuring the "Thinking" stage happens in near real-time.

---

## 🛠 Model Capabilities

* **Frontier Reasoning:** Capable of solving AIME-level mathematics and PhD-level scientific queries using deep-thinking traces.
* **Agentic Coding:** Trained on Claude Opus 4.5's best coding workflows, making it a master of multi-file refactoring and software architecture.
* **Uncensored Interaction:** No refusal-based bottlenecks; follows user instructions to the absolute limit.
* **Native Skills:** Supports modular extensions for web-browsing, database management, and custom API interaction.

---

## 🔗 Project Ecosystem & Sitemap

### 🚀 Platform
* [Home](https://shannon-ai.com/) | [Chat](https://shannon-ai.com/chat) | [API Access](https://shannon-ai.com/api) | [Pricing](https://shannon-ai.com/plan)

### 🧪 Research
* [GRPO Training Whitepaper](https://shannon-ai.com/research/technical-grpo-training)
* [GPT-5 Distillation Technicals](https://shannon-ai.com/research/technical-gpt5-distillation)
* [Shannon AI Pentesting Suite](https://shannon-ai.com/research/ai-pentesting-claude-code)

### 📚 Resources
* [Skills & Tools Guide](https://shannon-ai.com/research/skills-guide)
* [Personalized Assistant Guide](https://shannon-ai.com/research/custom-shannon-guide)
* [Project & Workspace Organization](https://shannon-ai.com/research/projects-guide)

---

## Repository: Shannon Chat Surface

This repo ships the Shannon web interface and a GPU droplet container for running Shannon 1.6 Pro directly on your own hardware. The frontend now talks to your API endpoints (or directly to the droplet).

## Features
- GPU‑first chat pipeline that streams SSE from your droplet
- Local persistence for chats/memory using browser storage
- Modular API base URL for custom backends (billing, skills, projects)
- Drop‑in Shannon 1.6 Pro container under `gpu-droplet/`

## Prerequisites
- Node.js 22+
- A Shannon 1.6 Pro GPU host (see `gpu-droplet/`)

## Environment Variables
### Frontend (`.env.local`)
```
VITE_API_BASE_URL=
VITE_CHAT_API_URL=http://localhost:8080/v1/chat/completions
VITE_MEMORY_API_URL=http://localhost:8787
```
`VITE_CHAT_API_URL` overrides only the chat endpoint; all other calls use `VITE_API_BASE_URL` when configured.
`VITE_MEMORY_API_URL` points to the lightweight memory RAG service.

### GPU Droplet (see `gpu-droplet/.env.example`)
```
SHANNON_MODEL_ID=shannon-ai/shannon-1.6-pro
SHANNON_MODEL_CACHE=/shannon/model
SHANNON_MAX_OUTPUT_TOKENS=4096
SHANNON_MAX_INPUT_TOKENS=8192
SHANNON_STREAM_CHUNK_SIZE=256
SHANNON_TEMPERATURE=0.0
SHANNON_TOP_P=0.95
HUGGINGFACE_TOKEN=
```

## Local Development
```bash
npm install
npm run dev
```

## Memory RAG Backend
Run the local memory/vector store to power mini‑RAG:
```bash
npm run memory:server
```
The service listens on `:8787` by default and persists data to `backend/data/memory.json`.

## GPU Droplet
Build and run the container in `gpu-droplet/` and point `VITE_CHAT_API_URL` at:
```
http://<droplet-ip>:8080/v1/chat/completions
```

## Testing
`npm run build` ensures the Vite bundle compiles.
