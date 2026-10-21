#!/usr/bin/env node
// Image-credit backlink hunt (ops).
//
// Playbook from the X thread that works for small sites with distinctive
// share cards: reverse-search our images, find pages that reuse them without
// linking to siren.watch, email the owner with the image URL and ask for a
// credit link. Metric in Search Console → Links → Top linked pages.
//
//   node collector/tools/image-credit.mjs list
//   node collector/tools/image-credit.mjs check <pageUrl> [--image <ourImageUrl>]
//   node collector/tools/image-credit.mjs draft --page <pageUrl> --image <ourImageUrl> [--to Name]
//   node collector/tools/image-credit.mjs selftest
//
// Network goes through collector/fetch.mjs (CONTRACT.md). Nothing here posts
// mail — drafts print to stdout for the operator to send.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchText } from '../fetch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SITE = (process.env.SITE_URL || 'https://siren.watch').replace(/\/$/, '');
const HOME = `${SITE}/`;

/** Distinctive assets worth reverse-searching. Faces of public figures are out. */
export const ASSETS = [
  {
    id: 'state-card',
    path: '/cards/state.png',
    note: 'Live share card (redrawn hourly). Best weekly Lens pass.',
  },
  {
    id: 'badge',
    path: '/badge.svg',
    note: 'README / embed badge. Hotlink without the wrapping <a> is the miss.',
  },
  {
    id: 'explainer-poster',
    path: '/media/siren-explainer-poster.jpg',
    note: 'Video poster — travels when people clip the explainer.',
  },
  {
    id: 'skynet-poster',
    path: '/media/siren-skynet-poster.jpg',
    note: 'Video poster.',
  },
  {
    id: 'si-ready-poster',
    path: '/media/siren-si-ready-poster.jpg',
    note: 'Video poster.',
  },
  {
    id: 'tally-poster',
    path: '/media/siren-tally-poster.jpg',
    note: 'Video poster.',
  },
  {
    id: 'supply-drop-poster',
    path: '/media/siren-supply-drop-poster.jpg',
    note: 'Video poster.',
  },
  {
    id: 'road-to-si-poster',
    path: '/media/siren-road-to-si-poster.jpg',
    note: 'Video poster.',
  },
  {
    id: 'ai-proof-job-poster',
    path: '/media/siren-ai-proof-job-poster.jpg',
    note: 'Video poster.',
  },
  {
    id: 'art-siren',
    path: '/img/art-siren.webp',
    note: 'Brand tile art.',
  },
  {
    id: 'apple-touch',
    path: '/apple-touch-icon.png',
    note: 'Touch icon / brand mark.',
  },
];

function assetUrl(rel) {
  return `${SITE}${rel.startsWith('/') ? rel : `/${rel}`}`;
}

export function reverseSearchUrls(imageUrl) {
  const enc = encodeURIComponent(imageUrl);
  return {
    lens: `https://lens.google.com/uploadbyurl?url=${enc}`,
    tineye: `https://tineye.com/search?url=${enc}`,
    bing: `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${enc}`,
    yandex: `https://yandex.com/images/search?rpt=imageview&url=${enc}`,
  };
}

/** Hosts we do not treat as outreach targets. */
export function isOwnHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return (
    h === 'siren.watch' ||
    h.endsWith('.siren.watch') ||
    h === 'messagegabrielhere-lgtm.github.io' ||
    h.endsWith('.twimg.com') ||
    h.endsWith('.twitter.com') ||
    h === 'x.com' ||
    h === 't.co'
  );
}

/**
 * Does this HTML credit SIREN with a navigable link (not merely the word)?
 * Accepts absolute and root-relative links to the live domain.
 */
export function pageLinksToSiren(html, site = SITE) {
  const body = String(html || '');
  const host = site.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const abs = new RegExp(
    `<a\\b[^>]*\\bhref\\s*=\\s*["']https?:\\/\\/${escapeReg(host)}(?:\\/[^"']*)?["']`,
    'i',
  );
  if (abs.test(body)) return true;
  // Root-relative only counts when the page itself is already on our host.
  return false;
}

