import { create, getAll, getById, updateById, removeById } from './dataService'

const PATH = 'creditApplications'
const SEARCH_FIELDS = ['saleId', 'financier', 'status']

export const creditService = {
  create: (data) => create(PATH, { ...data, submittedAt: Date.now(), updatedAt: Date.now() }),
  getAll: () => getAll(PATH),
  getById: (id) => getById(PATH, id),
  update: (id, data) => updateById(PATH, id, { ...data, updatedAt: Date.now() }),
  remove: (id) => removeById(PATH, id),
  search: (items, term) => {
    if (!term) return items
    const t = term.toLowerCase()
    return items.filter((i) => SEARCH_FIELDS.some((f) => String(i[f] ?? '').toLowerCase().includes(t)))
  },
  getBySale: async (saleId) => {
    const all = await getAll(PATH)
    return all.find((c) => c.saleId === saleId)
  },
}
