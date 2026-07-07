import { create, getAll, getById, updateById, removeById, textSearch } from './dataService'
import { workshopService } from './workshopService'
import { ntsaService } from './ntsaService'
import { inventoryService } from './inventoryService'
import { VAT_RATE } from '../constants'

const PATH = 'sales'
const SEARCH_FIELDS = ['customerId', 'vehicleId', 'salesAgent', 'status', 'paymentMethod', 'invoiceNumber', 'registrationNo']

export const saleService = {
  create: (data) => create(PATH, { ...data, createdAt: Date.now() }),
  getAll: () => getAll(PATH),
  getById: (id) => getById(PATH, id),
  update: (id, data) => updateById(PATH, id, data),
  remove: (id) => removeById(PATH, id),
  search: (items, term) => textSearch(items, SEARCH_FIELDS, term),

  /**
   * Convert an inquiry into a sale. Reserves the vehicle and updates inquiry status.
   * Payment confirmation triggers workshop + NTSA creation (see confirmPayment).
   */
  convertFromInquiry: async ({ inquiry, vehicleId, paymentMethod, price, salesAgent, branch }) => {
    const saleData = {
      customerId: inquiry.customerId,
      vehicleId,
      inquiryId: inquiry.id,
      paymentMethod,
      price,
      salesAgent,
      branch: branch || '',
      status: 'Payment Pending',
    }
    const saleId = await create(PATH, { ...saleData, createdAt: Date.now() })
    await inventoryService.reserve(vehicleId)
    return saleId
  },

  /**
   * After payment is confirmed: reserve vehicle, create workshop job + NTSA process,
   * and advance the sale to 'Workshop'.
   */
  confirmPayment: async (sale, vehicleId) => {
    await inventoryService.update(vehicleId, { status: 'Reserved' })
    await workshopService.create({
      saleId: sale.id,
      batteryInspection: false,
      motorInspection: false,
      accessoriesInstalled: false,
      remarks: '',
      status: 'Pending',
      completedBy: '',
    })
    await ntsaService.create({
      saleId: sale.id,
      applicationSubmitted: false,
      inspectionCompleted: false,
      ownershipTransferred: false,
      logbookIssued: false,
      status: 'Pending',
    })
    await updateById(PATH, sale.id, { status: 'Payment Confirmed' })
    // advance to workshop stage
    await updateById(PATH, sale.id, { status: 'Workshop' })
  },

  completeHandover: async (saleId, vehicleId) => {
    await updateById(PATH, saleId, { status: 'Completed', completedAt: Date.now() })
    await inventoryService.update(vehicleId, { status: 'Delivered' })
  },

  /**
   * Save the sale's invoice details (registration no, VAT, etc.) and stamp
   * an invoice number if one is not already present. Returns the updated sale.
   */
  saveInvoice: async (saleId, { registrationNo, vatRate = VAT_RATE, invoiceNumber }) => {
    const sale = await getById(PATH, saleId)
    if (!sale) throw new Error('Sale not found')
    const price = Number(sale.price || 0)
    const vatAmount = Math.round(price * vatRate)
    const payload = {
      registrationNo: registrationNo || sale.registrationNo || '',
      vatRate,
      vatAmount,
      totalAmount: price + vatAmount,
      invoiceNumber: invoiceNumber || sale.invoiceNumber,
      invoicedAt: sale.invoicedAt || Date.now(),
    }
    await updateById(PATH, saleId, payload)
    return { ...sale, ...payload }
  },
}
