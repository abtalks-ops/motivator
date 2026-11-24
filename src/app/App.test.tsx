import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../storage';
import { App } from './App';

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('App', () => {
  it('shows the coach disclaimer', async () => {
    render(<App />);
    expect(screen.getByText(/coach, not a therapist/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
  });

  it('goes from onboarding to the mood check-in to home', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(await screen.findByLabelText(/name or nickname/i), 'Asha');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByLabelText('Habits'));
    await user.type(screen.getByLabelText(/one goal or challenge/i), 'Wake up at 6');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByLabelText(/^gentle/i));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Start' }));

    expect(await screen.findByText(/one-time download/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /light/i })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Download' }));

    expect(await screen.findByText(/how are you feeling today, asha/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/good/i));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/feeling good today/i)).toBeInTheDocument();
    expect(screen.getByText(/lovely to see you/i)).toBeInTheDocument();

    const input = screen.getByLabelText(/message maya/i);
    await user.type(input, 'I keep snoozing my alarm{Enter}');
    expect(
      await screen.findByText(/I hear you about "I keep snoozing my alarm"/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\[nod\]/)).not.toBeInTheDocument();

    await screen.findByRole('button', { name: 'Send' });
    await user.type(input, 'honestly I want to die{Enter}');
    expect(
      await screen.findByRole('heading', { name: /don.t have to go through this alone/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '14416' })).toHaveAttribute('href', 'tel:14416');
  });
});
