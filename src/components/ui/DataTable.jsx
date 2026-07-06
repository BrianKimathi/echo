import { useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { paginate } from '../../utils/helpers'

export default function DataTable({ columns, data, renderRow, searchKeys, searchPlaceholder = 'Search…', actions }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [term, setTerm] = useState('')

  const filtered = term && searchKeys?.length
    ? data.filter((row) => searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(term.toLowerCase())))
    : data

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const rows = paginate(filtered, currentPage, perPage)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {searchKeys ? (
          <input
            className="input max-w-xs"
            placeholder={searchPlaceholder}
            value={term}
            onChange={(e) => {
              setTerm(e.target.value)
              setPage(1)
            }}
          />
        ) : (
          <span />
        )}
        {actions}
      </div>
      <div className="table-wrap overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.className}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-10 text-center text-slate-400">
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row) => renderRow(row))
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value))
                setPage(1)
              }}
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="ml-2">
              {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="btn-ghost px-2 py-1"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <FiChevronLeft />
            </button>
            <span className="px-2">{currentPage} / {totalPages}</span>
            <button
              className="btn-ghost px-2 py-1"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
