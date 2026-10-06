export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export type Mailer = (mail: Mail) => Promise<void>;

/** Sends via Resend when RESEND_API_KEY is set; otherwise prints to the console. */
export function createMailer(env = process.env): Mailer {
  const key = env.RESEND_API_KEY;
  const from = env.MAIL_FROM ?? "Still Me <legacy@example.com>";
  if (!key) {
    return async (mail) => {
      console.log(`\n--- email (dev: not sent) ---\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n-----------------------------\n`);
    };
  }
  return async (mail) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text }),
    });
    if (!res.ok) throw new Error(`mail to ${mail.to} failed: ${res.status} ${await res.text()}`);
  };
}
