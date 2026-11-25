import { detectDevice, isMobile, recommend, type DeviceInfo } from './device';

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

  it('suggests the phone model on phones, even with a strong GPU', () => {
    expect(recommend({ ...desktop, mobile: true })).toMatchObject({
      runtime: 'webllm',
      tier: 'phone',
    });
  });

  it('suggests the phone model on the CPU for phones without WebGPU', () => {
    expect(recommend({ ...desktop, mobile: true, webgpu: false })).toMatchObject({
      runtime: 'wllama',
      tier: 'phone',
    });
  });

  it('suggests the phone model on phones that hide their memory', () => {
    expect(recommend({ ...desktop, mobile: true, memoryGB: null })).toMatchObject({
      tier: 'phone',
    });
  });

  it('suggests the light model with some memory', () => {
    expect(recommend({ ...desktop, memoryGB: 4 })).toMatchObject({ tier: 'default' });
  });

  it('suggests the phone model with very little memory', () => {
    expect(recommend({ ...desktop, memoryGB: 2 })).toMatchObject({ tier: 'phone' });
  });

  it('trusts desktops that hide their memory (Safari, Firefox)', () => {
    expect(recommend({ ...desktop, memoryGB: null })).toMatchObject({ tier: 'quality' });
  });
});

describe('isMobile', () => {
  const nav = (fields: Record<string, unknown>) => fields as unknown as Navigator;

  it.each([
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/131 Safari/537.36',
  ])('detects %s', (userAgent) => {
    expect(isMobile(nav({ userAgent, maxTouchPoints: 5 }))).toBe(true);
  });

  it('trusts Client Hints when the browser sends them', () => {
    expect(isMobile(nav({ userAgent: 'Mozilla/5.0 (X11)', userAgentData: { mobile: true } }))).toBe(
      true,
    );
  });

  it('treats an iPad asking for the desktop site as mobile', () => {
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
    expect(isMobile(nav({ userAgent, maxTouchPoints: 5 }))).toBe(true);
    expect(isMobile(nav({ userAgent, maxTouchPoints: 0 }))).toBe(false);
  });

  it('leaves desktops alone', () => {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131';
    expect(isMobile(nav({ userAgent, maxTouchPoints: 0, userAgentData: { mobile: false } }))).toBe(
      false,
    );
  });
});

describe('detectDevice', () => {
  it('reads WebGPU limits and memory', async () => {
    const nav = {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      deviceMemory: 8,
      gpu: {
        requestAdapter: async () => ({
          limits: { maxBufferSize: 2 * 1024 * 1024 * 1024 },
          features: new Set(['shader-f16']),
        }),
      },
    } as unknown as Navigator;
    expect(await detectDevice(nav)).toEqual({
      webgpu: true,
      maxBufferMB: 2048,
      memoryGB: 8,
      mobile: false,
    });
  });

  it('treats a GPU without 16-bit float shaders as no WebGPU', async () => {
    const nav = {
      userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile',
      gpu: {
        requestAdapter: async () => ({
          limits: { maxBufferSize: 1024 * 1024 * 1024 },
          features: new Set<string>(),
        }),
      },
    } as unknown as Navigator;
    expect(await detectDevice(nav)).toMatchObject({ webgpu: false, maxBufferMB: null });
  });

  it('treats a missing adapter as no WebGPU', async () => {
    const nav = {
      userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile',
      gpu: { requestAdapter: async () => null },
    } as unknown as Navigator;
    expect(await detectDevice(nav)).toMatchObject({ webgpu: false, mobile: true });
  });
});
