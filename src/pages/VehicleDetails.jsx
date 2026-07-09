import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  FiArrowLeft, FiEdit2, FiUpload, FiTrash2, FiChevronLeft, FiChevronRight,
  FiPackage, FiCheckCircle, FiTruck, FiShoppingCart, FiArrowRight, FiAlertCircle,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import AppLayout from '../components/layouts/AppLayout'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge, { statusVariant } from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { ButtonLoader, SectionLoader } from '../components/ui/Spinner'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../contexts/AuthContext'
import { inventoryService, MAX_VEHICLE_IMAGES, MIN_VEHICLE_IMAGES } from '../services'
import { VEHICLE_MODELS, VEHICLE_COLORS, VEHICLE_PROCUREMENT_STAGES } from '../constants'
import { formatCurrency, formatDate } from '../utils/helpers'
import { can } from '../utils/permissions'

export default function VehicleDetails() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { data, loading, reload } = useAsync(() => inventoryService.getById(id), [id])
  const [editOpen, setEditOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [lightbox, setLightbox] = useState(null)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  if (loading || !data) {
    return (
      <AppLayout>
        <SectionLoader label="Loading vehicle…" />
      </AppLayout>
    )
  }

  const vehicle = data
  const canManage = can.manageInventory(profile?.role)
  const images = vehicle.images || (vehicle.image ? [vehicle.image] : [])

  // Stock calculations
  const totalQty = Number(vehicle.quantity || 1)
  const reservedQty = Number(vehicle.reservedQty || 0)
  const soldQty = Number(vehicle.soldQty || 0)
  const deliveredQty = Number(vehicle.deliveredQty || 0)
  const availableQty = Math.max(totalQty - reservedQty - soldQty - deliveredQty, 0)

  const openEdit = () => {
    reset(vehicle)
    setEditOpen(true)
  }

  const onSubmit = async (formData) => {
    try {
      await inventoryService.update(id, {
        ...formData,
        price: Number(formData.price),
        quantity: Number(formData.quantity || 1),
      })
      toast.success('Vehicle updated')
      setEditOpen(false)
      reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const advanceNTSA = async () => {
    const idx = VEHICLE_PROCUREMENT_STAGES.indexOf(vehicle.status)
    if (idx < 0 || idx >= VEHICLE_PROCUREMENT_STAGES.length - 1) return
    const next = VEHICLE_PROCUREMENT_STAGES[idx + 1]
    try {
      await inventoryService.update(id, { status: next })
      toast.success(`Marked as ${next}`)
      reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (images.length + files.length > MAX_VEHICLE_IMAGES) {
      toast.error(`Maximum ${MAX_VEHICLE_IMAGES} images allowed. You currently have ${images.length}.`)
      return
    }
    setUploading(true)
    try {
      const urls = await inventoryService.uploadImages(id, files, images)
      const updated = [...images, ...urls]
      await inventoryService.setImages(id, updated)
      toast.success(`${urls.length} image(s) uploaded`)
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemoveImage = async (index) => {
    try {
      const updated = await inventoryService.removeImage(id, index, images)
      toast.success('Image removed')
      if (activeImage >= updated.length) setActiveImage(0)
      reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const prevImage = () => setActiveImage((i) => (i === 0 ? images.length - 1 : i - 1))
  const nextImage = () => setActiveImage((i) => (i === images.length - 1 ? 0 : i + 1))

  const stockCards = [
    { label: 'Total Stock', value: totalQty, icon: FiPackage, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'Available', value: availableQty, icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Reserved', value: reservedQty, icon: FiAlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Sold', value: soldQty, icon: FiShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Delivered', value: deliveredQty, icon: FiTruck, color: 'text-primary', bg: 'bg-primary/5' },
  ]

  const ntsaIdx = VEHICLE_PROCUREMENT_STAGES.indexOf(vehicle.status)
  const canAdvanceNTSA = canManage && ntsaIdx >= 0 && ntsaIdx < VEHICLE_PROCUREMENT_STAGES.length - 1

  return (
    <AppLayout>
      <Link to="/inventory" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary">
        <FiArrowLeft /> Back to Inventory
      </Link>
      <PageHeader
        title={vehicle.model}
        subtitle={`Added ${formatDate(vehicle.createdAt)}`}
        actions={canManage && (
          <button className="btn-outline" onClick={openEdit}>
            <FiEdit2 /> Edit Details
          </button>
        )}
      />

      {/* Stock Summary */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stockCards.map((c) => (
          <div key={c.label} className={`rounded-xl ${c.bg} p-4 text-center`}>
            <c.icon size={20} className={`mx-auto mb-1 ${c.color}`} />
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* NTSA Procurement Status */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400">NTSA / Procurement Status</p>
            <Badge variant={statusVariant(vehicle.status)} className="mt-1">{vehicle.status}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {VEHICLE_PROCUREMENT_STAGES.map((stage, i) => (
              <div key={stage} className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  vehicle.status === stage
                    ? 'bg-primary text-white'
                    : ntsaIdx > i ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {stage}
                </span>
                {i < VEHICLE_PROCUREMENT_STAGES.length - 1 && (
                  <FiArrowRight size={12} className="text-slate-300" />
                )}
              </div>
            ))}
            {canAdvanceNTSA && (
              <button className="btn-primary ml-2" onClick={advanceNTSA} title={`Advance to ${VEHICLE_PROCUREMENT_STAGES[ntsaIdx + 1]}`}>
                <FiArrowRight size={14} /> Advance
              </button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Image Gallery */}
        <Card>
          <div className="relative overflow-hidden rounded-xl bg-slate-50">
            {images.length > 0 ? (
              <>
                <img
                  src={images[activeImage]}
                  alt={`${vehicle.model} ${activeImage + 1}`}
                  className="h-72 w-full cursor-pointer object-cover"
                  onClick={() => setLightbox(images[activeImage])}
                />
                {images.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white">
                      <FiChevronLeft size={18} />
                    </button>
                    <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white">
                      <FiChevronRight size={18} />
                    </button>
                    <span className="absolute bottom-2 right-2 rounded-full bg-slate-900/60 px-2 py-0.5 text-xs text-white">
                      {activeImage + 1} / {images.length}
                    </span>
                  </>
                )}
              </>
            ) : (
              <div className="flex h-72 w-full flex-col items-center justify-center gap-2 text-slate-400">
                <FiUpload size={32} />
                <p className="text-sm">No images yet</p>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={i} className="group relative h-16 w-16">
                <img
                  src={img}
                  alt={`thumb ${i + 1}`}
                  className={`h-16 w-16 cursor-pointer rounded-lg object-cover border-2 ${i === activeImage ? 'border-primary' : 'border-transparent'}`}
                  onClick={() => setActiveImage(i)}
                />
                {canManage && (
                  <button
                    onClick={() => handleRemoveImage(i)}
                    className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                    title="Remove image"
                  >
                    <FiTrash2 size={11} />
                  </button>
                )}
              </div>
            ))}
            {canManage && images.length < MAX_VEHICLE_IMAGES && (
              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-primary hover:text-primary">
                {uploading ? <span className="text-xs">…</span> : <><FiUpload size={18} /><span className="text-[10px]">Add</span></>}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
              </label>
            )}
          </div>
          {canManage && (
            <p className="mt-2 text-xs text-slate-400">
              {images.length} of {MAX_VEHICLE_IMAGES} images {MIN_VEHICLE_IMAGES > 0 ? `(min ${MIN_VEHICLE_IMAGES})` : '(optional)'}
            </p>
          )}
        </Card>

        {/* Specifications */}
        <Card>
          <h3 className="mb-4 font-semibold text-slate-700">Specifications</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Price</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(vehicle.price)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Color</p>
              <p className="text-slate-700">{vehicle.color || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Chassis Number</p>
              <p className="font-mono text-xs text-slate-600">{vehicle.chassisNumber || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Engine Number</p>
              <p className="font-mono text-xs text-slate-600">{vehicle.engineNumber || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Battery Serial</p>
              <p className="font-mono text-xs text-slate-600">{vehicle.batterySerial || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Motor Serial</p>
              <p className="font-mono text-xs text-slate-600">{vehicle.motorSerial || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Registration No.</p>
              <p className="font-mono text-xs text-slate-600">{vehicle.registrationNo || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Date Received</p>
              <p className="text-xs text-slate-600">{vehicle.dateReceivedFromFactory ? formatDate(vehicle.dateReceivedFromFactory) : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">NTSA Booking Date</p>
              <p className="text-xs text-slate-600">{vehicle.ntsaBookingDate ? formatDate(vehicle.ntsaBookingDate) : '-'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="full" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" />
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Vehicle"
        size="lg"
        footer={
          <>
            <button className="btn-outline" onClick={() => setEditOpen(false)}>Cancel</button>
            <button type="submit" form="edit-vehicle" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting && <ButtonLoader />} Update
            </button>
          </>
        }
      >
        <form id="edit-vehicle" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Model</label>
            <select className="input" {...register('model', { required: 'Required' })}>
              {VEHICLE_MODELS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Price (KSH)</label>
            <input type="number" className="input" {...register('price', { required: 'Required' })} />
          </div>
          <div>
            <label className="label">Color</label>
            <select className="input" {...register('color')}>
              {VEHICLE_COLORS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Quantity / Stock</label>
            <input type="number" className="input" {...register('quantity', { required: 'Required', min: 1 })} />
          </div>
          <div>
            <label className="label">Chassis Number</label>
            <input className="input" {...register('chassisNumber')} />
          </div>
          <div>
            <label className="label">Engine Number</label>
            <input className="input" {...register('engineNumber')} />
          </div>
          <div>
            <label className="label">Battery Serial</label>
            <input className="input" {...register('batterySerial')} />
          </div>
          <div>
            <label className="label">Motor Serial</label>
            <input className="input" {...register('motorSerial')} />
          </div>
          <div>
            <label className="label">Registration No.</label>
            <input className="input" {...register('registrationNo')} />
          </div>
          <div>
            <label className="label">Date Received From Factory</label>
            <input type="date" className="input" {...register('dateReceivedFromFactory')} />
          </div>
          <div>
            <label className="label">NTSA Booking Date</label>
            <input type="date" className="input" {...register('ntsaBookingDate')} />
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
