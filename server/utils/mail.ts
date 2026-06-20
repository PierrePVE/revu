/**
 * server/utils/mail.ts — transactional email (Nodemailer / SMTP).
 *
 * A single transporter is created lazily and reused across requests. SMTP
 * settings come from the environment (see .env.example): NUXT_MAIL_HOST,
 * NUXT_MAIL_PORT, NUXT_MAIL_USER, NUXT_MAIL_PASS, NUXT_MAIL_FROM. All exports
 * are auto-imported into server routes by Nitro.
 */
import nodemailer, { type Transporter } from 'nodemailer'

// Cached transporter — building one opens a connection pool, so we keep it.
let transporteur: Transporter | null = null

/**
 * Whether SMTP is configured. When false, callers should skip sending (e.g. log
 * the link in development) rather than crash.
 */
export function estMailConfigure(): boolean {
  return Boolean(
    process.env.NUXT_MAIL_HOST && process.env.NUXT_MAIL_USER && process.env.NUXT_MAIL_PASS,
  )
}

/** Build (and cache) the SMTP transporter from the environment. */
function obtenirTransporteur(): Transporter {
  if (transporteur) return transporteur
  // Port 465 uses implicit TLS; 587 (and others) upgrade via STARTTLS.
  const port = Number(process.env.NUXT_MAIL_PORT ?? 465)
  transporteur = nodemailer.createTransport({
    host: process.env.NUXT_MAIL_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.NUXT_MAIL_USER,
      pass: process.env.NUXT_MAIL_PASS,
    },
  })
  return transporteur
}

/** Parameters for {@link envoyerEmail}. */
export interface EmailOptions {
  /** Recipient address. */
  to: string
  /** Subject line. */
  subject: string
  /** HTML body. */
  html: string
  /** Optional plain-text fallback for clients that don't render HTML. */
  text?: string
}

/**
 * Send a transactional email. Throws when SMTP isn't configured, so guard the
 * call with {@link estMailConfigure} when a missing configuration is tolerable.
 *
 * @param options - recipient, subject and body.
 */
export async function envoyerEmail(options: EmailOptions): Promise<void> {
  if (!estMailConfigure()) {
    throw createError({ statusCode: 500, message: 'SMTP non configuré (NUXT_MAIL_*).' })
  }
  // Fall back to the auth user when no explicit "From" is given.
  const from = process.env.NUXT_MAIL_FROM || process.env.NUXT_MAIL_USER!
  await obtenirTransporteur().sendMail({
    from: `Revu <${from}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  })
}
