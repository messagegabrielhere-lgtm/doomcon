# Outreach drafts

Updated 2026-10-10. Nothing here has been sent. Each draft is for the operator
to send from their own account, after refreshing every number from the live
site. The pitch is the same: an activity number you can check.

On-page search is already shipping (homepage title, both sitemaps, IndexNow,
`llms.txt`, the FAQ). A domain registered on 2026-10-08 does not rank from
more keywords. The traffic left is consoles only you can open, and people
who will cite the number if copying it takes one tap.

## 0. Do these, in this order

1. **Google Search Console.** Add the URL-prefix property `https://siren.watch`.
   Copy the HTML-tag token (the `content` value only) into the repo secret
   `GOOGLE_SITE_VERIFICATION`. The next full collect writes the meta tag.
   Then submit `https://siren.watch/sitemap.xml` and
   `https://siren.watch/news-sitemap.xml`.
2. **Enforce HTTPS** in the repo's GitHub Pages settings. The API cannot set
   it from here. HTTP already serves the site; the cert name is `siren.watch`.
3. **Bing Webmaster Tools.** Add `https://siren.watch` and submit the same
   sitemap. IndexNow already pings Bing after each publish; verification
   still tells you what got indexed.
4. **Show HN, once,** with the draft below. Stay for six hours and answer
   method questions with links to lines.
5. **One journalist** who has written about AI and jobs, or about p(doom).
6. **One note to Polymarket.** The race page already shows their price.
7. **X.** Bio and pinned post should say `siren.watch` in words. Post the
   daily card as an image. A raw link as the whole post is the format X
   downranks. If the daily workflow is still a no-op, the posting secrets
   in `docs/POSTING.md` are what turns it on.
8. **README badge.** Paste the snippet from the homepage (Reuse this
   reading) into any repo README you control. Each one is a live backlink.
9. **Answer the question that already exists.** When someone asks "is there
   an AI doomsday clock?" or "what is p(doom)?", reply with
   `https://siren.watch/guide.html` or
   `https://siren.watch/ai-doomsday-clock.html`. One useful reply beats a
   blast.

Do not buy links. Do not open synonym pages. Do not drop the same pitch
into a pile of subreddits.

## 1. Hacker News

**Title:** Show HN: SIREN – an hourly AI activity index you can verify in your browser

**URL:** https://siren.watch/

**First comment:**

I built this because every AI doom number I could find is a judgement call:
p(doom) is an opinion, the Doomsday Clock is a board vote. This one is
arithmetic. It counts public activity across five pillars (releases, compute
and capital, attention, governance, markets), hourly, and reports a level from
5 (quiet) to 1 (loud).

It measures tempo, not danger, and it makes no forecast.

The part I would like attacked: every reading is published with a receipt
containing its inputs and the hash of the previous receipt. There is a button
on the page that re-hashes the last twelve receipts in your browser and walks
the chain. That proves the record was not edited afterwards. It does not prove
my inputs or weights are right, and the methodology page is where to argue
with those.

No ads, no cookies, static files on GitHub Pages, source is public. One pillar
(markets) stays unscored until it has a baseline, and the page says so instead
of guessing. It was called DOOMCON until October 2026; the method and the
record are the same. Live at https://siren.watch/

*Be present for six hours. Answer method questions with links to lines.*

## 2. Polymarket (sponsorship or data partnership)

**Subject:** SIREN uses your "best AI model" market as its race page

Hi,

I run SIREN, an hourly, verifiable index of AI activity (https://siren.watch/).
The race page ranks the frontier labs by the live price on your "Which company
has best AI model end of 2026?" market and links to it, credited as your
price, not ours: https://siren.watch/race.html

You sponsor the Pentagon Pizza Index. SIREN covers the other topic your
traders care about, with a method that can be checked: every reading ships
with a hash-chained receipt and an in-browser verifier.

I would like to talk about a "powered by" arrangement or an affiliate link on
the race page. The site carries no other advertising.

Thanks,
[name]

## 3. A journalist who has written about AI and jobs, or about p(doom)

**Subject:** An AI activity number you can check, and a sourced count on AI job cuts

Hi [name],

Two things that may be useful for a piece:

1. SIREN is an hourly index of AI activity where the reader can verify the
   published record themselves: a button on the page re-hashes the last twelve
   readings in the browser. It measures how much is happening, not how bad it
   is. https://siren.watch/#vfy

2. A page that lists what has actually been measured about AI and jobs, with
   the source and the caveat for each figure (for example, announced job cuts
   that cite AI are announcements with a stated reason, not measured losses):
   https://siren.watch/jobs.html

Press kit with a liftable paragraph and images:
https://siren.watch/press.html

Happy to answer method questions on the record.

[name]
