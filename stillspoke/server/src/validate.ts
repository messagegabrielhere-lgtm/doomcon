import type { Archive, Memory, MemoryKind } from "./types.js";

const KINDS: MemoryKind[] = ["interview", "story", "writing", "voice", "correction", "reply"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class Invalid extends Error {}
export { Invalid as ValidationError };

const str = (v: unknown, field: string, max: number, optional = false): string | undefined => {
  if (v === undefined || v === null || v === "") {
    if (optional) return undefined;
    throw new Invalid(`${field} is required`);
  }
  if (typeof v !== "string") throw new Invalid(`${field} must be a string`);
  if (v.length > max) throw new Invalid(`${field} is too long`);
  return v;
};

const email = (v: unknown, field: string, optional = false) => {
  const s = str(v, field, 320, optional);
  if (s !== undefined && !EMAIL.test(s)) throw new Invalid(`${field} is not an email address`);
  return s;
};

const int = (v: unknown, field: string, min: number, max: number) => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw new Invalid(`${field} must be a whole number from ${min} to ${max}`);
  }
  return v;
};

/** Parse untrusted JSON from the app into an Archive, rejecting anything malformed. */
export function parseArchive(body: any): Archive {
  if (typeof body !== "object" || body === null) throw new Invalid("archive must be an object");
  const p = body.profile ?? {};
  const l = body.legacy ?? {};
  if (!Array.isArray(body.memories)) throw new Invalid("memories must be an array");
  if (!Array.isArray(l.beneficiaries)) throw new Invalid("legacy.beneficiaries must be an array");
  if (l.beneficiaries.length > 50) throw new Invalid("too many beneficiaries");
  if (body.memories.length > 20_000) throw new Invalid("too many memories");

  const beneficiaries = l.beneficiaries.map((b: any, i: number) => ({
    id: str(b?.id, `beneficiaries[${i}].id`, 64)!,
    name: str(b?.name, `beneficiaries[${i}].name`, 200)!,
    email: email(b?.email, `beneficiaries[${i}].email`)!,
    relationship: str(b?.relationship, `beneficiaries[${i}].relationship`, 200, true) ?? "",
    personalNote: str(b?.personalNote, `beneficiaries[${i}].personalNote`, 20_000, true),
  }));

  const memories: Memory[] = body.memories.map((m: any, i: number) => {
    if (!KINDS.includes(m?.kind)) throw new Invalid(`memories[${i}].kind is invalid`);
    const restrictedTo = Array.isArray(m.restrictedTo) ? m.restrictedTo.filter((x: unknown) => typeof x === "string") : [];
    return {
      id: str(m.id, `memories[${i}].id`, 64)!,
      kind: m.kind,
      prompt: str(m.prompt, `memories[${i}].prompt`, 2_000, true),
      text: str(m.text, `memories[${i}].text`, 200_000)!,
      createdAt: str(m.createdAt, `memories[${i}].createdAt`, 40)!,
      restrictedTo,
    };
  });

  const people = (Array.isArray(body.people) ? body.people : []).slice(0, 500).map((x: any, i: number) => ({
    id: str(x?.id, `people[${i}].id`, 64)!,
    name: str(x?.name, `people[${i}].name`, 200)!,
    relationship: str(x?.relationship, `people[${i}].relationship`, 200, true) ?? "",
    iCallThem: str(x?.iCallThem, `people[${i}].iCallThem`, 200, true),
    theyCallMe: str(x?.theyCallMe, `people[${i}].theyCallMe`, 200, true),
    notes: str(x?.notes, `people[${i}].notes`, 50_000, true) ?? "",
    beneficiaryId: str(x?.beneficiaryId, `people[${i}].beneficiaryId`, 64, true),
    status: str(x?.status, `people[${i}].status`, 200, true),
  }));

  const timeline = (Array.isArray(body.timeline) ? body.timeline : []).slice(0, 2_000).map((e: any, i: number) => ({
    id: str(e?.id, `timeline[${i}].id`, 64)!,
    year: int(e?.year, `timeline[${i}].year`, 1900, 2200),
    month: e?.month == null ? undefined : int(e.month, `timeline[${i}].month`, 1, 12),
    title: str(e?.title, `timeline[${i}].title`, 500)!,
    details: str(e?.details, `timeline[${i}].details`, 20_000, true),
  }));

  const executor =
    l.executor && (l.executor.email || l.executor.name)
      ? { name: str(l.executor.name, "executor.name", 200)!, email: email(l.executor.email, "executor.email")! }
      : undefined;

  return {
    profile: {
      name: str(p.name, "profile.name", 200)!,
      preferredName: str(p.preferredName, "profile.preferredName", 200, true),
      birthYear: p.birthYear == null ? undefined : int(p.birthYear, "profile.birthYear", 1900, 2100),
      hometown: str(p.hometown, "profile.hometown", 200, true),
      speakingStyle: str(p.speakingStyle, "profile.speakingStyle", 20_000, true) ?? "",
      instructions: str(p.instructions, "profile.instructions", 20_000, true) ?? "",
      boundaries: str(p.boundaries, "profile.boundaries", 20_000, true) ?? "",
    },
    memories,
    people,
    timeline,
    legacy: {
      ownerEmail: email(l.ownerEmail, "legacy.ownerEmail", true),
      checkInIntervalDays: int(l.checkInIntervalDays, "legacy.checkInIntervalDays", 7, 365),
      graceDays: int(l.graceDays, "legacy.graceDays", 3, 90),
      executor,
      beneficiaries,
    },
  };
}
