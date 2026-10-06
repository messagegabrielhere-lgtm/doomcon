import Anthropic from "@anthropic-ai/sdk";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { DeadMansSwitch } from "./deadman.js";
import { suggestFollowUps } from "./interviewer.js";
import { createMailer } from "./mailer.js";
import { sanitizeHistory, streamReply, type Listener } from "./persona.js";
import { newToken, sha256, Store } from "./store.js";
import type { Account } from "./types.js";
import { parseArchive, ValidationError } from "./validate.js";

const PORT = Number(process.env.PORT ?? 8787);
const PUBLIC_URL = (process.env.PUBLIC_URL ?? `http://localhost:${PORT}`).replace(/\/$/, "");
const MAX_BODY = 20 * 1024 * 1024;

const store = new Store(process.env.DATA_DIR ?? "./data");
const anthropic = new Anthropic();
const deadman = new DeadMansSwitch(store, createMailer(), PUBLIC_URL);

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// --- helpers ---------------------------------------------------------------

async function readJson(req: IncomingMessage): Promise<any> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, "request too large");
    chunks.push(chunk);
  }
  if (!size) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "invalid JSON");
  }
}

async function readForm(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function html(res: ServerResponse, status: number, title: string, body: string) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>body{font:17px/1.5 -apple-system,system-ui,sans-serif;max-width:34rem;margin:3rem auto;padding:0 1rem;color:#222}
button{font:inherit;padding:.7rem 1.1rem;border-radius:.6rem;border:1px solid #888;background:#fff;margin:.3rem .3rem 0 0}
button.primary{background:#2d3a4a;color:#fff;border-color:#2d3a4a}</style>${body}`);
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function bearer(req: IncomingMessage, scheme: string): string | undefined {
  const h = req.headers.authorization ?? "";
  const prefix = `${scheme} `;
  return h.startsWith(prefix) ? h.slice(prefix.length).trim() : undefined;
}

async function owner(req: IncomingMessage): Promise<Account> {
  const token = bearer(req, "Bearer");
  const account = token ? await store.findByOwnerToken(token) : undefined;
  if (!account) throw new HttpError(401, "not signed in");
  return account;
}

function ownerView(a: Account) {
  const legacy = a.archive?.legacy;
  return {
    status: a.status,
    lastCheckInAt: a.lastCheckInAt,
    archiveUpdatedAt: a.archiveUpdatedAt ?? null,
    nextCheckInDue: legacy
      ? new Date(Date.parse(a.lastCheckInAt) + legacy.checkInIntervalDays * 86_400_000).toISOString()
      : null,
    memoryCount: a.archive?.memories.length ?? 0,
  };
}

// Small per-credential limiter so a leaked code can't run up a huge bill.
const recent = new Map<string, number[]>();
function rateLimit(key: string, perMinute = 20) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < 60_000);
  if (hits.length >= perMinute) throw new HttpError(429, "slow down a little");
  hits.push(now);
  recent.set(key, hits);
}

// --- routes ------------------------------------------------------------------

async function route(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", PUBLIC_URL);
  const key = `${req.method} ${url.pathname}`;

  if (key === "GET /healthz") return json(res, 200, { ok: true });

  if (key === "POST /v1/accounts") {
    rateLimit(`signup:${req.socket.remoteAddress}`, 5);
    const id = newToken(12);
    const token = `${id}.${newToken()}`;
    const now = new Date().toISOString();
    await store.put({
      id,
      ownerTokenHash: sha256(token),
      createdAt: now,
      lastCheckInAt: now,
      status: "active",
      statusChangedAt: now,
      accessCodes: {},
    });
    return json(res, 201, { token });
  }

  if (key === "GET /v1/me") return json(res, 200, ownerView(await owner(req)));

  if (key === "PUT /v1/archive") {
    const a = await owner(req);
    // Uploads never count as "still here": a backup can fire when someone else
    // opens the phone. Only an explicit check-in resets the clock.
    if (a.status === "released") throw new HttpError(409, "legacy already released — revoke it first if you're alive");
    a.archive = parseArchive(await readJson(req));
    a.archiveUpdatedAt = new Date().toISOString();
    await store.put(a);
    return json(res, 200, ownerView(a));
  }

  if (key === "POST /v1/checkin") {
    const a = await owner(req);
    if (a.status === "released") throw new HttpError(409, "legacy already released — use revoke if you're alive");
    checkIn(a);
    await store.put(a);
    return json(res, 200, ownerView(a));
  }

  if (key === "POST /v1/revoke") {
    const a = await owner(req);
    a.accessCodes = {};
    a.releasedAt = undefined;
    checkIn(a);
    await store.put(a);
    return json(res, 200, ownerView(a));
  }

  if (key === "DELETE /v1/account") {
    const a = await owner(req);
    await store.delete(a.id);
    return json(res, 200, { deleted: true });
  }

  if (key === "POST /v1/redeem") {
    const { code } = await readJson(req);
    rateLimit(`redeem:${req.socket.remoteAddress}`, 10);
    const found = typeof code === "string" ? await store.findByAccessCode(code) : undefined;
    if (!found) throw new HttpError(404, "that code isn't valid");
    const { account, beneficiaryId } = found;
    const p = account.archive!.profile;
    const b = account.archive!.legacy.beneficiaries.find((x) => x.id === beneficiaryId)!;
    return json(res, 200, {
      name: p.preferredName || p.name,
      fullName: p.name,
      beneficiaryName: b.name,
      relationship: b.relationship,
      personalNote: b.personalNote ?? null,
    });
  }

  if (key === "POST /v1/chat") return chat(req, res);

  if (key === "POST /v1/interviewer") {
    const a = await owner(req);
    if (!a.archive) throw new HttpError(409, "sync your archive first");
    rateLimit(`interviewer:${a.id}`, 6);
    const { alreadyAsked } = await readJson(req);
    const asked = Array.isArray(alreadyAsked) ? alreadyAsked.filter((q: unknown): q is string => typeof q === "string") : [];
    try {
      return json(res, 200, { questions: await suggestFollowUps(anthropic, a.archive, asked) });
    } catch (e) {
      console.error("interviewer failed:", e);
      throw new HttpError(502, "couldn't come up with questions right now — try again in a moment");
    }
  }

  const exec = url.pathname.match(/^\/executor\/([^/]+?)(?:\/(confirm|alive))?$/);
  if (exec) return executor(req, res, decodeURIComponent(exec[1]!), exec[2]);

  throw new HttpError(404, "not found");
}

function checkIn(a: Account) {
  const now = new Date().toISOString();
  a.lastCheckInAt = now;
  if (a.status !== "active") {
    a.status = "active";
    a.statusChangedAt = now;
    a.executorTokenHash = undefined;
  }
}

async function chat(req: IncomingMessage, res: ServerResponse) {
  const body = await readJson(req);
  let account: Account;
  let listener: Listener;

  const code = bearer(req, "Legacy");
  if (code) {
    const found = await store.findByAccessCode(code);
    if (!found) throw new HttpError(401, "that code isn't valid");
    account = found.account;
    const beneficiary = account.archive!.legacy.beneficiaries.find((b) => b.id === found.beneficiaryId)!;
    listener = { mode: "legacy", beneficiary };
    rateLimit(`chat:${sha256(code)}`);
  } else {
    account = await owner(req);
    if (!account.archive) throw new HttpError(409, "sync your archive first");
    const asBeneficiary = account.archive.legacy.beneficiaries.find((b) => b.id === body.asBeneficiaryId);
    listener = { mode: "rehearsal", asBeneficiary };
    rateLimit(`chat:${account.id}`);
  }

  let history;
  try {
    history = sanitizeHistory(body.messages);
  } catch (e: any) {
    throw new HttpError(400, e.message);
  }

  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  const send = (e: unknown) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  try {
    for await (const event of streamReply(anthropic, account.archive!, listener, history)) send(event);
  } catch (e) {
    console.error("chat failed:", e);
    const message =
      e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError
        ? "I'm having trouble thinking right now. Try again in a moment."
        : "Something went wrong.";
    send({ type: "error", message });
  }
  res.end();
}

async function executor(req: IncomingMessage, res: ServerResponse, token: string, action?: string) {
  const a = await store.findByExecutorToken(token);
  if (!a || a.status !== "awaitingExecutor") {
    return html(res, 404, "Still Me", `<h1>This link is no longer active</h1><p>Either it was already used, or they checked in. Nothing more is needed from you.</p>`);
  }
  const name = escapeHtml(a.archive!.profile.preferredName || a.archive!.profile.name);

  if (req.method === "GET" && !action) {
    const people = a.archive!.legacy.beneficiaries.map((b) => `<li>${escapeHtml(b.name)} (${escapeHtml(b.relationship)})</li>`).join("");
    const t = escapeHtml(encodeURIComponent(token));
    return html(res, 200, "Still Me", `<h1>About ${name}</h1>
<p>${name} asked you to confirm their passing before their Still Me legacy is shared. If you confirm, these people will each be emailed a private access code:</p><ul>${people}</ul>
<p>Please only confirm if you know ${name} has died.</p>
<form method="post" action="/executor/${t}/confirm"><button class="primary">I confirm ${name} has died</button></form>
<form method="post" action="/executor/${t}/alive"><button>${name} is alive</button></form>`);
  }

  if (req.method === "POST" && action) {
    await readForm(req);
    if (action === "confirm") {
      await deadman.release(a);
      return html(res, 200, "Still Me", `<h1>Thank you</h1><p>We're so sorry. ${name}'s legacy has been sent to the people they chose.</p>`);
    }
    checkIn(a);
    await store.put(a);
    return html(res, 200, "Still Me", `<h1>Thanks for letting us know</h1><p>We've reset ${name}'s check-in. Nothing was shared.</p>`);
  }
  throw new HttpError(405, "method not allowed");
}

// --- server ------------------------------------------------------------------

await store.init();

createServer(async (req, res) => {
  try {
    await route(req, res);
  } catch (e) {
    if (res.headersSent) return res.end();
    if (e instanceof HttpError) return json(res, e.status, { error: e.message });
    if (e instanceof ValidationError) return json(res, 400, { error: e.message });
    console.error(e);
    json(res, 500, { error: "internal error" });
  }
}).listen(PORT, () => console.log(`stillme listening on ${PUBLIC_URL}`));

const tick = () => deadman.tick().catch((e) => console.error("switch tick failed:", e));
tick();
setInterval(tick, 60 * 60 * 1000);
