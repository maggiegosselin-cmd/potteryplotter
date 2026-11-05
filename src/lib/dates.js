// Date helpers for <input type="date"> values ('YYYY-MM-DD', local time). Pure.

const pad = (n) => String(n).padStart(2, '0');

export function msToDate(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Midday on that local day, or `now` when the day is today (so it never lies in the future). Null if blank or invalid. */
export function dateToMs(value, now = Date.now()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return null;
  const noon = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).getTime();
  if (Number.isNaN(noon)) return null;
  return value === msToDate(now) ? now : Math.min(noon, now);
}

export function shortDate(ms) {
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysLabel(days) {
  if (days <= 0) return 'today';
  return days === 1 ? '1 day' : `${days} days`;
}
