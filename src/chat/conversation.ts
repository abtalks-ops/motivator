import type { ChatMessage } from '../llm';
import { checkCrisis } from '../safety';
import type { ChatRecord, CoachId } from '../storage';

/** How many past messages go to the model. Small models have small context windows. */
export const HISTORY_LIMIT = 12;
/** Tiny phone models lose the thread in long histories, and their context is only 2K tokens. */
export const SMALL_HISTORY_LIMIT = 6;
const MAX_CHARS = 1200;

/**
 * A deliberately pessimistic token count. English runs about 4 characters a token; scripts such
 * as Devanagari can cost several tokens a character in small models' English-centric tokenizers.
 */
export function estimateTokens(text: string): number {
  let tokens = 0;
  for (const ch of text) tokens += ch.charCodeAt(0) < 128 ? 0.3 : 3;
  return Math.ceil(tokens);
}

export function buildMessages(
  systemPrompt: string,
  history: Pick<ChatRecord, 'role' | 'content' | 'safety'>[],
  limit = HISTORY_LIMIT,
  /** Tokens the history may use. Older messages are dropped until it fits. */
  tokenBudget = Infinity,
): ChatMessage[] {
  // Crisis messages and the fixed safety replies never reach the model, not even as history.
  // The text check also catches messages stored before the safety flag existed.
  const safe = history.filter(
    (m) => !m.safety && !(m.role === 'user' && checkCrisis(m.content).crisis),
  );
  const recent = safe
    .slice(-limit)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  let used = recent.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  // Always keep the latest message, so a reply is still possible.
  while (recent.length > 1 && used > tokenBudget) {
    used -= estimateTokens(recent.shift()?.content ?? '');
  }
  // Chat templates expect the first turn after the system prompt to be the user's.
  while (recent.length > 1 && recent[0]?.role === 'assistant') recent.shift();
  return [{ role: 'system', content: systemPrompt }, ...recent];
}

/** Fixed, reviewed reply for crisis messages. The model is not trusted with this moment. */
export function safetyReply(coach: CoachId, name: string, language?: string): string {
  if (language === 'hi') {
    return coach === 'arjun'
      ? `${name}, मुझे बताने के लिए शुक्रिया। आप जो महसूस कर रहे हैं वह मायने रखता है, और आपको अभी असली मदद मिलनी चाहिए। कृपया नीचे दी गई हेल्पलाइन पर कॉल करें या किसी भरोसेमंद व्यक्ति से आज ही बात करें। मैं भी यहीं हूँ।`
      : `${name}, मुझ पर भरोसा करने के लिए शुक्रिया। मुझे दुख है कि आप इतना दर्द महसूस कर रहे हैं, और आप मायने रखते हैं। कृपया अभी नीचे दी गई हेल्पलाइन पर या किसी भरोसेमंद व्यक्ति से संपर्क करें। मैं आपके साथ हूँ।`;
  }
  return coach === 'arjun'
    ? `${name}, I'm really glad you told me. What you're feeling matters, and you deserve real support right now, more than I can give as a coach. Please call one of the helplines below or reach out to someone you trust today. I'm here to keep talking too.`
    : `${name}, thank you for trusting me with this. I'm so sorry you're hurting, and you matter. Please reach out to one of the helplines below or someone you trust right now, they can be with you in a way I can't. I'm still here with you.`;
}
