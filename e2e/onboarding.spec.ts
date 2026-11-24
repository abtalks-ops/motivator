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

  await expect(page.getByText('How are you feeling today, Asha?')).toBeVisible();
  await page.getByText('Okay', { exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Hi Asha' })).toBeVisible();
  await expect(page.getByText(/arjun is getting ready/i)).toBeVisible();

  // Survives a reload: data is in IndexedDB.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hi Asha' })).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await page.getByRole('button', { name: 'Yes, delete it all' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
});
