import { create, getAll, getById, updateById, removeById } from './dataService'

const PATH = 'payments'
const SEARCH_FIELDS = ['saleId', 'reference', 'receiptNumber']

export const paymentService = {
  create: (data) => create(PATH, { ...data, createdAt: Date.now() }),
  getAll: () => getAll(PATH),
  getById: (id) => getById(PATH, id),
  update: (id, data) => updateById(PATH, id, data),
  remove: (id) => removeById(PATH, id),
  search: (items, term) => {
    if (!term) return items
    const t = term.toLowerCase()
    return items.filter((i) => SEARCH_FIELDS.some((f) => String(i[f] ?? '').toLowerCase().includes(t)))
  },
  getBySale: async (saleId) => {
    const all = await getAll(PATH)
    return all.filter((p) => p.saleId === saleId)
  },
  confirm: (id) => updateById(PATH, id, { confirmed: true }),
}
