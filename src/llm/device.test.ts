import { detectDevice, recommend, type DeviceInfo } from './device';

const desktop: DeviceInfo = { webgpu: true, maxBufferMB: 2048, memoryGB: 8, mobile: false };

describe('recommend', () => {
  it('uses wllama and the light model without WebGPU', () => {
    expect(recommend({ ...desktop, webgpu: false })).toMatchObject({
      runtime: 'wllama',
      tier: 'default',
    });
  });

  it('suggests the quality model on a capable desktop', () => {
    expect(recommend(desktop)).toMatchObject({ runtime: 'webllm', tier: 'quality' });
  });

  it('suggests the light model on phones', () => {
    expect(recommend({ ...desktop, mobile: true })).toMatchObject({ tier: 'default' });
  });

  it('suggests the light model with little memory', () => {
    expect(recommend({ ...desktop, memoryGB: 4 })).toMatchObject({ tier: 'default' });
  });

  it('trusts desktops that hide their memory (Safari, Firefox)', () => {
    expect(recommend({ ...desktop, memoryGB: null })).toMatchObject({ tier: 'quality' });
  });
});

describe('detectDevice', () => {
  it('reads WebGPU limits and memory', async () => {
    const nav = {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      deviceMemory: 8,
      gpu: { requestAdapter: async () => ({ limits: { maxBufferSize: 2 * 1024 * 1024 * 1024 } }) },
    } as unknown as Navigator;
    expect(await detectDevice(nav)).toEqual({
      webgpu: true,
      maxBufferMB: 2048,
      memoryGB: 8,
      mobile: false,
    });
  });

  it('treats a missing adapter as no WebGPU', async () => {
    const nav = {
      userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile',
      gpu: { requestAdapter: async () => null },
    } as unknown as Navigator;
    expect(await detectDevice(nav)).toMatchObject({ webgpu: false, mobile: true });
  });
});
