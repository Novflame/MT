type SendEmailInput = { to: string; subject: string; text: string; html?: string }

export function isEmailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.BETTER_AUTH_URL)
}

/** Uses Resend's HTTPS API without introducing a new runtime dependency. */
export async function sendTransactionalEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    throw new Error("Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.")
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text, ...(input.html ? { html: input.html } : {}) }),
    cache: "no-store",
  })

  if (!response.ok) {
    // Do not log recipient, reset URL, token, or provider response body.
    throw new Error(`Email provider rejected the message (HTTP ${response.status}).`)
  }
}
