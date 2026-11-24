import { FIND_A_HELPLINE_URL, HELPLINES } from './helplines';

export function HelplineCard({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <aside className="card helpline" role="alert" aria-labelledby="helpline-title">
      <h2 id="helpline-title">You don&apos;t have to go through this alone</h2>
      <p>
        If you are thinking about harming yourself or you are in danger, please talk to someone
        right now. These lines are free and confidential.
      </p>
      <ul>
        {HELPLINES.map((h) => (
          <li key={h.region}>
            <strong>{h.region}:</strong> {h.name}, <a href={`tel:${h.phone}`}>{h.display}</a>
          </li>
        ))}
        <li>
          Elsewhere:{' '}
          <a href={FIND_A_HELPLINE_URL} target="_blank" rel="noreferrer">
            findahelpline.com
          </a>
        </li>
      </ul>
      <p>
        <strong>
          In immediate danger, call your local emergency number (112 in India and Europe, 911 in
          North America).
        </strong>
      </p>
      {onDismiss && (
        <div className="actions">
          <button type="button" className="secondary" onClick={onDismiss}>
            Hide
          </button>
        </div>
      )}
    </aside>
  );
}
