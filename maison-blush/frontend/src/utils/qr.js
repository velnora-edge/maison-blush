/**
 * Chota QR code generator (koi package nahi chahiye).
 * Byte mode, error-correction level M, versions 1–10 (~210 characters tak).
 * qrMatrix("text") -> true/false ki 2D grid (true = kala dabba)
 */
const EC_M = { // version: [EC codewords per block, [[blocks, data codewords per block], ...]]
  1: [10, [[1, 16]]], 2: [16, [[1, 28]]], 3: [26, [[1, 44]]], 4: [18, [[2, 32]]], 5: [24, [[2, 43]]],
  6: [16, [[4, 27]]], 7: [18, [[4, 31]]], 8: [22, [[2, 38], [2, 39]]], 9: [22, [[3, 36], [2, 37]]], 10: [26, [[4, 43], [1, 44]]],
}
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] }

// Reed–Solomon over GF(256)
const EXP = new Array(512), LOG = new Array(256)
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
const gmul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0)
function generator(degree) {
  let g = [1]
  for (let i = 0; i < degree; i++) {
    const n = new Array(g.length + 1).fill(0)
    for (let j = 0; j < g.length; j++) { n[j] ^= g[j]; n[j + 1] ^= gmul(g[j], EXP[i]) }
    g = n
  }
  return g
}
function remainder(data, gen) {
  const res = new Array(gen.length - 1).fill(0)
  for (const b of data) {
    const f = b ^ res.shift()
    res.push(0)
    for (let i = 0; i < res.length; i++) res[i] ^= gmul(gen[i + 1], f)
  }
  return res
}

const dataCapacity = (v) => EC_M[v][1].reduce((t, [n, d]) => t + n * d, 0)

function encodeData(bytes, version) {
  const bits = []
  const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1) }
  push(0b0100, 4)
  push(bytes.length, version < 10 ? 8 : 16)
  bytes.forEach((b) => push(b, 8))
  const cap = dataCapacity(version) * 8
  push(0, Math.min(4, cap - bits.length))
  while (bits.length % 8) bits.push(0)
  const out = []
  for (let i = 0; i < bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8).join(''), 2))
  for (let pad = 0xec; out.length < dataCapacity(version); pad ^= 0xec ^ 0x11) out.push(pad)
  return out
}

function interleave(data, version) {
  const [ecLen, groups] = EC_M[version]
  const gen = generator(ecLen)
  const blocks = []
  let pos = 0
  for (const [count, len] of groups) {
    for (let i = 0; i < count; i++) {
      const d = data.slice(pos, pos + len); pos += len
      blocks.push({ d, ec: remainder(d, gen) })
    }
  }
  const out = []
  const maxLen = Math.max(...blocks.map((b) => b.d.length))
  for (let i = 0; i < maxLen; i++) blocks.forEach((b) => { if (i < b.d.length) out.push(b.d[i]) })
  for (let i = 0; i < ecLen; i++) blocks.forEach((b) => out.push(b.ec[i]))
  return out
}

function buildMatrix(version, codewords) {
  const size = version * 4 + 17
  const mod = Array.from({ length: size }, () => new Array(size).fill(false))
  const fn = Array.from({ length: size }, () => new Array(size).fill(false))
  const set = (x, y, dark) => { if (x >= 0 && y >= 0 && x < size && y < size) { mod[y][x] = dark; fn[y][x] = true } }

  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0) }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, d !== 2 && d !== 4)
    }
  }
  const pos = ALIGN[version]
  pos.forEach((py, i) => pos.forEach((px, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) return
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
  }))
  const formatBits = (mask) => {
    const data = mask // EC level M = 00
    let rem = data
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    return ((data << 10) | rem) ^ 0x5412
  }
  const drawFormat = (mask) => {
    const bits = formatBits(mask)
    const bit = (i) => ((bits >>> i) & 1) !== 0
    for (let i = 0; i <= 5; i++) set(8, i, bit(i))
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8))
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i))
    set(8, size - 8, true)
  }
  if (version >= 7) {
    let rem = version
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const bits = (version << 12) | rem
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) !== 0
      const a = size - 11 + (i % 3), b = Math.floor(i / 3)
      set(a, b, dark); set(b, a, dark)
    }
  }
  drawFormat(0)

  // data bits zig-zag
  let i = 0
  const total = codewords.length * 8
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j
      const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert
      if (!fn[y][x] && i < total) { mod[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++ }
    }
  }

  const applyMask = (mask) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (fn[y][x]) continue
      const inv = [
        (x + y) % 2 === 0, y % 2 === 0, x % 3 === 0, (x + y) % 3 === 0,
        (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, ((x * y) % 2) + ((x * y) % 3) === 0,
        ((((x * y) % 2) + ((x * y) % 3)) % 2) === 0, ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0,
      ][mask]
      if (inv) mod[y][x] = !mod[y][x]
    }
  }
  const penalty = () => {
    let p = 0
    const lines = []
    for (let a = 0; a < size; a++) {
      lines.push(mod[a].map((v) => (v ? '1' : '0')).join(''))
      lines.push(mod.map((row) => (row[a] ? '1' : '0')).join(''))
    }
    for (const line of lines) {
      for (const run of line.match(/0+|1+/g)) if (run.length >= 5) p += 3 + run.length - 5
      p += 40 * (line.match(/(?=10111010000|00001011101)/g) || []).length
    }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
      const c = mod[y][x]
      if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3
    }
    const dark = mod.flat().filter(Boolean).length
    p += (Math.ceil(Math.abs(dark * 20 - size * size * 10) / (size * size)) - 1) * 10
    return p
  }

  let best = 0, bestScore = Infinity
  for (let m = 0; m < 8; m++) {
    applyMask(m); drawFormat(m)
    const s = penalty()
    if (s < bestScore) { best = m; bestScore = s }
    applyMask(m) // undo
  }
  applyMask(best); drawFormat(best)
  return mod
}

export function qrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(String(text)))
  let version = 1
  while (version <= 10 && 4 + (version < 10 ? 8 : 16) + bytes.length * 8 > dataCapacity(version) * 8) version++
  if (version > 10) throw new Error('QR text is too long (max ~210 characters)')
  return buildMatrix(version, interleave(encodeData(bytes, version), version))
}
