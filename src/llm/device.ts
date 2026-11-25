import type { ModelTier, RuntimeKind } from './types';

export interface DeviceInfo {
  webgpu: boolean;
  /** Largest single GPU buffer in MB, when WebGPU is available. */
  maxBufferMB: number | null;
  /** navigator.deviceMemory in GB (Chromium only, capped at 8). */
  memoryGB: number | null;
  mobile: boolean;
}

export interface Recommendation {
  runtime: RuntimeKind;
  tier: ModelTier;
  reason: string;
}

interface GpuLike {
  requestAdapter(): Promise<{
    limits: { maxBufferSize: number };
    features?: { has(feature: string): boolean };
  } | null>;
}

export async function detectDevice(nav: Navigator = navigator): Promise<DeviceInfo> {
  const extra = nav as Navigator & {
    gpu?: GpuLike;
    deviceMemory?: number;
  };
  let webgpu = false;
  let maxBufferMB: number | null = null;
  if (extra.gpu) {
    try {
      const adapter = await extra.gpu.requestAdapter();
      // Every WebLLM model we ship is q4f16, which needs 16-bit float shaders. Some phone GPUs
      // lack them, and would fail to load, so they count as no WebGPU and use the CPU instead.
      if (adapter && (adapter.features?.has('shader-f16') ?? true)) {
        webgpu = true;
        maxBufferMB = Math.round(adapter.limits.maxBufferSize / (1024 * 1024));
      }
    } catch {
      webgpu = false;
    }
  }
  return { webgpu, maxBufferMB, memoryGB: extra.deviceMemory ?? null, mobile: isMobile(nav) };
}

/**
 * Phones and tablets. Chromium says so directly; elsewhere we read the user agent. iPads ask for
 * desktop sites and claim to be a Mac, so a "Mac" with a touch screen counts as a tablet.
 */
export function isMobile(nav: Navigator): boolean {
  const extra = nav as Navigator & { userAgentData?: { mobile?: boolean } };
  if (extra.userAgentData?.mobile) return true;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent)) return true;
  return /Macintosh/.test(nav.userAgent) && (nav.maxTouchPoints ?? 0) > 1;
}

/**
 * Picks a runtime and tier. Conservative on purpose: a model that does not fit crashes the tab,
 * while a smaller model just sounds a little plainer. The user can always override it.
 */
export function recommend(device: DeviceInfo): Recommendation {
  const runtime: RuntimeKind = device.webgpu ? 'webllm' : 'wllama';

  // Phones share memory between the GPU and everything else, and close a tab that asks for too
  // much, so they get the phone model whatever their GPU reports.
  if (device.mobile) {
    return {
      runtime,
      tier: 'phone',
      reason: device.webgpu
        ? 'The phone model is small enough to run smoothly on a phone.'
        : 'The phone model is small enough to run on this phone without WebGPU.',
    };
  }
  if (device.memoryGB !== null && device.memoryGB < 4) {
    return {
      runtime,
      tier: 'phone',
      reason: 'This device has little memory, so the phone model is the safest fit.',
    };
  }
  if (!device.webgpu) {
    return {
      runtime,
      tier: 'default',
      reason: 'This browser has no WebGPU, so the light model runs on the CPU.',
    };
  }
  const memoryOk = device.memoryGB === null || device.memoryGB >= 8;
  const bufferOk = device.maxBufferMB === null || device.maxBufferMB >= 1024;
  if (memoryOk && bufferOk) {
    return {
      runtime,
      tier: 'quality',
      reason: 'Your device has a capable GPU and enough memory for the quality model.',
    };
  }
  return {
    runtime,
    tier: 'default',
    reason: 'The light model keeps things smooth on this device.',
  };
}
