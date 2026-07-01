import { MongoClient } from 'mongodb'

const DB_NAME = 'courier'

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set')
}

const uri = process.env.MONGODB_URI
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}

// In development: reuse across HMR reloads via a global.
// In production (Vercel serverless): connect lazily so a transient Atlas
// blip at cold-start doesn't permanently poison the module-level promise.
// A failed connect() is not retried — the rejected promise would be cached
// forever on the Lambda instance. Lazy init lets the next request retry.
let clientPromise

function getClientPromise() {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      const c = new MongoClient(uri, options)
      global._mongoClientPromise = c.connect()
    }
    return global._mongoClientPromise
  }

  // Production: create a fresh promise each time the module-level cache is
  // empty. The cache is cleared on connect failure so the next request retries.
  if (!clientPromise) {
    const c = new MongoClient(uri, options)
    clientPromise = c.connect().catch((err) => {
      clientPromise = null  // allow retry on next request
      return Promise.reject(err)
    })
  }
  return clientPromise
}

/**
 * Returns a handle to the 'courier' database.
 * Reuses the existing connection if already established.
 */
export async function getDb() {
  const client = await getClientPromise()
  return client.db(DB_NAME)
}

export default getClientPromise
