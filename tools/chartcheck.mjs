import { SONGS } from '../js/config.js';
import { buildChart, buildFreestyleChart } from '../js/charts.js';
import { POSES, POOLS } from '../js/poses.js';
let fail = 0;
for (const s of SONGS) {
  const c = buildChart(s);
  const names = c.moves.map((m) => m.pose);
  const missing = names.filter((n) => !POSES[n]);
  const flowMissing = c.flow.filter((m) => !POSES[m.pose]).length;
  const distinct = new Set(names).size;
  const ev = (e) => c.moves.filter((m) => m.event === e).length;
  if (missing.length || flowMissing) fail++;
  console.log(`${s.id}: moves=${c.moves.length} distinct=${distinct} jump=${ev('jump')} squat=${ev('squat')} turn=${ev('turn')} flow=${c.flow.length} missing=${missing.length + flowMissing}`);
}
const fs = buildFreestyleChart(120, 150);
console.log(`freestyle: moves=${fs.moves.length} distinct=${new Set(fs.moves.map(m=>m.pose)).size} missing=${fs.moves.filter(m=>!POSES[m.pose]).length}`);
const a = buildChart(SONGS[0]).moves.map((m) => m.pose).join(',');
const b = buildChart(SONGS[0]).moves.map((m) => m.pose).join(',');
console.log(`poses total=${Object.keys(POSES).length} pools: e1=${POOLS.e1.length} e2=${POOLS.e2.length} e3=${POOLS.e3.length} deterministic=${a === b}`);
if (a !== b) fail++;
process.exit(fail ? 1 : 0);
