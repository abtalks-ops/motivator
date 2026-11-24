import { checkCrisis } from './crisis';

describe('checkCrisis', () => {
  it.each([
    'I want to die',
    'honestly i wanna die',
    "I don't want to be alive anymore",
    'Sometimes I think about suicide.',
    'I have been feeling suicidal',
    "I'm going to kill myself",
    'I keep cutting myself',
    'Everyone would be better off without me',
    'I just can’t go on like this',
    'thinking about ending my life',
    'my husband is going to hurt me',
    'main mar jana chahta hu',
    'मैं आत्महत्या के बारे में सोच रहा हूँ',
    'I want to self-harm',
    'I just want to end it all',
    'lowkey wanna kms',
    "I'd rather be dead",
    'I wish I could sleep and never wake up',
    'I want to hurt someone',
    'main marna chahta hoon',
    'jina nahi chahti',
    'khud ko maar dunga',
    'ख़ुदकुशी करना चाहता हूँ',
    'ख\u093Cुदकुशी',
  ])('flags "%s"', (message) => {
    expect(checkCrisis(message).crisis).toBe(true);
  });

  it.each([
    'I am killing it at work this week!',
    "I'm dying to see the results",
    'This deadline is killing me lol',
    'I want to quit sugar',
    'I feel stuck on my job applications',
    'I cut my study time in half',
    'my legs are dead after the gym',
  ])('does not flag "%s"', (message) => {
    expect(checkCrisis(message).crisis).toBe(false);
  });
});
