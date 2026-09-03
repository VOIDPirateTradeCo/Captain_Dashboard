const fs = require('fs');
const path = 'list_open_cards.js';
let s = fs.readFileSync(path, 'utf8');
const marker = 'const filtered = cards.filter(card => {';
const idx = s.indexOf(marker);
if (idx >= 0) {
  const end = s.indexOf('})', idx) + 2;
  const replacement = marker + "\n" +
    "  const n=(card.name||'').toLowerCase();\n" +
    "  if(/tr3asure|crownless|sir cobalt|archived|done|inbox|focus fleet|p1 - high|p2 - medium|p3 - low|p4 - backlog/.test(n)) return false;\n" +
    "  const listName = listNameById.get(card.idList) || ''\n" +
    "  if (['Done','Pirate Rules','Sir Cobalt Stuff','Pirate Captain Future Ideas','Cosmos Lore Writing','Sir Green Inbox','Top 10 Focus Fleet'].includes(listName)) return false\n" +
    "  const labels = (card.labels || []).map(l => l.name || '').filter(Boolean)\n" +
    "  if (labels.some(n => ['archived','rules','future-ideas','lore'].includes(n.toLowerCase()))) return false\n" +
    "  return true\n" +
    "})";
  s = s.slice(0, idx) + replacement + s.slice(end);
  fs.writeFileSync(path, s);
  console.log('rewrote filter');
} else {
  console.log('marker missing');
}
