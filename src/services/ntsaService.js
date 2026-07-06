import { create, getAll, getById, updateById, removeById, searchByField } from './dataService'

const PATH = 'ntsaProcesses'
const SEARCH_FIELDS = ['saleId', 'status']

export const ntsaService = {
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
    const items = await searchByField(PATH, 'saleId', saleId)
    return items[0] || null
  },
}