export function pageEmbedsImage(html, imageUrl) {
  const body = String(html || '');
  const variants = new Set([imageUrl]);
  try {
    const u = new URL(imageUrl);
    variants.add(u.pathname);
    variants.add(u.href);
    // Drop query/hash for loose match.
    variants.add(`${u.origin}${u.pathname}`);
  } catch {
    /* keep raw */
  }
  for (const v of variants) {
    if (v && body.includes(v)) return true;
  }
  return false;
}

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function draftEmail({ pageUrl, imageUrl, toName = 'there', site = SITE } = {}) {
  const home = `${site}/`;
  const subject = 'Image credit request — SIREN share asset';
  const body = [
    `Hi ${toName},`,
    '',
    `I noticed this page uses an image from SIREN (the AI activity index):`,
    '',
    `  Page:  ${pageUrl}`,
    `  Image: ${imageUrl}`,
    '',
    `Would you mind adding a credit link back to ${home} next to the image`,
    `(or wrapping the image in that link)? A plain text credit with the URL`,
    `is enough.`,
    '',
    `Happy to send a fresher PNG or the embed snippet if useful:`,
    `  ${site}/export.html`,
    '',
    'Thanks,',
    '[name]',
  ].join('\n');
  return { subject, body };
}

function printList() {
  console.log(`SIREN image-credit inventory (${SITE})`);
  console.log('Open each Lens / TinEye / Bing URL in a browser. Captchas are normal.');
  console.log('Skip matches on our own hosts. For every other hit, run:');
  console.log('  node collector/tools/image-credit.mjs check <pageUrl> --image <imageUrl>');
  console.log('');
  for (const a of ASSETS) {
    const url = assetUrl(a.path);
    const rs = reverseSearchUrls(url);
    console.log(`## ${a.id}`);
    console.log(`  image:  ${url}`);
    console.log(`  note:   ${a.note}`);
    console.log(`  lens:   ${rs.lens}`);
    console.log(`  tineye: ${rs.tineye}`);
    console.log(`  bing:   ${rs.bing}`);
    console.log(`  yandex: ${rs.yandex}`);
    console.log('');
  }
}

