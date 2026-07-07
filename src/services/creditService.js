import { create, getAll, getById, updateById, removeById } from './dataService'

const PATH = 'creditApplications'
const SEARCH_FIELDS = ['saleId', 'customerId', 'inquiryId', 'financier', 'branch', 'status']

// Empty document bundle structure. Each key maps to an array of
// { name, url } entries uploaded to Firebase Storage.
export const emptyCreditDocuments = () => ({
  id: [],
  kraPin: [],
  drivingLicense: [],
  guarantors: [],
})

export const creditService = {
  create: (data) =>
    create(PATH, {
      ...data,
      documents: data.documents || emptyCreditDocuments(),
      submittedAt: Date.now(),
      updatedAt: Date.now(),
    }),
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
  getByCustomer: async (customerId) => {
    const all = await getAll(PATH)
    return all.filter((c) => c.customerId === customerId)
  },
  getByInquiry: async (inquiryId) => {
    const all = await getAll(PATH)
    return all.find((c) => c.inquiryId === inquiryId)
  },

  /** Append uploaded files to a specific document category. */
  addDocuments: async (id, category, files) => {
    const app = await getById(PATH, id)
    if (!app) throw new Error('Credit application not found')
    const documents = app.documents || emptyCreditDocuments()
    documents[category] = [...(documents[category] || []), ...files]
    return updateById(PATH, id, { documents, updatedAt: Date.now() })
  },

  /** Remove a single file from a document category by index. */
  removeDocument: async (id, category, index) => {
    const app = await getById(PATH, id)
    if (!app) throw new Error('Credit application not found')
    const documents = app.documents || emptyCreditDocuments()
    documents[category] = (documents[category] || []).filter((_, i) => i !== index)
    return updateById(PATH, id, { documents, updatedAt: Date.now() })
  },
}
