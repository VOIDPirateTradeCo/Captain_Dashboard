const fs = require('fs');
const path = 'list_open_cards.js';
let s = fs.readFileSync(path, 'utf8');
const marker = 'const filtered = cards.filter(card => {';
if (s.includes(marker)) {
  s = s.replace(marker, marker + "\n  const n=(card.name||'').toLowerCase();\n  if(/tr3asure|crownless|sir cobalt|archived|done/.test(n)) return false;\n");
} else {
  const insert = 'const cards = await getCards(OPEN_LIST_ID)\n';
  s = s.replace(insert, insert + 'const filtered = cards.filter(card => { const n=(card.name||"").toLowerCase(); if(/tr3asure|crownless|sir cobalt|archived|done/.test(n)) return false; return true; })\n');
}
fs.writeFileSync(path, s);
console.log('patched filter');
