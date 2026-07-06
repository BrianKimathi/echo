import { create, getAll, getById, updateById, removeById, textSearch } from './dataService'

const PATH = 'inquiries'
const SEARCH_FIELDS = ['customerId', 'vehicleId', 'salesAgent', 'status', 'notes']

export const inquiryService = {
  create: (data) => create(PATH, { ...data, createdAt: Date.now() }),
  getAll: () => getAll(PATH),
  getById: (id) => getById(PATH, id),
  update: (id, data) => updateById(PATH, id, data),
  remove: (id) => removeById(PATH, id),
  search: (items, term) => textSearch(items, SEARCH_FIELDS, term),
}
