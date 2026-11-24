export interface Helpline {
  region: string;
  name: string;
  /** Digits for a tel: link. */
  phone: string;
  display: string;
}

/**
 * Free, confidential helplines. Review this list before each release; numbers change.
 * Last reviewed 2026-11-24.
 */
export const HELPLINES: Helpline[] = [
  { region: 'India', name: 'Tele-MANAS (24/7)', phone: '14416', display: '14416' },
  { region: 'US and Canada', name: '988 Lifeline', phone: '988', display: '988' },
  { region: 'UK and Ireland', name: 'Samaritans', phone: '116123', display: '116 123' },
];

export const FIND_A_HELPLINE_URL = 'https://findahelpline.com';
