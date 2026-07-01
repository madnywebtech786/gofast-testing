'use client'

const BRAND_GREEN      = '#1bb908'
const BRAND_GREEN_DARK = '#15960a'
const BRAND_DARK       = '#071407'

function formatDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function calcSubtotal(items) {
  return items.reduce((sum, item) => sum + (item.rate ?? 0) * (item.quantity ?? 0), 0)
}

function calcTax(subtotal, taxRate) {
  return Math.round(subtotal * (taxRate / 100) * 100) / 100
}

function formatMoney(amount, currency = 'CAD') {
  return `${currency} $${Number(amount ?? 0).toFixed(2)}`
}

const STATUS_STYLES = {
  draft:    { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
  sent:     { bg: '#eff6ff', color: '#2563eb', label: 'Sent' },
  paid:     { bg: '#f0fdf4', color: '#16a34a', label: 'Paid' },
  overdue:  { bg: '#fef2f2', color: '#dc2626', label: 'Overdue' },
}

export default function InvoicePDF({ invoice }) {
  if (!invoice) return null

  const items    = invoice.items ?? []
  const subtotal = calcSubtotal(items)
  const taxAmt   = calcTax(subtotal, invoice.taxRate ?? 5)
  const total    = subtotal + taxAmt
  const balance  = total - (invoice.amountPaid ?? 0)
  const currency = invoice.currency ?? 'CAD'
  const st       = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.draft

  return (
    <div style={{
      fontFamily: "'Segoe UI', -apple-system, sans-serif",
      fontSize: '12px',
      color: '#1e293b',
      maxWidth: '800px',
      margin: '0 auto',
      background: '#ffffff',
    }}>

      {/* ── Header bar ── */}
      <div style={{
        background: `linear-gradient(135deg, ${BRAND_DARK} 0%, #0d200c 60%, #0a1a09 100%)`,
        padding: '0',
        position: 'relative',
      }}>
        {/* Green accent line */}
        <div style={{
          height: '5px',
          background: `linear-gradient(90deg, ${BRAND_GREEN}, ${BRAND_GREEN_DARK})`,
        }} />

        <div style={{
          padding: '28px 40px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          {/* Logo + brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.png"
              alt="GoFastDelivery"
              width={50}
              height={50}
              style={{ borderRadius: '10px', objectFit: 'contain', display: 'block' }}
            />
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#000000', letterSpacing: '-0.5px', lineHeight: 1 }}>
                GoFast<span style={{ color: BRAND_GREEN }}>Delivery</span>
              </div>
              <div style={{ fontSize: '11px', color: '#000000', marginTop: '3px' }}>
                Calgary&apos;s Same-Day Courier · Calgary, AB
              </div>
            </div>
          </div>

          {/* Invoice title block */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#000000', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Invoice
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: BRAND_GREEN, marginTop: '4px', letterSpacing: '1px' }}>
              {invoice.invoiceNumber}
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
              background: st.bg,
              color: st.color,
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: st.color, display: 'inline-block',
              }} />
              {st.label}
            </div>
          </div>
        </div>
      </div>

      {/* ── Company info + dates row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '0',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc',
      }}>
        {/* From */}
        <div style={{ padding: '20px 28px', borderRight: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: '8px' }}>From</div>
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginBottom: '3px' }}>{invoice.companyName || 'GoFastDelivery'}</div>
          {invoice.companyAddress && <div style={{ color: '#475569', lineHeight: 1.5 }}>{invoice.companyAddress}</div>}
          {invoice.companyCity    && <div style={{ color: '#475569', lineHeight: 1.5 }}>{invoice.companyCity}</div>}
          {invoice.companyPhone   && <div style={{ color: '#475569', marginTop: '4px' }}>{invoice.companyPhone}</div>}
          {invoice.companyEmail   && <div style={{ color: BRAND_GREEN, marginTop: '2px' }}>{invoice.companyEmail}</div>}
        </div>

        {/* Bill To */}
        <div style={{ padding: '20px 28px', borderRight: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: '8px' }}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginBottom: '3px' }}>{invoice.clientName}</div>
          {invoice.clientAddress && <div style={{ color: '#475569', lineHeight: 1.5 }}>{invoice.clientAddress}</div>}
          {invoice.clientCity    && <div style={{ color: '#475569', lineHeight: 1.5 }}>{invoice.clientCity}</div>}
          {invoice.clientPhone   && <div style={{ color: '#475569', marginTop: '4px' }}>{invoice.clientPhone}</div>}
          {invoice.clientEmail   && <div style={{ color: BRAND_GREEN, marginTop: '2px' }}>{invoice.clientEmail}</div>}
        </div>

        {/* Dates */}
        <div style={{ padding: '20px 28px' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: '8px' }}>Details</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Invoice Date', formatDate(invoice.invoiceDate)],
                ['Due Date',     invoice.dueDate ? formatDate(invoice.dueDate) : (invoice.paymentTerms ?? 'On Receipt')],
                ['Currency',     invoice.currency ?? 'CAD'],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ paddingBottom: '5px', color: '#64748b', fontSize: '11px', paddingRight: '12px', whiteSpace: 'nowrap' }}>{label}</td>
                  <td style={{ paddingBottom: '5px', fontWeight: 600, color: '#1e293b', fontSize: '11px', textAlign: 'right' }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Balance Due hero ── */}
      <div style={{
        padding: '18px 40px',
        background: `linear-gradient(135deg, ${BRAND_GREEN}12 0%, ${BRAND_GREEN}06 100%)`,
        borderBottom: `2px solid ${BRAND_GREEN}30`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Balance Due
        </div>
        <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>
          {formatMoney(balance, currency)}
        </div>
      </div>

      {/* ── Items table ── */}
      <div style={{ padding: '0 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '10px 28px', textAlign: 'left',  fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Description / Delivery Details</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Service Period</th>
              <th style={{ padding: '10px 16px', textAlign: 'right',  fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Rate</th>
              <th style={{ padding: '10px 16px', textAlign: 'right',  fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Qty</th>
              <th style={{ padding: '10px 28px', textAlign: 'right',  fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const amt = (item.rate ?? 0) * (item.quantity ?? 0)
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : '#fafbfc' }}>
                  <td style={{ padding: '12px 28px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: item.details ? '6px' : 0 }}>
                      {item.description}
                    </div>
                    {item.details && (
                      <div style={{
                        fontSize: '10px',
                        color: '#64748b',
                        lineHeight: 1.7,
                        whiteSpace: 'pre-line',
                        marginTop: '4px',
                        paddingTop: '6px',
                        borderTop: '1px solid #e2e8f0',
                      }}>
                        {item.details}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#475569', verticalAlign: 'top', whiteSpace: 'nowrap', fontSize: '11px' }}>
                    {item.serviceDate || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#475569', verticalAlign: 'top', fontVariantNumeric: 'tabular-nums' }}>
                    ${Number(item.rate ?? 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#475569', verticalAlign: 'top', fontVariantNumeric: 'tabular-nums' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '12px 28px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 700, color: '#0f172a', verticalAlign: 'top', fontVariantNumeric: 'tabular-nums' }}>
                    ${amt.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Totals block ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 0 0 0' }}>
        <div style={{ width: '280px', padding: '20px 28px 24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: '8px', color: '#64748b', fontSize: '12px' }}>Subtotal</td>
                <td style={{ paddingBottom: '8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#1e293b', fontWeight: 500 }}>${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ paddingBottom: '8px', color: '#64748b', fontSize: '12px' }}>Tax ({invoice.taxRate ?? 5}% GST)</td>
                <td style={{ paddingBottom: '8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#1e293b', fontWeight: 500 }}>${taxAmt.toFixed(2)}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ paddingTop: '10px', paddingBottom: '8px', fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>Total</td>
                <td style={{ paddingTop: '10px', paddingBottom: '8px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(total, currency)}</td>
              </tr>
              {(invoice.amountPaid ?? 0) > 0 && (
                <tr>
                  <td style={{ paddingBottom: '8px', color: '#16a34a', fontSize: '12px' }}>Amount Paid</td>
                  <td style={{ paddingBottom: '8px', textAlign: 'right', color: '#16a34a', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>−${Number(invoice.amountPaid).toFixed(2)}</td>
                </tr>
              )}
              <tr style={{ borderTop: `2px solid ${BRAND_GREEN}` }}>
                <td style={{ paddingTop: '10px', fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>Balance Due</td>
                <td style={{ paddingTop: '10px', textAlign: 'right', fontWeight: 900, fontSize: '18px', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(balance, currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Notes ── */}
      {invoice.notes && (
        <div style={{
          margin: '0 28px 24px',
          padding: '16px 20px',
          background: '#f8fafc',
          borderRadius: '10px',
          borderLeft: `4px solid ${BRAND_GREEN}`,
        }}>
          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '6px' }}>Notes</div>
          <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{invoice.notes}</div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
          <span style={{ fontWeight: 700, color: '#475569' }}>GoFastDelivery</span> · Calgary, AB · Same-day courier services
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
          gofastdelivery2024@gmail.com · hello@gofastdelivery.ca
        </div>
      </div>
    </div>
  )
}

export function getPdfFilename(invoice) {
  const num    = (invoice.invoiceNumber ?? '').replace(/[^a-zA-Z0-9-_]/g, '_')
  const client = (invoice.clientName    ?? '').replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_')
  return `${num}-${client}-Invoice`
}

export function triggerPrint(invoice) {
  import('react-dom/client').then(({ createRoot }) => {
    import('react').then(({ createElement }) => {
      const win = window.open('', '_blank', 'width=900,height=700')
      if (!win) return

      const filename = getPdfFilename(invoice)
      win.document.title = filename

      win.document.head.innerHTML = `
        <meta charset="utf-8">
        <title>${filename}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', -apple-system, sans-serif; background: #fff; }
          @page { margin: 0; size: A4; }
          @media print { body { margin: 0; } }
        </style>
      `

      const mountPoint = win.document.createElement('div')
      win.document.body.appendChild(mountPoint)

      const root = createRoot(mountPoint)
      root.render(createElement(InvoicePDF, { invoice }))

      setTimeout(() => {
        win.focus()
        win.print()
        setTimeout(() => win.close(), 1000)
      }, 300)
    })
  })
}
