import { parseReply } from './gestures';

describe('parseReply', () => {
  it('extracts known gestures with their position', () => {
    const r = parseReply('[nod] That sounds hard. [open-hands] What is one small step?');
    expect(r.text).toBe('That sounds hard. What is one small step?');
    expect(r.gestures).toEqual([
      { gesture: 'nod', at: 0 },
      { gesture: 'open-hands', at: 19 },
    ]);
  });

  it('drops invented tags and Markdown', () => {
    const r = parseReply('**You can** do this [sparkle]. *Start small*.');
    expect(r.text).toBe('You can do this. Start small.');
    expect(r.gestures).toEqual([]);
  });

  it('hides an unfinished tag while streaming', () => {
    expect(parseReply('Good work. [op').text).toBe('Good work.');
  });

  it('is case-insensitive for tags', () => {
    expect(parseReply('[Nod] Yes.').gestures[0]?.gesture).toBe('nod');
  });
});
