import { readFileSync, writeFileSync, utimesSync } from 'node:fs';
const days = Number(process.argv[2]);
for (const k of ['osm-datacenters-world', 'ne-countries-50m']) {
  const p = `data/dc-cache/${k}.json`;
  const { fetched_at, ...rest } = JSON.parse(readFileSync(p, 'utf8'));
  const when = new Date(Date.now() - days * 86_400_000).toISOString();
  writeFileSync(p, `${JSON.stringify({ fetched_at: when, ...rest })}\n`);
  utimesSync(p, new Date(), new Date()); // what actions/checkout does to every file
  console.log(`${k}: stamp ${when}, mtime now`);
}
