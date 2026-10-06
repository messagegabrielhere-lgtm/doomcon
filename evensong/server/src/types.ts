// Shapes shared with the iOS app (see ios/Evensong/Models/Archive.swift).
// Keep the two in sync: the app uploads an Archive as JSON.

/** "reply" is an example exchange: prompt = a message someone sends, text = how you'd answer. */
export type MemoryKind = "interview" | "story" | "writing" | "voice" | "correction" | "reply";

export interface Memory {
  id: string;
  kind: MemoryKind;
  /** The interview question or a short title. */
  prompt?: string;
  text: string;
  createdAt: string;
  /** Beneficiary ids allowed to "hear" this memory. Empty means everyone. */
  restrictedTo: string[];
}

export interface Profile {
  name: string;
  preferredName?: string;
  birthYear?: number;
  hometown?: string;
  /** How you talk: phrases, humor, swearing, emoji, nicknames for people. */
  speakingStyle: string;
  /** Standing instructions to your AI ("never pretend to be alive", "tell my kids I'm proud"). */
  instructions: string;
  /** Topics the AI must not engage with. */
  boundaries: string;
}

/** Someone in your life the AI should know about, recipient or not. */
export interface Person {
  id: string;
  name: string;
  relationship: string;
  /** What you call them (nicknames, pet names). */
  iCallThem?: string;
  /** What they call you. */
  theyCallMe?: string;
  /** Who they are to you, shared history, inside jokes, how you'd talk to them. */
  notes: string;
  /** Links this person to a recipient, so the AI knows who it's talking to. */
  beneficiaryId?: string;
  /** Still alive, deceased, estranged... so the AI doesn't ask after the dead. */
  status?: string;
}

export interface LifeEvent {
  id: string;
  year: number;
  month?: number;
  title: string;
  details?: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  email: string;
  relationship: string;
  /** A note delivered with their access code when the legacy is released. */
  personalNote?: string;
}

export interface LegacySettings {
  /** Where check-in reminders go if you miss one. */
  ownerEmail?: string;
  checkInIntervalDays: number;
  graceDays: number;
  executor?: { name: string; email: string };
  beneficiaries: Beneficiary[];
}

export interface Archive {
  profile: Profile;
  memories: Memory[];
  people: Person[];
  timeline: LifeEvent[];
  legacy: LegacySettings;
}

export type AccountStatus = "active" | "overdue" | "awaitingExecutor" | "released";

export interface Account {
  id: string;
  ownerTokenHash: string;
  createdAt: string;
  archive?: Archive;
  archiveUpdatedAt?: string;
  lastCheckInAt: string;
  status: AccountStatus;
  statusChangedAt: string;
  executorTokenHash?: string;
  releasedAt?: string;
  /** sha256(access code) -> beneficiary id, populated on release. */
  accessCodes: Record<string, string>;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
