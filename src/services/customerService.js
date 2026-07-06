import { create, getAll, getById, updateById, removeById, textSearch } from './dataService'

const PATH = 'customers'
const SEARCH_FIELDS = ['name', 'phone', 'email', 'idNumber']

export const customerService = {
  create: (data) => create(PATH, { ...data, createdAt: Date.now() }),
  getAll: () => getAll(PATH),
  getById: (id) => getById(PATH, id),
  update: (id, data) => updateById(PATH, id, data),
  remove: (id) => removeById(PATH, id),
  search: (items, term) => textSearch(items, SEARCH_FIELDS, term),
}
