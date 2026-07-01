import { ObjectId } from 'mongodb'
import { getDb } from './client.js'

export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue']

export async function createInvoice(data) {
  const db = await getDb()
  const now = new Date()
  const doc = {
    companyName:    data.companyName    ?? '',
    companyAddress: data.companyAddress ?? '',
    companyCity:    data.companyCity    ?? '',
    companyPhone:   data.companyPhone   ?? '',
    companyEmail:   data.companyEmail   ?? '',
    invoiceNumber:  data.invoiceNumber  ?? '',
    invoiceDate:    data.invoiceDate    ? new Date(data.invoiceDate) : now,
    dueDate:        data.dueDate        ? new Date(data.dueDate)     : null,
    paymentTerms:   data.paymentTerms   ?? 'On Receipt',
    currency:       data.currency       ?? 'CAD',
    status:         INVOICE_STATUSES.includes(data.status) ? data.status : 'draft',
    clientName:     data.clientName     ?? '',
    clientAddress:  data.clientAddress  ?? '',
    clientCity:     data.clientCity     ?? '',
    clientPhone:    data.clientPhone    ?? '',
    clientEmail:    data.clientEmail    ?? '',
    items: Array.isArray(data.items) ? data.items.map(normalizeItem) : [],
    taxRate:        typeof data.taxRate === 'number' ? data.taxRate : 5,
    amountPaid:     typeof data.amountPaid === 'number' ? data.amountPaid : 0,
    notes: data.notes ?? '',
    createdAt: now,
    updatedAt: now,
  }
  const result = await db.collection('invoices').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}

function normalizeItem(item) {
  return {
    description:  String(item.description  ?? '').trim().slice(0, 1000),
    serviceDate:  item.serviceDate ? String(item.serviceDate).trim().slice(0, 100) : '',
    rate:         typeof item.rate === 'number'     ? item.rate     : 0,
    quantity:     typeof item.quantity === 'number' ? item.quantity : 0,
    details:      String(item.details ?? '').trim().slice(0, 5000),
  }
}

export async function findAllInvoices({ search, status, limit = 20, skip = 0 } = {}) {
  const db = await getDb()
  const filter = buildFilter({ search, status })
  return db
    .collection('invoices')
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray()
}

export async function countAllInvoices({ search, status } = {}) {
  const db = await getDb()
  return db.collection('invoices').countDocuments(buildFilter({ search, status }))
}

function buildFilter({ search, status }) {
  const filter = {}
  if (status && INVOICE_STATUSES.includes(status)) filter.status = status
  if (search?.trim()) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [
      { invoiceNumber: re },
      { clientName:    re },
      { clientEmail:   re },
    ]
  }
  return filter
}

export async function findInvoiceById(id) {
  const db = await getDb()
  return db.collection('invoices').findOne({ _id: new ObjectId(id) })
}

export async function updateInvoice(id, data) {
  const db = await getDb()
  const now = new Date()
  const set = {
    companyName:    data.companyName    ?? '',
    companyAddress: data.companyAddress ?? '',
    companyCity:    data.companyCity    ?? '',
    companyPhone:   data.companyPhone   ?? '',
    companyEmail:   data.companyEmail   ?? '',
    invoiceNumber:  data.invoiceNumber  ?? '',
    invoiceDate:    data.invoiceDate    ? new Date(data.invoiceDate) : null,
    dueDate:        data.dueDate        ? new Date(data.dueDate)     : null,
    paymentTerms:   data.paymentTerms   ?? 'On Receipt',
    currency:       data.currency       ?? 'CAD',
    status:         INVOICE_STATUSES.includes(data.status) ? data.status : 'draft',
    clientName:     data.clientName     ?? '',
    clientAddress:  data.clientAddress  ?? '',
    clientCity:     data.clientCity     ?? '',
    clientPhone:    data.clientPhone    ?? '',
    clientEmail:    data.clientEmail    ?? '',
    items:          Array.isArray(data.items) ? data.items.map(normalizeItem) : [],
    taxRate:        typeof data.taxRate === 'number'     ? data.taxRate     : 5,
    amountPaid:     typeof data.amountPaid === 'number'  ? data.amountPaid  : 0,
    notes:          data.notes ?? '',
    updatedAt:      now,
  }
  return db.collection('invoices').updateOne(
    { _id: new ObjectId(id) },
    { $set: set }
  )
}

export async function deleteInvoice(id) {
  const db = await getDb()
  return db.collection('invoices').deleteOne({ _id: new ObjectId(id) })
}

export async function getNextInvoiceNumber() {
  const db = await getDb()
  // Find the highest existing INV\d+ number
  const last = await db.collection('invoices')
    .find({ invoiceNumber: /^INV\d+$/ })
    .sort({ invoiceNumber: -1 })
    .limit(1)
    .toArray()

  let next = 1
  if (last.length > 0) {
    const num = parseInt(last[0].invoiceNumber.replace('INV', ''), 10)
    if (!isNaN(num)) next = num + 1
  }
  return `INV${String(next).padStart(3, '0')}`
}
