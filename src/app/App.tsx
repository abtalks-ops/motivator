import { UpdatePrompt } from '../pwa/UpdatePrompt';
import { usePersistentStorage } from '../pwa/usePersistentStorage';

export function App() {
  const persisted = usePersistentStorage();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Motivator</h1>
        <p className="tagline">Your private, offline coach</p>
      </header>

      <main className="app-main" id="main">
        <section className="card" aria-labelledby="welcome-title">
          <h2 id="welcome-title">Welcome</h2>
          <p>
            Talk through what is on your mind and get a small, concrete next step. Everything stays
            on this device.
          </p>
          <p className="muted">Onboarding and chat arrive in the next updates.</p>
        </section>
      </main>

      <footer className="app-footer">
        <p>
          Motivator is a coach, not a therapist, and does not give medical advice.
          {persisted === false && ' Your browser may clear stored data when space runs low.'}
        </p>
      </footer>

      <UpdatePrompt />
    </div>
  );
}
