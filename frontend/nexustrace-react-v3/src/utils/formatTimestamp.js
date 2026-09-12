// Single shared timestamp-display formatter -- every place that renders a
// stored timestamp to an officer (Audit Log, entity/relationship detail
// inspector, and anywhere else) should call this instead of hand-rolling
// its own toLocaleString() options, so a format change never again means
// hunting down and fixing several near-duplicate functions individually.
//
// Format: "YYYY-MM-DD HH:MM:SS AM/PM" (12-hour, e.g. "2026-09-12 02:45:30 PM").
// Displayed in IST (Asia/Kolkata) -- this is an India MHA/NCRB system, and
// the backend stores naive UTC timestamps (datetime.utcnow(), no timezone
// suffix), so a bare ISO string is first coerced to UTC before conversion.
export function formatTimestamp(input, { withSeconds = true } = {}) {
  if (!input) return '—';

  const hasTzInfo = typeof input === 'string' && /(Z|[+-]\d\d:?\d\d)$/.test(input);
  const iso = typeof input === 'string' && !hasTzInfo ? `${input}Z` : input;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(input);

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: withSeconds ? '2-digit' : undefined,
      hour12: true,
    }).formatToParts(d).map((p) => [p.type, p.value])
  );

  const datePart = `${parts.year}-${parts.month}-${parts.day}`;
  const timePart = withSeconds
    ? `${parts.hour}:${parts.minute}:${parts.second} ${(parts.dayPeriod || '').toUpperCase()}`
    : `${parts.hour}:${parts.minute} ${(parts.dayPeriod || '').toUpperCase()}`;

  return `${datePart} ${timePart} IST`;
}
