import { readFile } from 'node:fs/promises';
const j = async (p) => JSON.parse(await readFile(p, 'utf8'));
const news = await j('data/news.json');
console.log('first_seen_at sample:', JSON.stringify(news.items[0]?.meta?.first_seen_at));
let n = 0; for (const it of news.items) if (it.meta && it.meta.first_seen_at) n += 1;
console.log('items with first_seen_at:', n, 'of', news.items.length);
console.log('x items:', (await j('data/x-surface.json')).items.length);
const html = await readFile('public/index.html', 'utf8').catch(() => null);
if (html) {
  const vis = html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ')
    .replace(/\s+/g, ' ').trim();
  console.log('index.html bytes:', html.length, 'visible chars:', vis.length);
  const head = vis.slice(0, 6000);
  console.log('"DOOMCON 4" in first 6000:', (head.match(/DOOMCON\s*4\b/g) || []).length);
  console.log('"ROUTINE" in first 6000:', (head.match(/\bROUTINE\b/g) || []).length);
} else {
  console.log('no public/index.html yet');
}
