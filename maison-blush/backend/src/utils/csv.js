// CSV banata hai. Excel mein =, +, -, @ se shuru hone wale cells formula ban sakte hain (CSV injection) — unhe ' laga kar rok dete hain.
const cell = (v) => {
  let s = v instanceof Date ? v.toISOString() : String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export const toCSV = (headers, rows) => [headers.join(','), ...rows.map((r) => r.map(cell).join(','))].join('\r\n')
