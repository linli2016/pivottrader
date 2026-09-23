/**
 * Date utility helpers using local timezone.
 */

/**
 * Returns a YYYY-MM-DD formatted date string in the user's LOCAL timezone.
 * Unlike date.toISOString().slice(0, 10) which converts to UTC and rolls over
 * prematurely in the evening hours for western timezones, this respects local date.
 *
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} YYYY-MM-DD
 */
export function getLocalDateStr(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

