// /subscribe.html and the slim "get the brief by email" strip on every page.
//
// The homepage carries the full signup box. Every other page used to offer
// nothing, so a reader who landed on a state page or a news item had no way to
// come back except remembering the address. The strip links here; this page
// holds the same box the homepage does (Blogtrottr's steps today, a one-field
// Buttondown form once site/monetize.mjs names a provider).

import { page } from './layout.mjs';
import { signupBox, MZ_CSS, MONETIZE } from '../monetize.mjs';
import { esc } from './_html.mjs';
import * as brand from '../brand.mjs';

export const STRIP_MARK = 'data-siren-nl-strip';
const PATH = '/subscribe.html';

export function render(ctx) {
  const pitch = (MONETIZE.newsletter && MONETIZE.newsletter.pitch) || '';
  const main = `${MZ_CSS}<article style="max-width:46rem;margin:0 auto;padding:1.5rem 16px">
  <h1>Get the ${esc(brand.NAME)} brief by email</h1>
  <p style="font-size:1.08rem;line-height:1.6">${esc(pitch)}</p>
  ${signupBox({ privacyHref: ctx.href('/privacy.html'), dailyFeedUrl: ctx.url('/feed-daily.xml'), levelFeedUrl: ctx.url('/feed-level.xml'), alertsHref: ctx.href('/alerts.html'), id: 'sub', heading: 'PICK WHAT YOU GET' })}
  <p style="opacity:.82;font-size:.92rem">Prefer no email? <a href="${esc(ctx.href('/alerts.html'))}">RSS, Slack and in-tab alerts</a>, or follow <a href="https://x.com/SIRENutf6" rel="noopener">@SIRENutf6 on X</a>.</p>
</article>`;
  return page({
    ctx,
    path: PATH,
    title: `Get the ${brand.NAME} AI Brief by Email: Daily or Alerts · ${brand.NAME}`,
    description: `A free email: the daily ${brand.NAME} reading with the AI stories that moved it, or one alert the hour the level changes. Unsubscribe any time.`,
    main,
  });
}

/** The strip stamped above the footer of every page but the homepage and this one. */
export function strip(base = '') {
  return `\n<aside ${STRIP_MARK} role="complementary" aria-label="Email signup" style="max-width:72ch;margin:24px auto 8px;padding:12px 16px;border:1px solid rgba(86,176,224,.45);border-radius:10px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between">
  <span><b>Get the ${esc(brand.NAME)} brief by email.</b> One email a day, or one when the level changes. Free.</span>
  <a href="${esc(base)}${PATH}" style="display:inline-block;min-height:40px;line-height:40px;padding:0 16px;border-radius:6px;background:#56B0E0;color:#06070b;font-weight:700;text-decoration:none">Sign up</a>
</aside>`;
}
