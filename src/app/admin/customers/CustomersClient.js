'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Users, Phone, Mail, Calendar, Search, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

const PAGE_SIZE = 20

function Pagination({ page, total, pageSize, onNavigate }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return (
    <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border"
      style={{ background: 'var(--surface-2)' }}>
      <span className="text-xs" style={{ color: 'var(--fg-3)' }}>{start}–{end} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onNavigate(page - 1)} disabled={page === 1}
          className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: 'var(--fg-2)' }}>
          <ChevronLeft size={13} />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + Math.max(1, page - 3))
          .filter(p => p <= totalPages)
          .map(p => (
            <button key={p} onClick={() => onNavigate(p)}
              className="w-7 h-7 rounded-lg text-xs font-semibold transition-all"
              style={{ background: page === p ? 'var(--accent)' : 'transparent', color: page === p ? '#fff' : 'var(--fg-2)' }}>
              {p}
            </button>
          ))}
        <button onClick={() => onNavigate(page + 1)} disabled={page === totalPages}
          className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: 'var(--fg-2)' }}>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

export default function CustomersClient({ customers, total, page, search: initialSearch }) {
  const router     = useRouter()
  const pathname   = usePathname()
  const params     = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(initialSearch)
  const debounceRef = useRef(null)

  const navigate = useCallback((overrides) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(overrides)) {
      if (v == null || v === '' || v === 1 && k === 'page') next.delete(k)
      else next.set(k, String(v))
    }
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }, [params, pathname, router])

  useEffect(() => {
    if (searchInput.trim() === (initialSearch ?? '').trim()) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({ search: searchInput.trim(), page: 1 })
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  function clearSearch() {
    clearTimeout(debounceRef.current)
    setSearchInput('')
    navigate({ search: '', page: 1 })
  }

  const currentPage = Math.max(1, page)

  return (
    <div>
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3 anim-fade-up">
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Customers</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>
            {total} registered customer{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search bar */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isPending
              ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
              : <Search size={14} style={{ color: 'var(--fg-3)' }} />
            }
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search name, email, phone…"
            className="pl-8 pr-8 py-2 rounded-xl border text-sm w-64 focus:outline-none focus:ring-2 transition-all"
            style={{
              borderColor: isPending ? 'var(--accent)' : 'var(--border-2)',
              background: '#fff',
              color: 'var(--fg)',
            }}
          />
          {searchInput && !isPending && (
            <button type="button" onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center"
              style={{ color: 'var(--fg-3)' }}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div style={{ opacity: isPending ? 0.5 : 1, transition: 'opacity 0.2s' }}>
      {customers.length === 0 ? (
        <div className="rounded-xl border border-border bg-white py-20 text-center anim-fade-up s1">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
            <Users size={22} style={{ color: 'var(--fg-3)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--fg-2)' }}>
            {initialSearch ? `No customers match "${initialSearch}".` : 'No customers registered yet.'}
          </p>
          {initialSearch && (
            <button onClick={clearSearch} className="mt-3 text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white overflow-hidden anim-fade-up s1">
          {/* Table — desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="hidden md:table-cell">Phone</th>
                  <th className="hidden lg:table-cell">Contact Name</th>
                  <th className="hidden lg:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c._id} className={`anim-fade-up s${Math.min(i + 1, 6)}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{c.name}</p>
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-3)' }}>
                            <Mail size={10} />{c.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-xs mono" style={{ color: 'var(--fg-2)' }}>
                        <Phone size={11} style={{ color: 'var(--fg-3)' }} />
                        {c.phone ?? '—'}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell">
                      <span className="text-xs" style={{ color: 'var(--fg-2)' }}>{c.contactName || '—'}</span>
                    </td>
                    <td className="hidden lg:table-cell">
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--fg-3)' }}>
                        <Calendar size={11} />
                        {new Date(c.createdAt).toLocaleDateString('en-CA')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="sm:hidden divide-y divide-border">
            {customers.map(c => (
              <div key={c._id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{c.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--fg-3)' }}>{c.email}</p>
                  {c.phone && <p className="text-xs mono mt-0.5" style={{ color: 'var(--fg-3)' }}>{c.phone}</p>}
                </div>
              </div>
            ))}
          </div>

          <Pagination page={currentPage} total={total} pageSize={PAGE_SIZE}
            onNavigate={p => navigate({ page: p })} />
        </div>
      )}
      </div>
    </div>
  )
}
