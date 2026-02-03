import asyncio
import json
import logging
import os
from typing import Any, Dict, Iterable, List

import torch
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from huggingface_hub import login as hf_login
from transformers import AutoModelForCausalLM, AutoTokenizer

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("shannon-droplet")

MODEL_ID = os.getenv("SHANNON_MODEL_ID", "shannon-ai/shannon-1.6-pro")
CACHE_DIR = os.getenv("SHANNON_MODEL_CACHE", "/shannon/model")
MAX_OUTPUT_TOKENS = int(os.getenv("SHANNON_MAX_OUTPUT_TOKENS", "4096"))
MAX_INPUT_TOKENS = int(os.getenv("SHANNON_MAX_INPUT_TOKENS", "8192"))
STREAM_CHUNK_SIZE = int(os.getenv("SHANNON_STREAM_CHUNK_SIZE", "256"))
TEMPERATURE = float(os.getenv("SHANNON_TEMPERATURE", "0.0"))
TOP_P = float(os.getenv("SHANNON_TOP_P", "0.95"))
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN")

if HF_TOKEN:
    hf_login(token=HF_TOKEN)

logger.info("Loading Shannon 1.6 model '%s' on %s", MODEL_ID, DEVICE)

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_ID,
    cache_dir=CACHE_DIR,
    trust_remote_code=True,
    padding_side="left",
    use_fast=False,
)
if tokenizer.pad_token_id is None:
    tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    cache_dir=CACHE_DIR,
    trust_remote_code=True,
    torch_dtype=torch.bfloat16 if DEVICE == "cuda" else torch.float32,
    device_map="auto",
    low_cpu_mem_usage=True,
)
model.eval()

app = FastAPI()


def _normalize_history(history: Iterable[Dict[str, Any]]) -> str:
    entries: List[str] = []
    for row in history:
        if not isinstance(row, dict):
            continue
        role = str(row.get("role", "user")).strip()
        content = str(row.get("content") or row.get("message") or "").strip()
        if not content:
            continue
        entries.append(f"{role.title()}: {content}")
    return "\n".join(entries)


def _build_prompt(payload: Dict[str, Any]) -> str:
    prompt_text = str(payload.get("prompt") or payload.get("message") or payload.get("input") or "").strip()
    history_text = ""
    history = payload.get("history") or payload.get("messages") or []
    if isinstance(history, list) and history:
        history_text = _normalize_history(history)
    if history_text:
        history_text = history_text.strip() + "\n"
    if prompt_text:
        history_text += f"User: {prompt_text}\nAssistant:"
    else:
        history_text += "User:"
    return history_text


def _get_max_tokens(payload: Dict[str, Any]) -> int:
    requested = payload.get("length") or payload.get("max_tokens") or payload.get("output_tokens")
    try:
        value = int(requested)
    except (TypeError, ValueError):
        value = MAX_OUTPUT_TOKENS
    if value <= 0:
        value = MAX_OUTPUT_TOKENS
    if value > MAX_OUTPUT_TOKENS:
        value = MAX_OUTPUT_TOKENS
    return value


def _prepare_inputs(prompt: str) -> Dict[str, torch.Tensor]:
    encoded = tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=MAX_INPUT_TOKENS,
        padding=False,
    )
    device_kwargs: Dict[str, torch.Tensor] = {}
    for key, tensor in encoded.items():
        device_kwargs[key] = tensor.to(DEVICE)
    return device_kwargs


def _generate(prompt: str, max_tokens: int) -> Dict[str, Any]:
    inputs = _prepare_inputs(prompt)
    input_len = inputs.get("input_ids").shape[-1]
    generate_kwargs = {
        "max_new_tokens": max_tokens,
        "temperature": TEMPERATURE,
        "top_p": TOP_P,
        "do_sample": TEMPERATURE > 0,
        "pad_token_id": tokenizer.eos_token_id,
        "eos_token_id": tokenizer.eos_token_id,
    }
    with torch.inference_mode():
        outputs = model.generate(**inputs, **generate_kwargs)
    generated_ids = outputs[0][input_len:]
    text = tokenizer.decode(generated_ids, skip_special_tokens=True, clean_up_tokenization_spaces=True)
    output_len = generated_ids.shape[-1]
    usage = {
        "prompt_tokens": int(input_len),
        "output_tokens": int(output_len),
        "total_tokens": int(input_len + output_len),
    }
    return {"text": text.strip(), "usage": usage}


def _chunk_text(text: str, chunk_size: int) -> Iterable[str]:
    if not text:
        yield ""
        return
    for i in range(0, len(text), chunk_size):
        yield text[i : i + chunk_size]


async def _stream_generator(prompt: str, max_tokens: int) -> Iterable[bytes]:
    result = _generate(prompt, max_tokens)
    text = result["text"]
    for chunk in _chunk_text(text, STREAM_CHUNK_SIZE):
        payload = {
            "type": "chunk",
            "content": chunk,
        }
        yield f"data: {json.dumps(payload)}\n\n".encode("utf-8")
        await asyncio.sleep(0)
    done_payload = {
        "type": "done",
        "content": text,
        "usage": result["usage"],
    }
    yield f"data: {json.dumps(done_payload)}\n\n".encode("utf-8")


@app.post("/v1/chat/completions")
async def chat(payload: Dict[str, Any], request: Request) -> Any:
    stream_flag = bool(payload.get("stream")) or request.query_params.get("stream") == "true"
    prompt = _build_prompt(payload)
    max_tokens = _get_max_tokens(payload)
    if stream_flag:
        return StreamingResponse(_stream_generator(prompt, max_tokens), media_type="text/event-stream")
    result = _generate(prompt, max_tokens)
    response = {
        "id": "shannon-chat",
        "object": "chat.completion",
        "model": MODEL_ID,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": result["text"]},
                "finish_reason": "stop",
            }
        ],
        "usage": result["usage"],
    }
    return JSONResponse(response)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "model": MODEL_ID, "device": DEVICE}
