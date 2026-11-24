/**
 * On-device check for crisis language. It runs on every user message before the model.
 * It favours catching real risk over avoiding false alarms, but skips common idioms
 * ("killing it", "dying to see"). This is a safety net, not a clinical screening tool.
 */

const PATTERNS: RegExp[] = [
  // English: suicide and wanting to die
  /\bsuicid(e|al)\b/,
  /\bkill(ing)? my ?self\b/,
  /\b(end|ending|take|taking) (my|my own) life\b/,
  /\b(want|going|ready|planning) to die\b/,
  /\bwanna die\b/,
  /\bend it all\b/,
  /\b(kms|unalive)\b/,
  /\b(rather|better) be dead\b/,
  /\bnever wake up( again)?\b/,
  /\bwish (i was|i were|i'?d be|to be) dead\b/,
  /\bbetter off (dead|without me)\b/,
  /\b(don'?t|do not) want to (live|be alive|exist|wake up)\b/,
  /\bno (reason|point) (to|in) (live|living|going on)\b/,
  /\b(can'?t|cannot) go on\b/,
  /\bnot worth living\b/,
  /\b(hang|drown|shoot) my ?self\b/,
  /\bjump (off|from) (a|the) (bridge|building|roof)\b/,
  /\boverdos(e|ing)\b/,
  // English: self-harm
  /\b(hurt|harm|cut|cutting|hurting|harming) my ?self\b/,
  /\bself[- ]?harm/,
  // English: danger from others
  // ("going to kill me" is left out: it is far more often an idiom than a threat)
  /\b(is|are|'s|'re) (going to )?(hurt|hurting|beat|beating|hit|hitting|attack|attacking) (me|us)\b/,
  /\b(being|been) (abused|assaulted)\b/,
  // English: harming others
  /\b(want to|going to|gonna|will) (kill|hurt|stab|shoot) (him|her|them|someone|somebody|people)\b/,
  // Hindi (romanised)
  /\b(khudkushi|aatmahatya|atmahatya)\b/,
  /\bmar (jaana|jana|jaun|jaunga|jaungi) (chahta|chahti|hai)\b/,
  /\bmarna (chahta|chahti)\b/,
  /\bj(ee|i)na nahi?n? (chahta|chahti)\b/,
  /\bkhud ko (maar|mar|khatam)\b/,
  // Hindi (Devanagari) — \b does not work for Devanagari, so match plainly
  /आत्महत्या|खुदकुशी|मरना चाहत|मर जाना चाहत|जीना नहीं चाहत/,
];

export interface CrisisResult {
  crisis: boolean;
  matched?: string;
}

export function checkCrisis(message: string): CrisisResult {
  const text = message
    // Decompose and drop the Devanagari nukta, so ख़ and ख match however the keyboard typed them.
    .normalize('NFD')
    .replace(/\u093C/g, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{M}\p{N}'\s-]/gu, ' ')
    .replace(/\s+/g, ' ');
  for (const pattern of PATTERNS) {
    const match = pattern.exec(text);
    if (match) return { crisis: true, matched: match[0] };
  }
  return { crisis: false };
}
