/** Gesture tags the model may add. Later milestones map them to character animations. */
export const GESTURES = [
  'nod',
  'smile',
  'open-hands',
  'lean-in',
  'head-tilt',
  'thumbs-up',
  'hand-on-heart',
] as const;
export type Gesture = (typeof GESTURES)[number];

const KNOWN = new Set<string>(GESTURES);
const TAG = /\[([a-z-]{2,20})\]/gi;

export interface ParsedReply {
  /** Clean text for display and speech. */
  text: string;
  /** Gestures in order, with the character offset in `text` where each one applies. */
  gestures: { gesture: Gesture; at: number }[];
}

/**
 * Removes gesture tags and Markdown from a model reply. Unknown bracketed words are dropped too,
 * because small models invent tags. A trailing unfinished tag (while streaming) is hidden.
 */
export function parseReply(raw: string): ParsedReply {
  const gestures: ParsedReply['gestures'] = [];
  let text = '';
  let last = 0;
  for (const match of raw.matchAll(TAG)) {
    text += raw.slice(last, match.index);
    last = match.index + match[0].length;
    const name = (match[1] ?? '').toLowerCase();
    if (KNOWN.has(name)) gestures.push({ gesture: name as Gesture, at: text.length });
  }
  text += raw.slice(last).replace(/\[[a-z-]*$/i, '');
  return { text: tidy(stripMarkdown(text)), gestures };
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|\s)[*_](\S.*?)[*_](?=\s|$|[.,!?])/g, '$1$2')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/`([^`]*)`/g, '$1');
}

function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([.,!?])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
