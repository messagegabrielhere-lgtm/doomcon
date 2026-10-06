import type { Mailer } from "./mailer.js";
import { newAccessCode, newToken, sha256, type Store } from "./store.js";
import type { Account } from "./types.js";

// The check-in switch. Nothing is ever released just because a phone went quiet:
//
//   active ──(missed check-in)──▶ overdue ──(grace passes)──▶ awaitingExecutor ──(executor confirms)──▶ released
//      ▲                            │                            │
//      └──────── owner checks in ───┴──── or executor says "alive" ┘
//
// With no executor configured, release happens after a second grace period
// instead, and the owner is warned at every step. The owner can revoke a
// release at any time, which voids every access code.

const DAY = 86_400_000;

export type Step =
  | { kind: "remindOwner" }
  | { kind: "askExecutor" }
  | { kind: "release" }
  | { kind: "none" };

/** Decide what should happen to an account at `now`. Pure, so it's easy to test. */
export function nextStep(a: Account, now: Date): Step {
  const legacy = a.archive?.legacy;
  if (!legacy || legacy.beneficiaries.length === 0) return { kind: "none" };
  const t = now.getTime();
  const sinceCheckIn = t - Date.parse(a.lastCheckInAt);
  const sinceStatus = t - Date.parse(a.statusChangedAt);
  switch (a.status) {
    case "active":
      return sinceCheckIn > legacy.checkInIntervalDays * DAY ? { kind: "remindOwner" } : { kind: "none" };
    case "overdue":
      if (sinceStatus <= legacy.graceDays * DAY) return { kind: "none" };
      return legacy.executor ? { kind: "askExecutor" } : { kind: "release" };
    case "awaitingExecutor":
      // Executor-confirmed release only; this branch exists for executor-less
      // accounts that were moved here by an earlier configuration.
      return !legacy.executor && sinceStatus > legacy.graceDays * DAY ? { kind: "release" } : { kind: "none" };
    case "released":
      return { kind: "none" };
  }
}

export class DeadMansSwitch {
  constructor(
    private store: Store,
    private mail: Mailer,
    private publicUrl: string,
  ) {}

  async tick(now = new Date()) {
    for (const account of await this.store.all()) {
      try {
        await this.apply(account, nextStep(account, now), now);
      } catch (e) {
        console.error(`switch: account ${account.id}:`, e);
      }
    }
  }

  private async apply(a: Account, step: Step, now: Date) {
    const name = a.archive?.profile.preferredName || a.archive?.profile.name || "there";
    const legacy = a.archive!.legacy;
    switch (step.kind) {
      case "none":
        return;
      case "remindOwner": {
        a.status = "overdue";
        a.statusChangedAt = now.toISOString();
        await this.store.put(a);
        if (legacy.ownerEmail) {
          await this.mail({
            to: legacy.ownerEmail,
            subject: "Evensong: please check in",
            text: `Hi ${name}, you haven't checked in to Evensong for ${legacy.checkInIntervalDays} days. Open the app and tap "I'm still here" within ${legacy.graceDays} days, or your legacy process will begin${legacy.executor ? ` (we'll ask ${legacy.executor.name} to confirm before anything is shared)` : ""}.`,
          });
        }
        return;
      }
      case "askExecutor": {
        const token = `${a.id}.${newToken()}`;
        a.executorTokenHash = sha256(token);
        a.status = "awaitingExecutor";
        a.statusChangedAt = now.toISOString();
        await this.store.put(a);
        await this.mail({
          to: legacy.executor!.email,
          subject: `${name} named you to confirm their Evensong legacy`,
          text: [
            `Hi ${legacy.executor!.name},`,
            ``,
            `${name} set up Evensong, an app that preserves their memories as an AI that loved ones can talk with after they die. They named you as the person to confirm their passing.`,
            ``,
            `They haven't checked in for a while. Nothing has been shared yet, and nothing will be unless you confirm.`,
            ``,
            `Open this link to respond — you can also tell us they're alive and well:`,
            `${this.publicUrl}/executor/${encodeURIComponent(token)}`,
            ``,
            `If this reached you by mistake, you can ignore it.`,
          ].join("\n"),
        });
        return;
      }
      case "release":
        await this.release(a, now);
        return;
    }
  }

  async release(a: Account, now = new Date()) {
    const archive = a.archive!;
    const name = archive.profile.preferredName || archive.profile.name;
    const codes: Array<{ email: string; who: string; code: string; note?: string }> = [];
    a.accessCodes = {};
    for (const b of archive.legacy.beneficiaries) {
      const code = newAccessCode();
      a.accessCodes[sha256(code)] = b.id;
      codes.push({ email: b.email, who: b.name, code, note: b.personalNote });
    }
    a.status = "released";
    a.releasedAt = a.statusChangedAt = now.toISOString();
    a.executorTokenHash = undefined;
    await this.store.put(a);
    for (const c of codes) {
      await this.mail({
        to: c.email,
        subject: `${name} left something for you`,
        text: [
          `Dear ${c.who},`,
          ``,
          `Before they died, ${name} recorded their memories, stories and way of speaking in Evensong and asked that you receive them.`,
          ...(c.note ? [``, `They left you this note:`, ``, c.note] : []),
          ``,
          `To talk with the AI they built, install Evensong on iPhone, tap "Someone left me an access code", and enter:`,
          ``,
          `    ${c.code}`,
          ``,
          `It is an AI built from what ${name} chose to share — not ${name}. It can be comforting, and it can also get things wrong. Take it at your own pace, and lean on the people around you too.`,
        ].join("\n"),
      });
    }
  }
}
