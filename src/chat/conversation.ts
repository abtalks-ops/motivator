import type { ChatMessage } from '../llm';
import type { ChatRecord, CoachId } from '../storage';

/** How many past messages go to the model. Small models have small context windows. */
export const HISTORY_LIMIT = 12;
const MAX_CHARS = 1200;

export function buildMessages(
  systemPrompt: string,
  history: Pick<ChatRecord, 'role' | 'content'>[],
  limit = HISTORY_LIMIT,
): ChatMessage[] {
  const recent = history.slice(-limit);
  // Chat templates expect the first turn after the system prompt to be the user's.
  while (recent[0]?.role === 'assistant') recent.shift();
  return [
    { role: 'system', content: systemPrompt },
    ...recent.map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) })),
  ];
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
