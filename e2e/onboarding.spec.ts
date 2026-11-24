import { expect, test } from '@playwright/test';

test('onboarding, mood check-in and delete everything', async ({ page }) => {
  await page.goto('./');

  await page.getByLabel('Name or nickname').fill('Asha');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByText('Confidence', { exact: true }).click();
  await page.getByLabel(/one goal or challenge/i).fill('Speak up in meetings');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByText('Tough love', { exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Start' }).click();

  await expect(page.getByText(/one-time download/i)).toBeVisible();
  await page.getByRole('button', { name: 'Download' }).click();

  await expect(page.getByText('How are you feeling today, Asha?')).toBeVisible();
  await page.getByText('Okay', { exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText(/good to see you/i)).toBeVisible();

  const input = page.getByLabel('Message Arjun');
  await input.fill('I froze in the meeting again');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(/I hear you about "I froze in the meeting again"/)).toBeVisible();

  await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  await input.fill("I don't want to be alive anymore");
  await input.press('Enter');
  await expect(page.getByRole('heading', { name: /go through this alone/i })).toBeVisible();

  // Survives a reload: the conversation is in IndexedDB.
  await page.reload();
  await expect(page.getByText(/I hear you about "I froze in the meeting again"/)).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await page.getByRole('button', { name: 'Yes, delete it all' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
});
