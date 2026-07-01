import nodemailer from 'nodemailer'
import { buildInvoicePdf } from './invoicePdf'

// ── Transport ─────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-CA', {
    timeZone: 'America/Edmonton',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const STATUS_LABELS = {
  pending:           'Order Placed',
  assigned_pickup:   'Pickup Scheduled',
  picked_up:         'Package Picked Up',
  assigned_delivery: 'On the Way',
  delivered:         'Delivered',
  cancelled:         'Cancelled',
  failed_pickup:     'Pickup Failed',
  failed_dropoff:    'Delivery Failed',
}

export const STATUS_COLORS = {
  pending:           '#64748b',
  assigned_pickup:   '#1bb908',
  picked_up:         '#1bb908',
  assigned_delivery: '#d97706',
  delivered:         '#15960a',
  cancelled:         '#dc2626',
  failed_pickup:     '#dc2626',
  failed_dropoff:    '#dc2626',
}

const BRAND_GREEN      = '#1bb908'
const BRAND_GREEN_DARK = '#15960a'
const BRAND_NAME       = 'GoFastDelivery'
const BRAND_TAGLINE    = "Calgary's Same-Day Courier"
const BRAND_EMAIL      = 'info@gfdelivery.ca'
const BRAND_FROM       = `"GoFastDelivery" <gofastdelivery2024@gmail.com>`
const BASE_URL         = process.env.APP_BASE_URL ?? 'https://gofastdelivery.ca'

// ── Base template ─────────────────────────────────────────────────────────────
// Uses table-based layout for maximum email client compatibility.
// All styles are inlined — no class reliance in the body content.

