const fs = require('fs');
const path = 'list_open_cards.js';
let s = fs.readFileSync(path, 'utf8');
const marker = "const ignoreListNames = new Set([";
const start = s.indexOf(marker);
const end = s.indexOf("])", start) + 2;
if (start >= 0 && end > start) {
  const replacement = "const ignoreListNames = new Set(['Done','Pirate Rules','Sir Cobalt Stuff','Pirate Captain Future Ideas','Cosmos Lore Writing','[PROJECT: Crownless Fortune]','[PROJECT: tr3asure mAp]','Sir Green Inbox','Top 10 Focus Fleet','P1 - High','P2 - Medium','P3 - Low','P4 - Backlog'])";
  s = s.slice(0, start) + replacement + s.slice(end);
  fs.writeFileSync(path, s);
  console.log('patched ignore lists safely');
} else {
  console.log('marker not found');
}
