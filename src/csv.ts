/** Spreadsheet-safe: no formula injection, quotes doubled. Plain numbers stay numbers. */
export function csvCell(v: string): string {
  let s = v ?? '';
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