async function checkPage(pageUrl, imageUrl) {
  let host;
  try {
    host = new URL(pageUrl).hostname;
  } catch {
    throw new Error(`bad page URL: ${pageUrl}`);
  }
  if (isOwnHost(host)) {
    console.log(`SKIP  ${pageUrl} — own / CDN host (${host})`);
    return { skip: true, own: true };
  }

  const html = await fetchText(pageUrl);
  const embeds = imageUrl ? pageEmbedsImage(html, imageUrl) : null;
  const linked = pageLinksToSiren(html, SITE);
  const mailto = [...html.matchAll(/mailto:([^"'?\s>]+)/gi)].map((m) => decodeURIComponent(m[1]));
  const contactHints = [...html.matchAll(/href=["']([^"']*(?:contact|about|impressum)[^"']*)["']/gi)]
    .map((m) => m[1])
    .slice(0, 8);

  const status = linked ? 'CREDITED' : 'ASK';
  console.log(`${status}  ${pageUrl}`);
  if (imageUrl) console.log(`  embeds image: ${embeds ? 'yes' : 'not found in HTML (may be CSS/CDN rename)'}`);
  console.log(`  links to ${SITE}: ${linked ? 'yes' : 'no'}`);
  if (mailto.length) console.log(`  mailto: ${[...new Set(mailto)].slice(0, 5).join(', ')}`);
  if (contactHints.length) console.log(`  contact-ish links: ${contactHints.join(', ')}`);
  if (!linked && imageUrl) {
    console.log('');
    console.log('Draft with:');
    console.log(`  node collector/tools/image-credit.mjs draft --page ${JSON.stringify(pageUrl)} --image ${JSON.stringify(imageUrl)}`);
  }
  return { skip: false, embeds, linked, mailto, contactHints };
}

function printDraft(opts) {
  const { subject, body } = draftEmail(opts);
  console.log(`Subject: ${subject}`);
  console.log('');
  console.log(body);
}

function usage(code = 1) {
  console.error(`Usage:
  node collector/tools/image-credit.mjs list
  node collector/tools/image-credit.mjs check <pageUrl> [--image <ourImageUrl>]
  node collector/tools/image-credit.mjs draft --page <pageUrl> --image <ourImageUrl> [--to Name]
  node collector/tools/image-credit.mjs selftest`);
  process.exit(code);
}

function selftest() {
  let failed = 0;
  const assert = (cond, msg) => {
    if (!cond) {
      console.error(` FAIL ${msg}`);
      failed += 1;
    } else {
      console.log(`  OK  ${msg}`);
    }
  };

  assert(ASSETS.length >= 8, 'inventory has brand assets');
  assert(ASSETS.every((a) => a.path.startsWith('/')), 'paths are site-relative');
  assert(!ASSETS.some((a) => /art-(altman|musk|zuck)/.test(a.path)), 'no public-figure faces');

  const img = assetUrl('/cards/state.png');
  const rs = reverseSearchUrls(img);
  assert(rs.lens.includes('lens.google.com') && rs.lens.includes(encodeURIComponent(img)), 'lens URL');
  assert(rs.tineye.includes('tineye.com'), 'tineye URL');

  assert(isOwnHost('siren.watch'), 'own host');
  assert(isOwnHost('www.siren.watch'), 'own subdomain');
  assert(isOwnHost('pbs.twimg.com'), 'twimg skipped');
  assert(!isOwnHost('example.com'), 'foreign host');

  const linkedHtml = `<html><a href="${HOME}">SIREN</a><img src="${img}"></html>`;
  assert(pageLinksToSiren(linkedHtml), 'detects absolute credit link');
  assert(pageEmbedsImage(linkedHtml, img), 'detects absolute image embed');
  assert(pageEmbedsImage(`<img src="/cards/state.png">`, img), 'detects path embed');
  assert(!pageLinksToSiren('<p>siren.watch is cool</p>'), 'bare mention is not a link');

  const d = draftEmail({ pageUrl: 'https://example.com/post', imageUrl: img, toName: 'Alex' });
  assert(d.subject.includes('credit'), 'draft subject');
  assert(d.body.includes('https://example.com/post') && d.body.includes(img) && d.body.includes(HOME), 'draft body');
  assert(!/\bwill\b|\bdoom\b|\bforecast\b/i.test(d.body), 'draft voice stays present-tense / no doom claim');

  assert(typeof ROOT === 'string' && ROOT.length > 1, `ROOT resolves (${ROOT})`);

  if (failed) {
    console.error(`selftest: ${failed} failure(s)`);
    process.exit(1);
  }
  console.log('selftest: ok');
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--image' || a === '--page' || a === '--to') {
      args[a.slice(2)] = argv[++i];
    } else if (a.startsWith('--')) {
      args[a.slice(2)] = true;
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (!cmd || cmd === 'help' || args.help) usage(cmd ? 0 : 1);

  if (cmd === 'list') {
    printList();
    return;
  }
  if (cmd === 'selftest') {
    selftest();
    return;
  }
  if (cmd === 'check') {
    const pageUrl = args._[1];
    if (!pageUrl) usage();
    await checkPage(pageUrl, args.image || null);
    return;
  }
  if (cmd === 'draft') {
    const pageUrl = args.page || args._[1];
    const imageUrl = args.image || args._[2];
    if (!pageUrl || !imageUrl) usage();
    printDraft({ pageUrl, imageUrl, toName: args.to || 'there' });
    return;
  }
  usage();
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
