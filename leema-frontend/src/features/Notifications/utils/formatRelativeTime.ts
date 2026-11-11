const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

const TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "just now", "5 minutes ago", "yesterday", ... */
export function formatRelativeTime(timestampMs: number, nowMs = Date.now()) {
  const elapsedMs = timestampMs - nowMs;
  for (const [unit, unitMs] of TIME_UNITS) {
    if (Math.abs(elapsedMs) >= unitMs) {
      return relativeTimeFormatter.format(Math.round(elapsedMs / unitMs), unit);
    }
  }
  return "just now";
}
