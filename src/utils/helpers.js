import dayjs from 'dayjs'

export const formatCurrency = (amount) => {
  const num = Number(amount || 0)
  return 'KSH ' + new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(num)
}

export const formatDate = (date, fmt = 'DD MMM YYYY') => {
  if (!date) return '-'
  return dayjs(date).format(fmt)
}

export const formatDateTime = (date) => formatDate(date, 'DD MMM YYYY, HH:mm')

export const isToday = (date) => (date ? dayjs(date).isSame(dayjs(), 'day') : false)

export const isThisMonth = (date) => (date ? dayjs(date).isSame(dayjs(), 'month') : false)

export const timeAgo = (date) => {
  if (!date) return ''
  const diff = dayjs().diff(dayjs(date), 'minute')
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(date)
}

export const generateId = (prefix = '') => {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}${ts}${rand}`.toUpperCase()
}

export const receiptNumber = () => {
  const d = dayjs().format('YYYYMMDD')
  const r = Math.floor(1000 + Math.random() * 9000)
  return `RCP-${d}-${r}`
}

export const saleNumber = () => {
  const d = dayjs().format('YYYYMMDD')
  const r = Math.floor(1000 + Math.random() * 9000)
  return `SAL-${d}-${r}`
}

export const invoiceNumber = () => {
  const d = dayjs().format('YYYYMMDD')
  const r = Math.floor(1000 + Math.random() * 9000)
  return `INV-${d}-${r}`
}

export const deliveryNoteNumber = () => {
  const d = dayjs().format('YYYYMMDD')
  const r = Math.floor(1000 + Math.random() * 9000)
  return `DN-${d}-${r}`
}

export const computeVat = (amount, rate = 0.16) => Math.round(Number(amount || 0) * rate)

export const downloadFile = (content, filename, type = 'text/csv') => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const toCSV = (rows) => {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (val) => {
    const s = String(val ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))]
  return lines.join('\n')
}

export const paginate = (items, page, perPage) => {
  const start = (page - 1) * perPage
  return items.slice(start, start + perPage)
}

export const classNames = (...args) => args.filter(Boolean).join(' ')
