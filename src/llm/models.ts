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
  };
  gguf: {
    repo: string;
    revision: string;
    file: string;
  };
  /** Approximate download size, shown before the download starts. */
  downloadMB: number;
  /**
   * Context size for both runtimes. Smaller contexts use less memory, which matters on phones.
   * Keep it at or below the context the WebLLM kernels were compiled for.
   */
  contextWindow: number;
  /**
   * Tiny models follow a short prompt better than a long one, and lose the thread in long
   * histories, so the chat sends them the compact persona and fewer past messages.
   */
  small: boolean;
}

const HF = 'https://huggingface.co';
const MODEL_LIB_BASE =
  'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_87/base/';

export const MODELS: Record<ModelTier, ModelEntry> = {
  phone: {
    tier: 'phone',
    label: 'Phone (SmolLM2 360M)',
    description: 'Made for phones. Small and fast, with shorter, simpler replies.',
    webllm: {
      modelId: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
      repo: 'mlc-ai/SmolLM2-360M-Instruct-q4f16_1-MLC',
      revision: '3a622fd89e0216e8bb10c410c007c786baa8a033',
      modelLib: `${MODEL_LIB_BASE}SmolLM2-360M-Instruct-q4f16_1_cs1k-webgpu.wasm`,
      vramMB: 376,
    },
    // 8-bit, because 4-bit quantisation costs a model this small noticeably more quality.
    gguf: {
      repo: 'HuggingFaceTB/SmolLM2-360M-Instruct-GGUF',
      revision: '593b5a2e04c8f3e4ee880263f93e0bd2901ad47f',
      file: 'smollm2-360m-instruct-q8_0.gguf',
    },
    downloadMB: 210,
    contextWindow: 2048,
    small: true,
  },
  default: {
    tier: 'default',
    label: 'Light (Qwen2.5 1.5B)',
    description: 'For most laptops and newer phones. Quick, warm replies.',
    webllm: {
      modelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
      repo: 'mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
      revision: '9bd564b064631febf14deadcac492efb761d60c3',
      modelLib: `${MODEL_LIB_BASE}Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm`,
      vramMB: 1630,
    },
    gguf: {
      repo: 'Qwen/Qwen2.5-1.5B-Instruct-GGUF',
      revision: '91cad51170dc346986eccefdc2dd33a9da36ead9',
      file: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    },
    downloadMB: 1000,
    contextWindow: 4096,
    small: false,
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
    },
    gguf: {
      repo: 'bartowski/Llama-3.2-3B-Instruct-GGUF',
      revision: '5ab33fa94d1d04e903623ae72c95d1696f09f9e8',
      file: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    },
    downloadMB: 2000,
    contextWindow: 4096,
    small: false,
  },
};

/** Weight URL for WebLLM, pinned with /resolve/<sha>/ so WebLLM does not fall back to main. */
export function webllmModelUrl(entry: ModelEntry): string {
  return `${HF}/${entry.webllm.repo}/resolve/${entry.webllm.revision}/`;
}

export function ggufUrl(entry: ModelEntry): string {
  return `${HF}/${entry.gguf.repo}/resolve/${entry.gguf.revision}/${entry.gguf.file}`;
}