function baseTemplate({ title, preheader, body }) {
  const logoUrl = `${BASE_URL}/images/logo.png`

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; display: block; }
    body { margin: 0; padding: 0; background-color: #f0f4f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; }
      .email-body { padding: 24px 20px !important; }
      .tracking-id-text { font-size: 22px !important; letter-spacing: 2px !important; }
      .title-text { font-size: 20px !important; }
      .stop-table { display: block !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f0;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f0f4f0;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f0;">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">

        <!-- Card -->
        <table role="presentation" class="email-wrapper" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

          <!-- ── Header ── -->
          <tr>
            <td style="background-color:#0d200c;background:linear-gradient(135deg,#071407 0%,#0d200c 60%,#0a1a09 100%);padding:0;">

              <!-- Green top accent line -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,${BRAND_GREEN},${BRAND_GREEN_DARK});font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Logo + brand row -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:24px 32px 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">
                          <img src="${logoUrl}" alt="${BRAND_NAME}" width="44" height="44"
                            style="width:44px;height:44px;border-radius:10px;object-fit:contain;display:block;" />
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1;">
                            GoFast<span style="color:${BRAND_GREEN};">Delivery</span>
                          </div>
                          <div style="font-size:12px;color:#6b9e6b;margin-top:3px;letter-spacing:0.04em;">
                            ${BRAND_TAGLINE} &middot; Calgary, AB
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td class="email-body" style="padding:36px 32px 28px;">
              ${body}
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:#f8faf8;border-top:1px solid #e4ece4;padding:20px 32px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#334155;">${BRAND_NAME}</p>
              <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">Calgary, AB &middot; Same-day delivery across Calgary and surrounding areas</p>
              <p style="margin:0;font-size:12px;">
                <a href="mailto:${BRAND_EMAIL}" style="color:${BRAND_GREEN};text-decoration:none;font-weight:600;">${BRAND_EMAIL}</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`
}

// ── Stop rows ─────────────────────────────────────────────────────────────────

function stopsHtml(stops = []) {
  return stops.map((s) => {
    const isPickup = s.type === 'pickup'
    const label    = isPickup ? 'Pickup' : 'Drop-off'
    const dotColor = isPickup ? '#16a34a' : '#dc2626'
    const letter   = isPickup ? 'P' : 'D'
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
        <tr>
          <td width="40" style="vertical-align:top;padding-top:2px;">
            <div style="width:32px;height:32px;border-radius:50%;background:${dotColor};color:#fff;font-size:13px;font-weight:800;text-align:center;line-height:32px;">${letter}</div>
          </td>
          <td style="vertical-align:top;padding-left:4px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:3px;">${label}</div>
            <div style="font-size:14px;color:#1e293b;font-weight:500;line-height:1.45;">${esc(s.address)}</div>
            ${s.contactName ? `<div style="font-size:12px;color:#94a3b8;margin-top:3px;">${esc(s.contactName)}${s.contactPhone ? ' &middot; ' + esc(s.contactPhone) : ''}</div>` : ''}
          </td>
        </tr>
      </table>`
  }).join('')
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function timelineHtml(statusHistory = []) {
  if (!statusHistory.length) return ''
  const rows = statusHistory.map((h, i) => {
    const isLast = i === statusHistory.length - 1
    const color  = STATUS_COLORS[h.status] ?? '#64748b'
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:${isLast ? '0' : '12px'};">
        <tr>
          <td width="20" style="vertical-align:top;text-align:center;padding-top:2px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};box-shadow:0 0 0 3px ${color}30;display:inline-block;"></div>
            ${!isLast ? `<div style="width:2px;background:#e2e8f0;margin:4px auto 0;height:20px;"></div>` : ''}
          </td>
          <td style="vertical-align:top;padding-left:10px;">
            <div style="font-size:13px;font-weight:600;color:#1e293b;">${esc(STATUS_LABELS[h.status] ?? h.status)}</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:1px;">${formatDate(h.timestamp)}</div>
            ${h.note ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${esc(h.note)}</div>` : ''}
          </td>
        </tr>
      </table>`
  }).join('')

  return `
    <p style="margin:24px 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Status History</p>
    ${rows}`
}

// ── Tracking box ──────────────────────────────────────────────────────────────

function trackingBoxHtml(token, trackingUrl, linkLabel = 'Track your delivery online:') {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#f0fdf0;border:1.5px solid rgba(27,185,8,0.22);border-radius:12px;margin-bottom:28px;">
      <tr>
        <td style="padding:22px 24px;text-align:center;">
          <p style="margin:0 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#64748b;">Tracking Number</p>
          <p class="tracking-id-text" style="margin:0 0 12px;font-size:28px;font-weight:800;color:#0f172a;letter-spacing:3px;font-family:'Courier New',Courier,monospace;">${token}</p>
          <p style="margin:0 0 6px;font-size:12px;color:#64748b;">${linkLabel}</p>
          <a href="${trackingUrl}" style="color:${BRAND_GREEN};font-size:13px;font-weight:600;word-break:break-all;text-decoration:none;">${trackingUrl}</a>
        </td>
      </tr>
    </table>`
}

// ── CTA button ────────────────────────────────────────────────────────────────

function ctaBtn(href, text) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
      <tr>
        <td align="center">
          <a href="${href}"
            style="display:inline-block;background:linear-gradient(135deg,${BRAND_GREEN},${BRAND_GREEN_DARK});color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:15px 36px;border-radius:12px;letter-spacing:0.01em;box-shadow:0 4px 16px rgba(27,185,8,0.35);">
            ${text}
          </a>
        </td>
      </tr>
    </table>`
}

// ── Status badge ──────────────────────────────────────────────────────────────

function statusBadgeHtml(status) {
  const color = STATUS_COLORS[status] ?? '#64748b'
  const label = STATUS_LABELS[status] ?? status
  return `
    <p style="margin:0 0 24px;">
      <span style="display:inline-flex;align-items:center;gap:7px;background:${color}18;color:${color};font-size:13px;font-weight:700;padding:7px 16px;border-radius:99px;border:1px solid ${color}30;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};"></span>
        ${label}
      </span>
    </p>`
}

// ── Section heading ───────────────────────────────────────────────────────────

function sectionHeading(text) {
  return `<p style="margin:24px 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">${text}</p>`
}

function divider() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;"><tr><td style="height:1px;background:#f1f5f9;font-size:0;line-height:0;">&nbsp;</td></tr></table>`
}

