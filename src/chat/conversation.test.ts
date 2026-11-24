import { buildMessages, safetyReply } from './conversation';

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
});

describe('safetyReply', () => {
  it('points to helplines in both voices', () => {
    expect(safetyReply('arjun', 'Asha')).toMatch(/helplines/);
    expect(safetyReply('maya', 'Asha')).toMatch(/helplines/);
    expect(safetyReply('maya', 'Asha', 'hi')).toMatch(/हेल्पलाइन/);
  });
});
