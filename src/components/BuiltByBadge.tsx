export default function BuiltByBadge() {
  return (
    <div className="built-by-badge">
      <img
        src="https://unavatar.io/twitter/pinteasalex1"
        width="24"
        height="24"
        alt="@pinteasalex1"
        style={{ borderRadius: "50%" }}
      />
      <span className="built-by-label">Built by</span>
      <a
        href="https://x.com/pinteasalex1"
        target="_blank"
        rel="noopener noreferrer"
        className="built-by-link"
      >
        @pinteasalex1
      </a>
    </div>
  );
}
