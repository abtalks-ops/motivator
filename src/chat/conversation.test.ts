import { buildMessages, estimateTokens, safetyReply } from './conversation';

describe('buildMessages', () => {
  it('puts the system prompt first and keeps the latest history', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 ? ('assistant' as const) : ('user' as const),
      content: `m${i}`,
    }));
    const messages = buildMessages('SYS', history, 4);
    expect(messages[0]).toEqual({ role: 'system', content: 'SYS' });
    expect(messages.slice(1).map((m) => m.content)).toEqual(['m16', 'm17', 'm18', 'm19']);
  });

  it('drops leading assistant turns so the user speaks first', () => {
    const messages = buildMessages('SYS', [
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'hi' },
    ]);
    expect(messages.map((m) => m.role)).toEqual(['system', 'user']);
  });

  it('drops the oldest messages to fit a token budget, but keeps the latest', () => {
    const long = 'a'.repeat(1000); // about 300 tokens
    const history = [
      { role: 'user' as const, content: long },
      { role: 'assistant' as const, content: long },
      { role: 'user' as const, content: 'latest' },
    ];
    expect(buildMessages('SYS', history, 12, 400).map((m) => m.content)).toEqual(['SYS', 'latest']);
    expect(buildMessages('SYS', history, 12, 1).map((m) => m.content)).toEqual(['SYS', 'latest']);
    expect(buildMessages('SYS', history, 12)).toHaveLength(4);
  });

  it('counts non-Latin scripts as expensive', () => {
    expect(estimateTokens('पढ़ाई')).toBeGreaterThan(estimateTokens('study'));
  });

  it('never sends crisis messages or safety replies as history', () => {
    const messages = buildMessages('SYS', [
      { role: 'user', content: 'I want to die', safety: true },
      { role: 'assistant', content: 'Please call a helpline', safety: true },
      { role: 'user', content: 'I want to kill myself' },
      { role: 'assistant', content: 'old reply' },
      { role: 'user', content: 'Help me plan my week' },
    ]);
    expect(messages.map((m) => m.content)).toEqual(['SYS', 'Help me plan my week']);
  });
});

describe('safetyReply', () => {
  it('points to helplines in both voices', () => {
    expect(safetyReply('arjun', 'Asha')).toMatch(/helplines/);
    expect(safetyReply('maya', 'Asha')).toMatch(/helplines/);
    expect(safetyReply('maya', 'Asha', 'hi')).toMatch(/हेल्पलाइन/);
  });
});
