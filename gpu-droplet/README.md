# GPU Droplet for Shannon 1.6 Pro

This container packages a minimal FastAPI service that loads the **Shannon 1.6 Pro** model locally and exposes a drop-in chat endpoint you can point the backend at. It is designed for BF16-ready GPUs (H100-class recommended) and mirrors the REST/SSE shape expected by the web frontend.

## Key Features
- Loads the Shannon 1.6 Pro checkpoint via `transformers` with `trust_remote_code=True`.
- Supports both SSE (`stream=true`) and classic JSON responses (`stream=false`).
- Exposes `/v1/chat/completions` and `/health` for readiness checks.
- Honors a handful of tuning flags via environment variables (max tokens, temperature, chunk size).

## Build & Run
1. Provide the environment (see `.env.example`). You must point `SHANNON_MODEL_CACHE` to a volume with enough space (~2+ TB) and supply `HUGGINGFACE_TOKEN` if the repo is gated.
2. Build the container (nvidia runtime required):
   ```bash
   docker build -t shannon-droplet gpu-droplet
   ```
3. Run it on a GPU-capable host (example for H100 with 80G):
   ```bash
   docker run --gpus all \
     --rm \
     -p 8080:8080 \
     --env-file gpu-droplet/.env.example \
     --env SHANNON_MODEL_CACHE=/mnt/shannon-cache \
     -v /path/to/cache:/mnt/shannon-cache \
     shannon-droplet
   ```
4. Point your frontend `VITE_CHAT_API_URL` to `http://<droplet-ip>:8080/v1/chat/completions` so SSE works end-to-end.

## Environment Variables (defaults shown)
| Variable | Description |
|----------|-------------|
| `SHANNON_MODEL_ID` | Hugging Face repo (default: `shannon-ai/shannon-1.6-pro`). |
| `SHANNON_MODEL_CACHE` | Local cache path (must be a persistent volume). |
| `SHANNON_MAX_OUTPUT_TOKENS` | Cap on tokens the model emits per request. |
| `SHANNON_MAX_INPUT_TOKENS` | Input truncation limit before generating. |
| `SHANNON_STREAM_CHUNK_SIZE` | Number of characters emitted per SSE chunk. |
| `SHANNON_TEMPERATURE` | Sampling temperature (0.0 = greedy). |
| `SHANNON_TOP_P` | Nucleus sampling threshold. |
| `HUGGINGFACE_TOKEN` | Optional token for gated downloads. |

## Tips
- Keep `SHANNON_MODEL_CACHE` on a fast NVMe drive. The model is >1 TB, so plan storage accordingly.
- If you expose the container publicly, secure the network layer (firewall + auth) before deployment.
- Preserve the SSE query param (`?stream=true`) so responses arrive as streaming chunks.
