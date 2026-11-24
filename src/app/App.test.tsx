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

    expect(await screen.findByText(/how are you feeling today, asha/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/good/i));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { name: 'Hi Asha' })).toBeInTheDocument();
    expect(screen.getByText(/feeling/i)).toHaveTextContent(/good/i);
    expect(screen.getByText(/maya is getting ready/i)).toBeInTheDocument();
  });
});
