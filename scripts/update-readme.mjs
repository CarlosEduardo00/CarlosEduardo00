// Atualiza as seções automáticas do README do perfil.
// Roda no GitHub Actions (ver .github/workflows/update-readme.yml) ou localmente:
//   GH_TOKEN=$(gh auth token) node scripts/update-readme.mjs
// Sem dependências: só Node 20+.

import { readFile, writeFile } from 'node:fs/promises'

const USER = process.env.GH_USER || 'CarlosEduardo00'
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
const README = new URL('../README.md', import.meta.url)
const MONTHS = 12 // janela usada para as "linguagens em foco"
const IGNORE = new Set([USER, 'testeTTTT', 'teste_teste'])

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': `${USER}-readme`,
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

// Com um token de usuário (secret README_PAT) também entram repositórios privados,
// mas só no cálculo de linguagens: nomes privados nunca vão para o README.
async function listRepos() {
  const own = TOKEN ? await gh('/user/repos?per_page=100&affiliation=owner&sort=pushed').catch(() => null) : null
  const repos = own ?? (await gh(`/users/${USER}/repos?per_page=100&sort=pushed`))
  return repos.filter((r) => !r.fork && !IGNORE.has(r.name))
}

const bar = (pct, size = 25) => {
  const full = Math.round((pct / 100) * size)
  return '█'.repeat(full) + '░'.repeat(size - full)
}

function replaceBlock(text, name, content) {
  const re = new RegExp(`(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`)
  if (!re.test(text)) throw new Error(`Marcador ${name} não encontrado no README`)
  return text.replace(re, `$1\n${content}\n$2`)
}

const repos = await listRepos()
const since = Date.now() - MONTHS * 30 * 24 * 3600 * 1000

// 1) Linguagens em foco: bytes por linguagem nos repositórios mexidos nos últimos meses
const totals = {}
for (const r of repos.filter((r) => new Date(r.pushed_at) > since)) {
  const langs = await gh(`/repos/${r.owner.login}/${r.name}/languages`)
  for (const [lang, bytes] of Object.entries(langs)) totals[lang] = (totals[lang] || 0) + bytes
}
const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1
const top = Object.entries(totals)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6)
  .map(([l, b]) => [l, (b / sum) * 100])
const width = Math.max(...top.map(([l]) => l.length), 10)
const langBlock = [
  '```text',
  ...top.map(([l, p]) => `${l.padEnd(width)}  ${bar(p)}  ${p.toFixed(1).padStart(5)} %`),
  '```',
  `<sub>Calculado a partir do código dos repositórios atualizados nos últimos ${MONTHS} meses.</sub>`,
].join('\n')

// 2) Projetos recentes: só repositórios públicos com descrição, mexidos na janela (mínimo de 2)
const publicRepos = repos.filter((r) => !r.private && r.description)
const inWindow = publicRepos.filter((r) => new Date(r.pushed_at) > since)
const recent = (inWindow.length >= 2 ? inWindow : publicRepos.slice(0, 2))
  .slice(0, 5)
  .map((r) => {
    const date = new Date(r.pushed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    const lang = r.language ? ` \`${r.language}\`` : ''
    const live = r.homepage ? ` · [demo](${r.homepage.startsWith('http') ? r.homepage : 'https://' + r.homepage})` : ''
    return `- **[${r.name}](${r.html_url})**${lang} · ${r.description}${live} <sub>(atualizado em ${date})</sub>`
  })
  .join('\n')

let text = await readFile(README, 'utf8')
text = replaceBlock(text, 'LANGS', langBlock)
text = replaceBlock(text, 'RECENT', recent)
text = replaceBlock(text, 'UPDATED', `<sub>Seções automáticas atualizadas em ${new Date().toLocaleDateString('pt-BR')} por GitHub Actions.</sub>`)
await writeFile(README, text)
console.log('README atualizado:', top.map(([l, p]) => `${l} ${p.toFixed(1)}%`).join(', '))
