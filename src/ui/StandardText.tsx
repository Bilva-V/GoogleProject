// The standard description, with anything still missing ("[LENGTH?]") set apart
// so the eye goes straight to what the engineer has to supply.

export function StandardText({ text, quiet }: { text: string; quiet?: boolean }) {
  const pieces = text.split(/(\[[A-Z ]+\?\])/g).filter(Boolean);
  return (
    <span className={`std${quiet ? ' is-quiet' : ''}`}>
      {pieces.map((p, i) =>
        /^\[.*\?\]$/.test(p) ? (
          <span key={i} className="std-missing" title="Not stated yet">
            {p.slice(1, -2).toLowerCase()}?
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </span>
  );
}
