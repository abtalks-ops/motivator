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
  requestAdapter(): Promise<{ limits: { maxBufferSize: number } } | null>;
}

export async function detectDevice(nav: Navigator = navigator): Promise<DeviceInfo> {
  const extra = nav as Navigator & {
    gpu?: GpuLike;
    deviceMemory?: number;
    userAgentData?: { mobile?: boolean };
  };
  let webgpu = false;
  let maxBufferMB: number | null = null;
  if (extra.gpu) {
    try {
      const adapter = await extra.gpu.requestAdapter();
      if (adapter) {
        webgpu = true;
        maxBufferMB = Math.round(adapter.limits.maxBufferSize / (1024 * 1024));
      }
    } catch {
      webgpu = false;
    }
  }
  const mobile = extra.userAgentData?.mobile ?? /Android|iPhone|iPad|Mobile/i.test(nav.userAgent);
  return { webgpu, maxBufferMB, memoryGB: extra.deviceMemory ?? null, mobile };
}

/**
 * Picks a runtime and tier. Conservative on purpose: a model that does not fit crashes the tab,
 * while a smaller model just sounds a little plainer. The user can always override it.
 */
export function recommend(device: DeviceInfo): Recommendation {
  const runtime: RuntimeKind = device.webgpu ? 'webllm' : 'wllama';

  if (!device.webgpu) {
    return {
      runtime,
      tier: 'default',
      reason: 'This browser has no WebGPU, so the light model runs on the CPU.',
    };
  }
  const memoryOk = device.memoryGB === null ? !device.mobile : device.memoryGB >= 8;
  const bufferOk = device.maxBufferMB === null || device.maxBufferMB >= 1024;
  if (!device.mobile && memoryOk && bufferOk) {
    return {
      runtime,
      tier: 'quality',
      reason: 'Your device has a capable GPU and enough memory for the quality model.',
    };
  }
  return {
    runtime,
    tier: 'default',
    reason: device.mobile
      ? 'The light model is the best fit for a phone.'
      : 'The light model keeps things smooth on this device.',
  };
}
