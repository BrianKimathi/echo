import { create, getAll, getById, updateById, removeById, textSearch } from './dataService'
import { workshopService } from './workshopService'
import { ntsaService } from './ntsaService'
import { inventoryService } from './inventoryService'

const PATH = 'sales'
const SEARCH_FIELDS = ['customerId', 'vehicleId', 'salesAgent', 'status', 'paymentMethod']

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
  convertFromInquiry: async ({ inquiry, vehicleId, paymentMethod, price, salesAgent }) => {
    const saleData = {
      customerId: inquiry.customerId,
      vehicleId,
      inquiryId: inquiry.id,
      paymentMethod,
      price,
      salesAgent,
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
}
