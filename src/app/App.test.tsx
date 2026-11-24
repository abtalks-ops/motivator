import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the welcome screen and the coach disclaimer', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Motivator' })).toBeInTheDocument();
    expect(screen.getByText(/coach, not a therapist/i)).toBeInTheDocument();
  });
});
