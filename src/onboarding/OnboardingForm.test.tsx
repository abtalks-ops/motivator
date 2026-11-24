import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingForm } from './OnboardingForm';

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/name or nickname/i), 'Asha');
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByLabelText('Career'));
  await user.type(screen.getByLabelText(/one goal or challenge/i), 'Finish my portfolio');
  await user.click(screen.getByRole('button', { name: 'Next' }));
}

describe('OnboardingForm', () => {
  it('blocks the next step until the name is filled in', async () => {
    const user = userEvent.setup();
    render(<OnboardingForm onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/what to call you/i);
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument();
  });

  it('suggests Arjun for tough love and Maya for gentle', async () => {
    const user = userEvent.setup();
    render(<OnboardingForm onSubmit={vi.fn()} />);
    await fillRequired(user);
    await user.click(screen.getByLabelText(/tough love/i));
    expect(screen.getByRole('radio', { name: /arjun/i })).toBeChecked();
    await user.click(screen.getByLabelText(/^gentle/i));
    expect(screen.getByRole('radio', { name: /maya/i })).toBeChecked();
  });

  it('submits the profile with optional fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<OnboardingForm onSubmit={onSubmit} />);
    await fillRequired(user);
    await user.click(screen.getByLabelText(/^balanced/i));
    await user.click(screen.getByRole('radio', { name: /arjun/i }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.selectOptions(screen.getByLabelText(/preferred language/i), 'hi');
    await user.click(screen.getByRole('button', { name: 'Start' }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Asha',
      focus: 'career',
      goal: 'Finish my portfolio',
      style: 'balanced',
      coach: 'arjun',
      language: 'hi',
    });
  });
});
