// Shapes shared with the iOS app (see ios/Afterword/Models/Archive.swift).
// Keep the two in sync: the app uploads an Archive as JSON.

export type MemoryKind = "interview" | "story" | "writing" | "voice" | "correction";

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
