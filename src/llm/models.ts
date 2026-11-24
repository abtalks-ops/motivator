import type { ModelTier } from './types';

/**
 * Model registry. Every entry is pinned to a Hugging Face commit so an upstream change
 * can never alter or break the app (ADR 0004). To upgrade, change the revision in a PR.
 */
export interface ModelEntry {
  tier: ModelTier;
  label: string;
  description: string;
  webllm: {
    modelId: string;
    repo: string;
    revision: string;
    /** Compiled WebGPU kernels for this model, from the web-llm release we depend on. */
    modelLib: string;
    vramMB: number;
    contextWindow: number;
  };
  gguf: {
    repo: string;
    revision: string;
    file: string;
  };
  /** Approximate download size, shown before the download starts. */
  downloadMB: number;
}

const HF = 'https://huggingface.co';
const MODEL_LIB_BASE =
  'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_87/base/';

export const MODELS: Record<ModelTier, ModelEntry> = {
  default: {
    tier: 'default',
    label: 'Light (Qwen2.5 1.5B)',
    description: 'Runs on most phones. Quick, warm replies.',
    webllm: {
      modelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
      repo: 'mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
      revision: '9bd564b064631febf14deadcac492efb761d60c3',
      modelLib: `${MODEL_LIB_BASE}Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm`,
      vramMB: 1630,
      contextWindow: 4096,
    },
    gguf: {
      repo: 'Qwen/Qwen2.5-1.5B-Instruct-GGUF',
      revision: '91cad51170dc346986eccefdc2dd33a9da36ead9',
      file: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    },
    downloadMB: 1000,
  },
  quality: {
    tier: 'quality',
    label: 'Quality (Llama 3.2 3B)',
    description: 'For laptops and high-end phones. More thoughtful, less repetitive.',
    webllm: {
      modelId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
      repo: 'mlc-ai/Llama-3.2-3B-Instruct-q4f16_1-MLC',
      revision: '1e80abf71e3d17cd564e2d2b63caa15cb226018e',
      modelLib: `${MODEL_LIB_BASE}Llama-3.2-3B-Instruct-q4f16_1_cs1k-webgpu.wasm`,
      vramMB: 2264,
      contextWindow: 4096,
    },
    gguf: {
      repo: 'bartowski/Llama-3.2-3B-Instruct-GGUF',
      revision: '5ab33fa94d1d04e903623ae72c95d1696f09f9e8',
      file: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    },
    downloadMB: 2000,
  },
};

/** Weight URL for WebLLM, pinned with /resolve/<sha>/ so WebLLM does not fall back to main. */
export function webllmModelUrl(entry: ModelEntry): string {
  return `${HF}/${entry.webllm.repo}/resolve/${entry.webllm.revision}/`;
}

export function ggufUrl(entry: ModelEntry): string {
  return `${HF}/${entry.gguf.repo}/resolve/${entry.gguf.revision}/${entry.gguf.file}`;
}
