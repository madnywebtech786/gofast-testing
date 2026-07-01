import { ObjectId } from 'mongodb'
import { getDb } from './client.js'

/**
 * List all pricing rules, sorted by fromCity → toCity → weightSlab.
 */
export async function getAllPricingRules() {
  const db = await getDb()
  return db
    .collection('pricing')
    .find({})
    .sort({ fromCity: 1, toCity: 1, weightSlab: 1 })
    .toArray()
}

/**
 * Upsert a single pricing rule.
 * Key = fromCity + toCity + weightSlab (case-insensitive, trimmed).
 */
export async function upsertPricingRule({ fromCity, toCity, weightSlab, price }) {
  const db = await getDb()
  const key = {
    fromCity:   fromCity.trim().toLowerCase(),
    toCity:     toCity.trim().toLowerCase(),
    weightSlab: weightSlab.trim().toLowerCase(),
  }
  return db.collection('pricing').updateOne(
    key,
    {
      $set: {
        ...key,
        fromCityDisplay: fromCity.trim(),
        toCityDisplay:   toCity.trim(),
        price: Number(price),
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  )
}

/**
 * Bulk-upsert pricing rules from an Excel/CSV parse result.
 * rows = [{ fromCity, toCity, weightSlab, price }]
 */
export async function bulkUpsertPricingRules(rows) {
  const db = await getDb()
  const ops = rows.map((row) => {
    const key = {
      fromCity:   String(row.fromCity ?? '').trim().toLowerCase(),
      toCity:     String(row.toCity ?? '').trim().toLowerCase(),
      weightSlab: String(row.weightSlab ?? 'up_to_10').trim().toLowerCase(),
    }
    return {
      updateOne: {
        filter: key,
        update: {
          $set: {
            ...key,
            fromCityDisplay: String(row.fromCity ?? '').trim(),
            toCityDisplay:   String(row.toCity ?? '').trim(),
            price: Number(row.price ?? 0),
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    }
  })
  if (ops.length === 0) return { upsertedCount: 0, modifiedCount: 0 }
  return db.collection('pricing').bulkWrite(ops, { ordered: false })
}

/**
 * Delete a pricing rule by ID.
 */
export async function deletePricingRule(id) {
  const db = await getDb()
  return db.collection('pricing').deleteOne({ _id: new ObjectId(id) })
}

/**
 * Estimate price for a booking.
 * Matches on city names extracted from addresses (simple heuristic: last 2 comma-separated parts).
 * Returns { price, routeLabel, weightLabel } or null if no rule found.
 */
export async function estimatePrice({ pickupAddress, dropoffAddress, weightSlab = 'up_to_10' }) {
  const db = await getDb()

  function extractCity(address) {
    const parts = address.split(',').map((p) => p.trim())
    // Try second-to-last part as city, or last if only 1 part
    return (parts[parts.length - 2] ?? parts[parts.length - 1] ?? '').toLowerCase()
  }

  const fromCity = extractCity(pickupAddress)
  const toCity   = extractCity(dropoffAddress)
  const slab     = (weightSlab ?? 'up_to_10').trim().toLowerCase()

  const rule = await db.collection('pricing').findOne({
    fromCity, toCity, weightSlab: slab,
  })

  if (!rule) return null

  const WEIGHT_LABELS = {
    up_to_10: 'Up to 10 kg',
    '10_to_25': '10–25 kg',
    '25_to_50': '25–50 kg',
    '50_plus':  '50+ kg',
  }

  return {
    price:       rule.price,
    routeLabel:  `${rule.fromCityDisplay} → ${rule.toCityDisplay}`,
    weightLabel: WEIGHT_LABELS[slab] ?? slab,
  }
}
