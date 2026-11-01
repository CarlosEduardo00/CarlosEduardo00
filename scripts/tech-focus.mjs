// Gera assets/tech-focus.svg (gráfico animado de tecnologias em foco) a partir de tech-focus.json.
// Para mudar a ordem, os níveis ou as tecnologias, edite só o JSON; o workflow regenera o SVG.
//   node scripts/tech-focus.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const cfg = JSON.parse(await readFile(new URL('tech-focus.json', root), 'utf8'))

// Ícones do Simple Icons (viewBox 24x24); só o path, pintado de branco
async function iconPath(slug) {
  const svg = await (await fetch(`https://cdn.simpleicons.org/${slug}`)).text()
  const d = svg.match(/<path d="([^"]+)"/)
  if (!d) throw new Error(`Ícone não encontrado: ${slug}`)
  return d[1]
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const W = 840
const PAD = 32
const ROW_H = 74
const ROWS_Y = 112
const BAR_X = 112
const BAR_W = W - PAD - BAR_X
const CHIP_COLS = 5
const CHIP_GAP = 12
const CHIP_H = 44
const CHIP_W = (W - PAD * 2 - CHIP_GAP * (CHIP_COLS - 1)) / CHIP_COLS
const othersY = ROWS_Y + cfg.main.length * ROW_H + 18
const chipsY = othersY + 22
const chipRows = Math.ceil(cfg.others.length / CHIP_COLS)
const H = chipsY + chipRows * (CHIP_H + CHIP_GAP) + PAD - CHIP_GAP

const rowDelay = (i) => 0.5 + i * 0.28
const chipDelay = (i) => rowDelay(cfg.main.length) + 0.6 + i * 0.07
const scanCycle = cfg.others.length * 0.35 + 2 // varredura de luz pelos chips

let rows = ''
for (const [i, t] of cfg.main.entries()) {
  const y = ROWS_Y + i * ROW_H
  const fillW = (BAR_W * t.value) / 100
  const d = rowDelay(i)
  rows += `
  <g class="row" style="animation-delay:${d}s">
    <text x="${PAD}" y="${y + 6}" class="rank">${String(i + 1).padStart(2, '0')}</text>
    <svg x="${PAD + 34}" y="${y - 14}" width="26" height="26" viewBox="0 0 24 24"><path fill="#fff" d="${await iconPath(t.icon)}"/></svg>
    <text x="${BAR_X}" y="${y}" class="name">${esc(t.name)}</text>
    <text x="${BAR_X}" y="${y + 19}" class="detail">${esc(t.detail)}</text>
    <g transform="translate(${W - PAD}, ${y - 13})">
      <rect x="-${t.level.length * 7.4 + 22}" y="0" width="${t.level.length * 7.4 + 22}" height="22" rx="11" class="pill"/>
      <text x="-${(t.level.length * 7.4 + 22) / 2}" y="15" class="level" text-anchor="middle">${esc(t.level)}</text>
    </g>
    <rect x="${BAR_X}" y="${y + 32}" width="${BAR_W}" height="6" rx="3" class="track"/>
    <g clip-path="url(#clip${i})">
      <rect x="${BAR_X}" y="${y + 32}" width="${fillW}" height="6" rx="3" class="fill" style="animation-delay:${d + 0.15}s"/>
      <rect x="${BAR_X - 120}" y="${y + 30}" width="120" height="10" fill="url(#shine)" class="shine" style="animation-delay:${d + 1.8}s; --to:${fillW + 120}px"/>
    </g>
    <circle cx="${BAR_X + fillW}" cy="${y + 35}" r="5" class="dot" style="animation-delay:${d + 1.4}s, ${d + 1.9}s"/>
  </g>
  <clipPath id="clip${i}"><rect x="${BAR_X}" y="${y + 32}" width="${fillW}" height="6" rx="3"/></clipPath>`
}

