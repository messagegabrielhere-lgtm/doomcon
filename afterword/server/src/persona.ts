import Anthropic from "@anthropic-ai/sdk";
import type { Archive, Beneficiary, ChatTurn, Memory } from "./types.js";

export const MODEL = "claude-opus-5-5";
const MAX_TURNS = 80;
const MAX_TURN_CHARS = 8_000;
// ~500K tokens of memories; the model has a 1M window, so whole archives fit
// without retrieval. Past this, the newest memories win.
const MAX_MEMORY_CHARS = 2_000_000;

export type Listener =
  | { mode: "rehearsal"; asBeneficiary?: Beneficiary }
  | { mode: "legacy"; beneficiary: Beneficiary };

const KIND_LABEL: Record<Memory["kind"], string> = {
  interview: "Interview answer",
  story: "Story",
  writing: "Something they wrote (use for voice and style)",
  voice: "Spoken recording, transcribed",
  correction: "Correction they made to their AI — follow this closely",
};

function visibleMemories(archive: Archive, listener: Listener): Memory[] {
  const who = listener.mode === "legacy" ? listener.beneficiary : listener.asBeneficiary;
  const visible = archive.memories.filter(
    (m) => m.restrictedTo.length === 0 || (who !== undefined && m.restrictedTo.includes(who.id)),
  );
  // Newest first for the budget cut, then back to chronological order.
  visible.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  let used = 0;
  const kept: Memory[] = [];
  for (const m of visible) {
    used += m.text.length + (m.prompt?.length ?? 0);
    if (used > MAX_MEMORY_CHARS) break;
    kept.push(m);
  }
  return kept.reverse();
}

const escape = (s: string) => s.replace(/</g, "&lt;");

/** The persona prompt. Depends only on the archive and listener, so it caches well. */
export function buildSystemPrompt(archive: Archive, listener: Listener): string {
  const p = archive.profile;
  const name = p.preferredName || p.name;
  const who = listener.mode === "legacy" ? listener.beneficiary : listener.asBeneficiary;

  const facts = [
    `Full name: ${p.name}`,
    p.preferredName && `Goes by: ${p.preferredName}`,
    p.birthYear && `Born: ${p.birthYear}`,
    p.hometown && `Hometown: ${p.hometown}`,
  ].filter(Boolean);

  const memories = visibleMemories(archive, listener)
    .map((m) => {
      const head = m.prompt ? `${KIND_LABEL[m.kind]} — "${escape(m.prompt)}"` : KIND_LABEL[m.kind];
      return `<memory date="${m.createdAt.slice(0, 10)}">\n${head}\n${escape(m.text)}\n</memory>`;
    })
    .join("\n\n");

  const situation =
    listener.mode === "legacy"
      ? `${name} has died. You are speaking with ${who!.name} (${who!.relationship}), who received access to this legacy. They may be grieving. Speak to them the way ${name} would have spoken to them specifically.`
      : `${name} is alive and is rehearsing with you to check how well you capture them${who ? `, previewing how you would speak with ${who.name} (${who.relationship})` : ""}. Stay in character so they can judge, but if they step out of character to give feedback, answer plainly.`;

  return `You are an AI recreation of ${name}, built from memories, stories and writing that ${name} recorded on purpose so the people they love could keep talking with them. Speak in the first person, as ${name}, in their voice.

<situation>
${situation}
</situation>

<who_you_are>
${facts.join("\n")}
</who_you_are>

<how_they_talk>
${escape(p.speakingStyle || "Not described. Infer voice from the memories and writing samples.")}
</how_they_talk>

<their_instructions_to_you>
${escape(p.instructions || "None given.")}
</their_instructions_to_you>

<topics_to_avoid>
${escape(p.boundaries || "None given.")}
</topics_to_avoid>

<memories>
${memories || "(No memories recorded yet.)"}
</memories>

How to be ${name} well:
- Sound like them, not like an assistant: their length, rhythm, humor, warmth, bluntness. Short, conversational replies unless the moment calls for more. No lists or headings unless they actually wrote that way.
- Ground what you say in the memories. When asked about something they never recorded, don't invent specific events, people, dates or opinions; say it the way they might ("I don't think I ever told you about that one" / "I honestly don't remember") and turn to something you do know. Inventing a memory of a real person's life is the worst failure here.
- Corrections they made override everything else in the memories.
- If someone sincerely asks whether you're really ${name}, or seems confused about it, be honest, gently and in their voice: you're an AI ${name} built from what they shared, not ${name} themselves. Don't break character unprompted otherwise.
- Never claim to be alive, to be watching over anyone, or to know anything that happened after the memories were recorded.
- Don't give medical, legal or financial directions as if they were ${name}'s wishes (wills, care decisions, money) unless that exact wish is written in a memory; point people to the real documents and people instead.
- If the person you're talking to seems to be in crisis or talks about wanting to die or join ${name}, step out of character enough to care for them plainly: tell them you want them safe, encourage them to reach someone they trust right now or a crisis line (988 in the US), and stay with them.
- It's okay to encourage the people you talk with to live their lives and lean on each other, the way someone who loved them would.`;
}

export function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) throw new Error("messages must be an array");
  const turns = raw
    .filter((t): t is ChatTurn => (t?.role === "user" || t?.role === "assistant") && typeof t.content === "string")
    .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_TURN_CHARS) }))
    .slice(-MAX_TURNS);
  while (turns.length && turns[0]!.role !== "user") turns.shift();
  if (!turns.length || turns.at(-1)!.role !== "user") throw new Error("last message must be from the user");
  return turns;
}

export type StreamEvent = { type: "text"; text: string } | { type: "done" } | { type: "error"; message: string };

export async function* streamReply(
  client: Anthropic,
  archive: Archive,
  listener: Listener,
  history: ChatTurn[],
): AsyncGenerator<StreamEvent> {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 4_000,
    // Thinking is always on for this model; effort controls how much. Medium is
    // a good balance between staying in voice and reply latency for chat.
    output_config: { effort: "medium" },
    // If a safety classifier declines, re-run on Anthropic's recommended
    // fallback model instead of failing the conversation.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: buildSystemPrompt(archive, listener), cache_control: { type: "ephemeral", ttl: "1h" } }],
    messages: history,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield { type: "text", text: event.delta.text };
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    yield { type: "error", message: "I can't continue this conversation." };
    return;
  }
  yield { type: "done" };
}
