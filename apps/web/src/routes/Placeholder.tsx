// A stand-in for nav destinations that aren't built yet (Album, Stats,
// Settings - see TODO.md milestones M3/M4), so the persistent nav (FR-11)
// never leads to a dead 404 while those screens are pending.
import { Link } from "react-router-dom";

export function Placeholder({ title }: { title: string }) {
  return (
    <main style={{ padding: 24 }}>
      <p>
        <Link to="/">← Back to the Lounge</Link>
      </p>
      <h1>{title}</h1>
      <p>Not built yet - see TODO.md.</p>
    </main>
  );
}