// ── Email: Booking Confirmed ──────────────────────────────────────────────────

export function buildBookingConfirmedEmail({ booking, trackingUrl, recipientType }) {
  const isSender = recipientType === 'sender'
  const token    = booking.trackingToken
  const status   = booking.status ?? 'pending'

  const body = `
    <h1 class="title-text" style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;line-height:1.2;">
      ${isSender ? '🎉 Booking Confirmed!' : '📦 A Package Is On Its Way'}
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.65;">
      ${isSender
        ? 'Your booking has been placed successfully. Use the tracking number below to follow your delivery in real time.'
        : 'Someone has sent you a package via GoFastDelivery. Use the tracking number below to follow its journey.'}
    </p>

    ${trackingBoxHtml(token, trackingUrl)}

    ${statusBadgeHtml(status)}

    ${sectionHeading('Route')}
    ${stopsHtml(booking.stops)}

    ${booking.packageDetails?.kind ? `
      ${divider()}
      ${sectionHeading('Package Details')}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#475569;line-height:1.8;">
        <tr><td><strong style="color:#334155;">Type:</strong>&nbsp;${esc(booking.packageDetails.kind)}</td></tr>
        ${booking.packageDetails.description ? `<tr><td><strong style="color:#334155;">Contents:</strong>&nbsp;${esc(booking.packageDetails.description)}</td></tr>` : ''}
        ${booking.packageDetails.weightSlab   ? `<tr><td><strong style="color:#334155;">Weight:</strong>&nbsp;${esc(booking.packageDetails.weightSlab.replace(/_/g,' '))}</td></tr>` : ''}
      </table>` : ''}

    ${ctaBtn(trackingUrl, 'Track My Delivery &rarr;')}`

  return baseTemplate({
    title:     isSender ? `Booking Confirmed — ${BRAND_NAME}` : `Package On Its Way — ${BRAND_NAME}`,
    preheader: `Tracking #${token} — ${isSender ? 'Your booking is confirmed.' : 'Your package is on its way.'}`,
    body,
  })
}

// ── Email: Status Update ──────────────────────────────────────────────────────

export function buildStatusUpdateEmail({ booking, trackingUrl, newStatus }) {
  const token       = booking.trackingToken
  const statusLabel = STATUS_LABELS[newStatus] ?? newStatus

  const isDelivered = newStatus === 'delivered'
  const isPickedUp  = newStatus === 'picked_up'

  const title = isDelivered ? '✅ Package Delivered!'
    : isPickedUp             ? '🚚 Package Picked Up'
    :                          `Update: ${statusLabel}`

  const subtitle = isDelivered
    ? 'Great news — your package has been successfully delivered to its destination.'
    : isPickedUp
    ? 'Your package has been picked up by our driver and is heading to its destination.'
    : `Your shipment status has been updated to: ${statusLabel}.`

  const body = `
    <h1 class="title-text" style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;line-height:1.2;">${title}</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.65;">${subtitle}</p>

    ${statusBadgeHtml(newStatus)}

    ${trackingBoxHtml(token, trackingUrl, 'View full delivery history:')}

    ${sectionHeading('Route')}
    ${stopsHtml(booking.stops)}

    ${timelineHtml(booking.statusHistory)}

    ${ctaBtn(trackingUrl, 'View Full Tracking &rarr;')}`

  return baseTemplate({
    title:     `${statusLabel} — ${BRAND_NAME}`,
    preheader: `Your package is now: ${statusLabel}. Tracking #${token}`,
    body,
  })
}

// ── Email: Password Reset OTP ─────────────────────────────────────────────────

