import { create, getAll, getById, updateById, removeById, textSearch } from './dataService'

const PATH = 'customers'
const SEARCH_FIELDS = ['name', 'phone', 'email', 'idNumber']

export const emptyCustomerDocuments = () => ({
  id: [],
  kraPin: [],
  drivingLicense: [],
  passportPhoto: [],
  guarantors: [],
})

export const customerService = {
  create: (data) => create(PATH, { ...data, createdAt: Date.now() }),
  getAll: () => getAll(PATH),
  getById: (id) => getById(PATH, id),
  update: (id, data) => updateById(PATH, id, data),
  remove: (id) => removeById(PATH, id),
  search: (items, term) => textSearch(SEARCH_FIELDS, term),

  /** Append uploaded files to a specific document category on the customer. */
  addDocuments: async (id, category, files) => {
    const customer = await getById(PATH, id)
    if (!customer) throw new Error('Customer not found')
    const documents = customer.documents || emptyCustomerDocuments()
    documents[category] = [...(documents[category] || []), ...files]
    return updateById(PATH, id, { documents, updatedAt: Date.now() })
  },

  /** Remove a single file from a document category by index. */
  removeDocument: async (id, category, index) => {
    const customer = await getById(PATH, id)
    if (!customer) throw new Error('Customer not found')
    const documents = customer.documents || emptyCustomerDocuments()
    documents[category] = (documents[category] || []).filter((_, i) => i !== index)
    return updateById(PATH, id, { documents, updatedAt: Date.now() })
  },
}