let chips = ''
for (const [i, t] of cfg.others.entries()) {
  const col = i % CHIP_COLS
  const row = Math.floor(i / CHIP_COLS)
  const x = PAD + col * (CHIP_W + CHIP_GAP)
  const y = chipsY + row * (CHIP_H + CHIP_GAP)
  chips += `
  <g class="chip" style="animation-delay:${chipDelay(i)}s">
    <rect x="${x}" y="${y}" width="${CHIP_W}" height="${CHIP_H}" rx="10" class="chip-bg"/>
    <rect x="${x}" y="${y}" width="${CHIP_W}" height="${CHIP_H}" rx="10" class="chip-scan" style="animation-delay:${chipDelay(cfg.others.length) + 0.5 + i * 0.35}s"/>
    <svg x="${x + 14}" y="${y + 13}" width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="${await iconPath(t.icon)}"/></svg>
    <text x="${x + 42}" y="${y + 27}" class="chip-name">${esc(t.name)}</text>
  </g>`
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cfg.title)}: ${cfg.main.map((t) => esc(t.name)).join(', ')}">
  <defs>
    <linearGradient id="shine" x1="0" x2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#000" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="#fff" stop-opacity="0.12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>
  <style>
    text { font-family: 'Segoe UI', -apple-system, Helvetica, Arial, sans-serif; }
    .mono, .rank, .level, .title, .subtitle, .others-title { font-family: 'JetBrains Mono', SFMono-Regular, Consolas, 'Liberation Mono', monospace; }
    .title { fill: #fff; font-size: 15px; font-weight: 700; letter-spacing: 3px; }
    .subtitle { fill: #777; font-size: 12px; }
    .others-title { fill: #777; font-size: 11px; letter-spacing: 2.5px; }
    .rank { fill: #555; font-size: 13px; }
    .name { fill: #fff; font-size: 17px; font-weight: 600; }
    .detail { fill: #8a8a8a; font-size: 12.5px; }
    .level { fill: #fff; font-size: 11.5px; }
    .pill { fill: #000; stroke: #fff; stroke-opacity: .35; }
    .track { fill: #1a1a1a; }
    .fill { fill: #fff; transform-box: fill-box; transform-origin: left center; transform: scaleX(0); animation: grow 1.5s cubic-bezier(.22,1,.36,1) forwards; }
    .shine { transform: translateX(0); animation: sweep 2.6s ease-in-out infinite; opacity: 0; }
    .dot { fill: #fff; opacity: 0; transform-box: fill-box; transform-origin: center; animation: pop .4s ease-out forwards, pulse 2.4s ease-in-out infinite; }
    .row, .chip { opacity: 0; animation: rise .7s cubic-bezier(.22,1,.36,1) forwards; }
    .chip-bg { fill: #0a0a0a; stroke: #fff; stroke-opacity: .14; }
    .chip-scan { fill: none; stroke: #fff; stroke-width: 1.2; opacity: 0; animation: scan ${scanCycle}s ease-in-out infinite; }
    .chip-name { fill: #e6e6e6; font-size: 13.5px; }
    .rule { stroke: #fff; stroke-opacity: .2; stroke-dasharray: ${W - PAD * 2}; stroke-dashoffset: ${W - PAD * 2}; animation: draw 1.2s .2s ease-out forwards; }
    .cursor { fill: #fff; animation: blink 1s steps(1) infinite; }
    @keyframes grow { to { transform: scaleX(1); } }
    @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes sweep { 0% { opacity: 1; transform: translateX(0); } 60%, 100% { opacity: 1; transform: translateX(var(--to)); } }
    @keyframes pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
    @keyframes pulse { 0%, 100% { r: 4; opacity: 1; } 50% { r: 6; opacity: .55; } }
    @keyframes scan { 0% { opacity: 0; } ${((0.35 / scanCycle) * 100).toFixed(1)}% { opacity: .9; } ${((0.9 / scanCycle) * 100).toFixed(1)}%, 100% { opacity: 0; } }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes blink { 50% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .fill { transform: none; animation: none; }
      .row, .chip, .dot { opacity: 1; animation: none; }
      .shine, .chip-scan { display: none; }
      .rule { stroke-dashoffset: 0; animation: none; }
    }
  </style>
  <rect width="${W}" height="${H}" rx="16" fill="#000"/>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="#fff" stroke-opacity=".12"/>
  <ellipse cx="${W - 120}" cy="0" rx="320" ry="160" fill="url(#glow)"/>
  <text x="${PAD}" y="50" class="title">${esc(cfg.title)}</text>
  <rect x="${PAD + cfg.title.length * 11.4 + 4}" y="38" width="9" height="15" class="cursor"/>
  <text x="${W - PAD}" y="50" class="subtitle" text-anchor="end">${esc(cfg.subtitle)} ↓</text>
  <line x1="${PAD}" y1="70" x2="${W - PAD}" y2="70" class="rule"/>
  ${rows}
  <text x="${PAD}" y="${othersY}" class="others-title">${esc(cfg.othersTitle)}</text>
  ${chips}
</svg>
`

await mkdir(new URL('assets/', root), { recursive: true })
await writeFile(new URL('assets/tech-focus.svg', root), svg)
console.log(`assets/tech-focus.svg gerado (${W}x${H}, ${cfg.main.length} principais + ${cfg.others.length} extras)`)
