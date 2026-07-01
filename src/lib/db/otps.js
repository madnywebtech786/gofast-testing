import { getDb } from './client.js'

const OTP_TTL_MS    = 5 * 60 * 1000   // 5 minutes
const RESEND_TTL_MS = 60 * 1000        // 60 seconds cooldown
const MAX_ATTEMPTS  = 5

function otpCollection(db) {
  return db.collection('password_reset_otps')
}

/**
 * Ensure a TTL index exists on the collection (safe to call repeatedly —
 * MongoDB is idempotent for identical index definitions).
 */
export async function ensureOtpIndexes() {
  const db = await getDb()
  await otpCollection(db).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  await otpCollection(db).createIndex({ email: 1 }, { unique: true })
}

/**
 * Store (or replace) an OTP for the given email.
 * Resets attempt counter and sets a fresh 5-minute expiry.
 */
export async function storeOtpDb(email, otp) {
  const db  = await getDb()
  const now = new Date()
  await otpCollection(db).replaceOne(
    { email: email.toLowerCase() },
    {
      email:      email.toLowerCase(),
      otp,
      attempts:   0,
      createdAt:  now,
      resentAt:   now,
      expiresAt:  new Date(now.getTime() + OTP_TTL_MS),
    },
    { upsert: true }
  )
}

/**
 * Returns true if the email is not in a resend cooldown.
 */
export async function canResendOtpDb(email) {
  const db  = await getDb()
  const doc = await otpCollection(db).findOne({ email: email.toLowerCase() })
  if (!doc) return true
  return Date.now() - doc.resentAt.getTime() >= RESEND_TTL_MS
}

/**
 * Verify an OTP. Returns { valid: true } or { valid: false, reason }.
 * Consumes the OTP on success (deletes it).
 */
export async function verifyOtpDb(email, code) {
  const db  = await getDb()
  const col = otpCollection(db)
  const lc  = email.toLowerCase()

  const doc = await col.findOne({ email: lc })
  if (!doc) return { valid: false, reason: 'expired' }

  // MongoDB TTL index deletes expired docs eventually but may lag slightly —
  // check expiry explicitly to be safe.
  if (doc.expiresAt < new Date()) {
    await col.deleteOne({ email: lc })
    return { valid: false, reason: 'expired' }
  }

  // Increment attempt counter atomically
  const updated = await col.findOneAndUpdate(
    { email: lc },
    { $inc: { attempts: 1 } },
    { returnDocument: 'after' }
  )

  if (updated.attempts > MAX_ATTEMPTS) {
    await col.deleteOne({ email: lc })
    return { valid: false, reason: 'locked' }
  }

  if (updated.otp !== code) return { valid: false, reason: 'invalid' }

  // Correct — delete the OTP so it can't be reused
  await col.deleteOne({ email: lc })
  return { valid: true }
}