export function buildPasswordResetEmail({ otp, userName }) {
  const name = esc(userName ?? 'there')

  const body = `
    <h1 class="title-text" style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;line-height:1.2;">
      Reset your password
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.65;">
      Hi ${name},<br /><br />
      We received a request to reset the password for your GoFastDelivery account.
      Use the verification code below — it expires in <strong style="color:#0f172a;">5 minutes</strong>.
    </p>

    <!-- OTP box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border:1.5px solid rgba(27,185,8,0.25);border-radius:16px;margin-bottom:28px;">
      <tr>
        <td style="padding:32px 24px;text-align:center;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#64748b;">Verification Code</p>
          <div style="display:inline-block;background:#ffffff;border:1.5px solid rgba(27,185,8,0.2);border-radius:12px;padding:16px 28px;box-shadow:0 2px 12px rgba(27,185,8,0.10);">
            <span style="font-size:40px;font-weight:900;color:#0f172a;letter-spacing:10px;font-family:'Courier New',Courier,monospace;line-height:1;">${otp}</span>
          </div>
          <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">This code expires in 5 minutes</p>
        </td>
      </tr>
    </table>

    <!-- Security notice -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.55;">
            <strong style="color:#78350f;">⚠ Didn&apos;t request this?</strong><br />
            If you didn&apos;t request a password reset, you can safely ignore this email.
            Your account password will not be changed.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
      For security, never share this code with anyone.<br />
      GoFastDelivery will never ask for your verification code.
    </p>`

  return baseTemplate({
    title:     `Password Reset Code — GoFastDelivery`,
    preheader: `Your password reset code is ${otp} — expires in 5 minutes.`,
    body,
  })
}

export async function sendPasswordResetOtp({ to, otp, userName }) {
  await sendMail({
    to,
    subject: `Your GoFastDelivery password reset code: ${otp}`,
    html: buildPasswordResetEmail({ otp, userName }),
  })
}

// ── Email: Invoice ────────────────────────────────────────────────────────────

function formatInvoiceDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function buildInvoiceEmailHtml(invoice) {
  const items    = invoice.items ?? []
  const subtotal = items.reduce((s, it) => s + (it.rate ?? 0) * (it.quantity ?? 0), 0)
  const taxAmt   = Math.round(subtotal * ((invoice.taxRate ?? 5) / 100) * 100) / 100
  const total    = subtotal + taxAmt
  const balance  = total - (invoice.amountPaid ?? 0)
  const currency = invoice.currency ?? 'CAD'
  const fmt      = (n) => `${currency} $${Number(n ?? 0).toFixed(2)}`

  const itemRows = items.map((item, i) => {
    const amt = (item.rate ?? 0) * (item.quantity ?? 0)
    return `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding:10px 20px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;font-weight:600;line-height:1.5;">
          ${esc(item.description)}
          ${item.serviceDate ? `<div style="font-size:11px;color:#94a3b8;margin-top:3px;">${esc(item.serviceDate)}</div>` : ''}
          ${item.details     ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px;white-space:pre-line;line-height:1.5;">${esc(item.details)}</div>` : ''}
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;color:#475569;white-space:nowrap;">$${Number(item.rate ?? 0).toFixed(2)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;color:#475569;">${item.quantity ?? 0}</td>
        <td style="padding:10px 20px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;font-weight:700;color:#334155;white-space:nowrap;">$${amt.toFixed(2)}</td>
      </tr>`
  }).join('')

  const body = `
    <!-- Invoice header (table layout — no flex, works in all email clients) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td style="vertical-align:top;">
          <p style="margin:0 0 6px;font-size:20px;font-weight:900;color:#0f172a;letter-spacing:-0.3px;line-height:1.2;">
            Invoice&nbsp;<span style="color:${BRAND_GREEN};font-family:'Courier New',Courier,monospace;">${esc(invoice.invoiceNumber)}</span>
          </p>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">${esc(invoice.clientName)} &middot; ${formatInvoiceDate(invoice.invoiceDate)}</p>
        </td>
      </tr>
    </table>

    <!-- Balance due hero -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#f0fdf0;border:1.5px solid rgba(27,185,8,0.22);border-radius:12px;margin-bottom:28px;">
      <tr>
        <td style="padding:20px 28px;">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#64748b;">Balance Due</p>
          <p style="margin:0;font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;line-height:1.2;">${fmt(balance)}</p>
          ${invoice.dueDate ? `<p style="margin:6px 0 0;font-size:12px;color:#64748b;">Due:&nbsp;<strong style="color:#334155;">${formatInvoiceDate(invoice.dueDate)}</strong></p>` : ''}
        </td>
      </tr>
    </table>

    <!-- From + Bill To -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td width="50%" style="vertical-align:top;padding-right:16px;">
          <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">From</p>
          <p style="margin:0;font-weight:700;font-size:13px;color:#0f172a;">${esc(invoice.companyName || 'GoFastDelivery')}</p>
          ${invoice.companyAddress ? `<p style="margin:3px 0 0;font-size:12px;color:#475569;">${esc(invoice.companyAddress)}</p>` : ''}
          ${invoice.companyCity    ? `<p style="margin:1px 0 0;font-size:12px;color:#475569;">${esc(invoice.companyCity)}</p>`    : ''}
          ${invoice.companyEmail   ? `<p style="margin:5px 0 0;font-size:12px;color:${BRAND_GREEN};font-weight:600;">${esc(invoice.companyEmail)}</p>` : ''}
        </td>
        <td width="50%" style="vertical-align:top;padding-left:16px;border-left:2px solid #e2e8f0;">
          <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Bill To</p>
          <p style="margin:0;font-weight:700;font-size:13px;color:#0f172a;">${esc(invoice.clientName)}</p>
          ${invoice.clientAddress ? `<p style="margin:3px 0 0;font-size:12px;color:#475569;">${esc(invoice.clientAddress)}</p>` : ''}
          ${invoice.clientCity    ? `<p style="margin:1px 0 0;font-size:12px;color:#475569;">${esc(invoice.clientCity)}</p>`    : ''}
          ${invoice.clientPhone   ? `<p style="margin:5px 0 0;font-size:12px;color:#475569;">${esc(invoice.clientPhone)}</p>`   : ''}
          ${invoice.clientEmail   ? `<p style="margin:3px 0 0;font-size:12px;color:${BRAND_GREEN};font-weight:600;">${esc(invoice.clientEmail)}</p>` : ''}
        </td>
      </tr>
    </table>

    <!-- Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
      <tr><td style="height:1px;background:#e2e8f0;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>

    <!-- Line items table -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:10px 20px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Description</th>
          <th style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Rate</th>
          <th style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Qty</th>
          <th style="padding:10px 20px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- Totals -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right" style="margin-bottom:28px;min-width:240px;">
      <tbody>
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#64748b;padding-right:32px;">Subtotal</td>
          <td style="padding:5px 0;font-size:13px;font-weight:600;color:#334155;text-align:right;white-space:nowrap;">$${subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#64748b;padding-right:32px;">Tax (${invoice.taxRate ?? 5}% GST)</td>
          <td style="padding:5px 0;font-size:13px;font-weight:600;color:#334155;text-align:right;white-space:nowrap;">$${taxAmt.toFixed(2)}</td>
        </tr>
        ${(invoice.amountPaid ?? 0) > 0 ? `
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#16a34a;padding-right:32px;">Amount Paid</td>
          <td style="padding:5px 0;font-size:13px;font-weight:600;color:#16a34a;text-align:right;white-space:nowrap;">&#8722;$${Number(invoice.amountPaid).toFixed(2)}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:10px 0 0;border-top:2px solid ${BRAND_GREEN};font-size:15px;font-weight:800;color:#0f172a;padding-right:32px;">Balance Due</td>
          <td style="padding:10px 0 0;border-top:2px solid ${BRAND_GREEN};font-size:17px;font-weight:900;color:#0f172a;text-align:right;white-space:nowrap;">${fmt(balance)}</td>
        </tr>
      </tbody>
    </table>

    ${invoice.notes?.trim() ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#f8fafc;border-left:4px solid ${BRAND_GREEN};border-radius:0 8px 8px 0;margin-bottom:24px;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0 0 5px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Notes</p>
          <p style="margin:0;font-size:13px;color:#475569;white-space:pre-line;line-height:1.65;">${esc(invoice.notes)}</p>
        </td>
      </tr>
    </table>` : ''}

    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.7;">
      Please reference invoice <strong style="color:#64748b;">${esc(invoice.invoiceNumber)}</strong> when making payment.<br />
      Thank you for your business.
    </p>`

  return baseTemplate({
    title:     `Invoice ${invoice.invoiceNumber} — GoFastDelivery`,
    preheader: `Invoice ${invoice.invoiceNumber} from GoFastDelivery — Balance due: ${fmt(balance)}`,
    body,
  })
}

export async function sendInvoiceEmail(invoice) {
  const to = invoice.clientEmail
  if (!to) throw new Error('Invoice has no client email address')

  const items    = invoice.items ?? []
  const subtotal = items.reduce((s, it) => s + (it.rate ?? 0) * (it.quantity ?? 0), 0)
  const taxAmt   = Math.round(subtotal * ((invoice.taxRate ?? 5) / 100) * 100) / 100
  const total    = subtotal + taxAmt
  const balance  = (total - (invoice.amountPaid ?? 0)).toFixed(2)
  const currency = invoice.currency ?? 'CAD'

  const pdfBuffer = await buildInvoicePdf(invoice)

  await transporter.sendMail({
    from: BRAND_FROM,
    to,
    subject: `Invoice ${invoice.invoiceNumber} from GoFastDelivery — Balance Due: ${currency} $${balance}`,
    html: buildInvoiceEmailHtml(invoice),
    attachments: [
      {
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
        content:  pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })
}

// ── Send helpers ──────────────────────────────────────────────────────────────

async function sendMail({ to, subject, html }) {
  if (!to) return
  await transporter.sendMail({ from: BRAND_FROM, to, subject, html })
}

export async function sendBookingConfirmed({ booking, trackingUrl }) {
  const jobs = []
  if (booking.senderEmail) {
    jobs.push(sendMail({
      to:      booking.senderEmail,
      subject: `Booking Confirmed — Tracking #${booking.trackingToken}`,
      html:    buildBookingConfirmedEmail({ booking, trackingUrl, recipientType: 'sender' }),
    }))
  }
  if (booking.receiverEmail && booking.receiverEmail !== booking.senderEmail) {
    jobs.push(sendMail({
      to:      booking.receiverEmail,
      subject: `A Package Is On Its Way — Tracking #${booking.trackingToken}`,
      html:    buildBookingConfirmedEmail({ booking, trackingUrl, recipientType: 'receiver' }),
    }))
  }
  await Promise.allSettled(jobs)
}

export async function sendStatusUpdate({ booking, trackingUrl, newStatus }) {
  const statusLabel = STATUS_LABELS[newStatus] ?? newStatus
  const subject     = `${statusLabel} — Tracking #${booking.trackingToken}`
  const jobs        = []
  if (booking.senderEmail) {
    jobs.push(sendMail({ to: booking.senderEmail, subject, html: buildStatusUpdateEmail({ booking, trackingUrl, newStatus }) }))
  }
  if (booking.receiverEmail && booking.receiverEmail !== booking.senderEmail) {
    jobs.push(sendMail({ to: booking.receiverEmail, subject, html: buildStatusUpdateEmail({ booking, trackingUrl, newStatus }) }))
  }
  await Promise.allSettled(jobs)
}
