import { create, getAll, getById, updateById, removeById, textSearch } from './dataService'
import { uploadImage } from './storageService'

const PATH = 'vehicles'
const SEARCH_FIELDS = ['model', 'color', 'chassisNumber', 'batterySerial', 'motorSerial', 'status']

export const MAX_VEHICLE_IMAGES = 4
export const MIN_VEHICLE_IMAGES = 0

export const inventoryService = {
  create: (data) => create(PATH, { ...data, images: data.images || [], createdAt: Date.now() }),
  getAll: () => getAll(PATH),
  getById: (id) => getById(PATH, id),
  update: (id, data) => updateById(PATH, id, data),
  remove: (id) => removeById(PATH, id),
  search: (items, term) => textSearch(items, SEARCH_FIELDS, term),

  /** Reserve one unit (assign to a sale). Throws if no available stock. */
  reserveUnit: async (id, vehicle) => {
    const qty = Number(vehicle.quantity || 1)
    const reserved = Number(vehicle.reservedQty || 0)
    const sold = Number(vehicle.soldQty || 0)
    const delivered = Number(vehicle.deliveredQty || 0)
    const available = qty - reserved - sold - delivered
    if (available <= 0) throw new Error('No available stock for this vehicle batch')
    return updateById(PATH, id, { reservedQty: reserved + 1 })
  },

  /** Release a reserved unit (unassign from a sale). */
  releaseUnit: async (id, vehicle) => {
    const reserved = Number(vehicle.reservedQty || 0)
    return updateById(PATH, id, { reservedQty: Math.max(reserved - 1, 0) })
  },

  /** Move one unit from Reserved → Sold (invoice raised). */
  markSoldUnit: async (id, vehicle) => {
    const reserved = Number(vehicle.reservedQty || 0)
    const sold = Number(vehicle.soldQty || 0)
    return updateById(PATH, id, { reservedQty: Math.max(reserved - 1, 0), soldQty: sold + 1 })
  },

  /** Move one unit from Sold → Delivered (dispatched). */
  markDeliveredUnit: async (id, vehicle) => {
    const sold = Number(vehicle.soldQty || 0)
    const delivered = Number(vehicle.deliveredQty || 0)
    return updateById(PATH, id, { soldQty: Math.max(sold - 1, 0), deliveredQty: delivered + 1 })
  },

  /** Set procurement/NTSA status on the batch record. */
  clearNTSA: (id) => updateById(PATH, id, { status: 'NTSA Cleared' }),

  /** Upload a single image and add it to the vehicle's images array (max 4). */
  uploadImage: async (id, file, existingImages = []) => {
    if (existingImages.length >= MAX_VEHICLE_IMAGES) {
      throw new Error(`Maximum ${MAX_VEHICLE_IMAGES} images allowed`)
    }
    const url = await uploadImage(`vehicles/${id}`, file)
    return url
  },

  /** Upload multiple images at once (respects the max 4 limit). */
  uploadImages: async (id, files, existingImages = []) => {
    const remaining = MAX_VEHICLE_IMAGES - existingImages.length
    if (remaining <= 0) throw new Error(`Maximum ${MAX_VEHICLE_IMAGES} images already uploaded`)
    const toUpload = Array.from(files).slice(0, remaining)
    const urls = []
    for (const file of toUpload) {
      const url = await uploadImage(`vehicles/${id}`, file)
      urls.push(url)
    }
    return urls
  },

  /** Set the full images array on the vehicle. */
  setImages: (id, images) => updateById(PATH, id, { images }),

  /** Remove an image from the vehicle's images array by index. */
  removeImage: async (id, index, existingImages = []) => {
    const updated = existingImages.filter((_, i) => i !== index)
    await updateById(PATH, id, { images: updated })
    return updated
  },
}
