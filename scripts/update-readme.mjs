// Atualiza as seções automáticas do README do perfil ("Mexendo agora" e a data).
// As tecnologias em foco não são calculadas: vêm de tech-focus.json (ver scripts/tech-focus.mjs).
// Roda no GitHub Actions (ver .github/workflows/update-readme.yml) ou localmente:
//   GH_TOKEN=$(gh auth token) node scripts/update-readme.mjs
// Sem dependências: só Node 20+.

import { readFile, writeFile } from 'node:fs/promises'

const USER = process.env.GH_USER || 'CarlosEduardo00'
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
const README = new URL('../README.md', import.meta.url)
const MONTHS = 12 // só entram repositórios mexidos nesse período (mínimo de 2)
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

function replaceBlock(text, name, content) {
  const re = new RegExp(`(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`)
  if (!re.test(text)) {
    console.warn(`Marcador ${name} não encontrado no README; seção ignorada.`)
    return text
  }
  return text.replace(re, `$1\n${content}\n$2`)
}

// Só repositórios públicos, nunca forks: nomes privados não vão para o README
const repos = (await gh(`/users/${USER}/repos?per_page=100&sort=pushed`)).filter(
  (r) => !r.fork && !r.private && !IGNORE.has(r.name) && r.description,
)
const since = Date.now() - MONTHS * 30 * 24 * 3600 * 1000
const inWindow = repos.filter((r) => new Date(r.pushed_at) > since)

const recent = (inWindow.length >= 2 ? inWindow : repos.slice(0, 2))
  .slice(0, 5)
  .map((r) => {
    const date = new Date(r.pushed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    const lang = r.language ? ` \`${r.language}\`` : ''
    const live = r.homepage ? ` · [demo](${r.homepage.startsWith('http') ? r.homepage : 'https://' + r.homepage})` : ''
    return `- **[${r.name}](${r.html_url})**${lang} · ${r.description}${live} <sub>(atualizado em ${date})</sub>`
  })
  .join('\n')

let text = await readFile(README, 'utf8')
text = replaceBlock(text, 'RECENT', recent)
text = replaceBlock(text, 'UPDATED', `<sub>Seções automáticas atualizadas em ${new Date().toLocaleDateString('pt-BR')} por GitHub Actions.</sub>`)
await writeFile(README, text)
console.log(`README atualizado: ${recent.split('\n').length} projetos recentes`)
