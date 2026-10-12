// S30 "Wrong Ward" 404. See masterdoc.md section 2.2.
export function NotFound() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <p>This corridor leads nowhere. Wrong ward.</p>
    </main>
  );
}
