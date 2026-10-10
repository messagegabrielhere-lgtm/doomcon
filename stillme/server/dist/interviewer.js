import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { MODEL } from "./persona.js";
// A biographer that reads everything recorded so far and asks about what's
// missing, so the archive grows toward "enough to recreate you" instead of
// stopping at the stock questions.
const FollowUps = z.object({
    questions: z
        .array(z.object({
        question: z.string().describe("One warm, specific question, addressed to them as 'you'."),
        why: z.string().describe("One short sentence on what gap this fills, shown to the user."),
        area: z.enum(["people", "voice", "history", "values", "everyday", "opinions", "for someone"]),
    }))
        .describe("5 to 8 questions, most valuable first."),
});
function archiveDigest(archive) {
    const p = archive.profile;
    const lines = [
        `Name: ${p.name}${p.preferredName ? ` (goes by ${p.preferredName})` : ""}`,
        p.birthYear ? `Born: ${p.birthYear}` : "",
        p.hometown ? `Hometown: ${p.hometown}` : "",
        `How they talk: ${p.speakingStyle || "(blank)"}`,
        "",
        "PEOPLE:",
        ...(archive.people ?? []).map((x) => `- ${x.name} (${x.relationship}): ${x.notes || "(no notes)"}`),
        "",
        "TIMELINE:",
        ...(archive.timeline ?? []).map((e) => `- ${e.year}: ${e.title}`),
        "",
        "MEMORIES:",
        ...archive.memories.map((m) => `[${m.kind}] ${m.prompt ? `Q: ${m.prompt}\n` : ""}${m.text}`),
    ];
    return lines.filter((l) => l !== undefined).join("\n");
}
export async function suggestFollowUps(client, archive, alreadyAsked) {
    const response = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: 8_000,
        output_config: { effort: "medium", format: betaZodOutputFormat(FollowUps) },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: `You are a gentle, perceptive biographer helping someone record themselves so that, after they die, an AI can talk with their loved ones in their voice. Read what they've recorded and find the most important gaps: the things an AI would need to answer naturally as them but couldn't, or would have to make up.

Prioritize:
- People mentioned but never described (who they are, what they call each other, shared memories).
- Stories referenced in passing but never told.
- Thin areas: everyday life, opinions, humor, how they comfort or argue, what they'd say to specific people.
- Follow-ups on emotionally important answers: ask for the concrete detail (a scene, a quote, a smell, a date).
- Vague answers, where a specific example would help.

Ask in plain, warm language, one thing per question. Never repeat a question they've already answered or one in the "already asked" list. If almost nothing is recorded, ask good opening questions.`,
        messages: [
            {
                role: "user",
                content: `<archive>\n${archiveDigest(archive).replace(/</g, "&lt;")}\n</archive>\n\n<already_asked>\n${alreadyAsked.slice(-200).join("\n").replace(/</g, "&lt;")}\n</already_asked>`,
            },
        ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output)
        return [];
    return response.parsed_output.questions.slice(0, 8);
}
