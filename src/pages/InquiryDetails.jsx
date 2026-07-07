import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { FiArrowLeft, FiCheckCircle, FiArrowRight } from 'react-icons/fi'
import toast from 'react-hot-toast'
import AppLayout from '../components/layouts/AppLayout'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge, { statusVariant } from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { ButtonLoader, SectionLoader } from '../components/ui/Spinner'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../contexts/AuthContext'
import {
  inquiryService,
  customerService,
  inventoryService,
  saleService,
  settingsService,
} from '../services'
import { INQUIRY_STATUS, PAYMENT_METHODS } from '../constants'
import { formatCurrency, formatDate } from '../utils/helpers'

export default function InquiryDetails() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { data, loading, reload } = useAsync(async () => {
    const [inquiry, customers, vehicles, settings] = await Promise.all([
      inquiryService.getById(id),
      customerService.getAll(),
      inventoryService.getAll(),
      settingsService.getAll(),
    ])
    return {
      inquiry,
      customer: customers.find((c) => c.id === inquiry?.customerId),
      vehicle: vehicles.find((v) => v.id === inquiry?.vehicleId),
      vehicles,
      settings,
    }
  }, [id])

  const [statusOpen, setStatusOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm()

  if (loading || !data) {
    return (
      <AppLayout>
        <SectionLoader label="Loading inquiry…" />
      </AppLayout>
    )
  }

  const { inquiry, customer, vehicle, vehicles, settings } = data
  if (!inquiry) {
    return (
      <AppLayout>
        <PageHeader title="Inquiry Not Found" />
        <Link to="/inquiries" className="btn-outline">Back</Link>
      </AppLayout>
    )
  }

  const updateStatus = async (status) => {
    try {
      await inquiryService.update(id, { status })
      toast.success(`Status updated to ${status}`)
      setStatusOpen(false)
      reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const openConvert = () => {
    reset({
      vehicleId: inquiry.vehicleId,
      paymentMethod: 'Cash',
      price: vehicle?.price || 0,
      branch: settings?.branches?.[0] || '',
    })
    setConvertOpen(true)
  }

  const doConvert = async (formData) => {
    try {
      const saleId = await saleService.convertFromInquiry({
        inquiry,
        vehicleId: formData.vehicleId,
        paymentMethod: formData.paymentMethod,
        price: Number(formData.price),
        salesAgent: inquiry.salesAgent,
        branch: formData.branch,
      })
      await inquiryService.update(id, { status: 'Converted', saleId })
      toast.success('Inquiry converted to sale')
      setConvertOpen(false)
      window.location.href = `/sales/${saleId}`
    } catch (e) {
      toast.error(e.message)
    }
  }

  const timeline = INQUIRY_STATUS
  const currentIdx = timeline.indexOf(inquiry.status)

  return (
    <AppLayout>
      <Link to="/inquiries" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary">
        <FiArrowLeft /> Back to Inquiries
      </Link>
      <PageHeader
        title={`Inquiry #${inquiry.id?.slice(-6)}`}
        subtitle={`Created ${formatDate(inquiry.createdAt)}`}
        actions={
          inquiry.status !== 'Converted' && inquiry.status !== 'Cancelled' ? (
            <>
              <button className="btn-outline" onClick={() => setStatusOpen(true)}>
                Update Status
              </button>
              <button className="btn-primary" onClick={openConvert}>
                <FiArrowRight /> Convert to Sale
              </button>
            </>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold text-slate-700">Inquiry Timeline</h3>
          <div className="flex items-center justify-between">
            {timeline.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                    i <= currentIdx ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {i < currentIdx ? <FiCheckCircle /> : i + 1}
                </div>
                <p className={`mt-2 text-xs ${i <= currentIdx ? 'text-primary' : 'text-slate-400'}`}>{s}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Badge variant={statusVariant(inquiry.status)}>{inquiry.status}</Badge>
          </div>

          {inquiry.notes && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{inquiry.notes}</div>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-slate-700">Details</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Customer</p>
              {customer ? (
                <Link to={`/customers/${customer.id}`} className="font-medium text-primary hover:underline">
                  {customer.name}
                </Link>
              ) : (
                <p className="text-slate-500">—</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400">Vehicle</p>
              {vehicle && (
                <Link to={`/inventory/${vehicle.id}`} className="font-medium text-primary hover:underline">
                  {vehicle.model} ({vehicle.color})
                </Link>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400">Sales Agent</p>
              <p className="text-slate-700">{inquiry.salesAgent}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Price</p>
              <p className="text-slate-700">{formatCurrency(vehicle?.price)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Update Status"
        footer={
          <>
            <button className="btn-outline" onClick={() => setStatusOpen(false)}>Cancel</button>
          </>
        }
      >
        <div className="space-y-2">
          {INQUIRY_STATUS.map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className={`flex w-full items-center justify-between rounded-xl border p-3 text-sm transition hover:bg-slate-50 ${
                inquiry.status === s ? 'border-primary bg-primary-50' : 'border-slate-100'
              }`}
            >
              <span className="font-medium text-slate-700">{s}</span>
              {inquiry.status === s && <FiCheckCircle className="text-primary" />}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        title="Convert to Sale"
        size="md"
        footer={
          <>
            <button className="btn-outline" onClick={() => setConvertOpen(false)}>Cancel</button>
            <button type="submit" form="convert-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting && <ButtonLoader />} Convert
            </button>
          </>
        }
      >
        <form id="convert-form" onSubmit={handleSubmit(doConvert)} className="space-y-4">
          <div>
            <label className="label">Vehicle</label>
            <select className="input" {...register('vehicleId', { required: 'Required' })}>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.model} — {v.color} ({v.status})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="input" {...register('paymentMethod')}>
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Branch</label>
            <select className="input" {...register('branch', { required: 'Required' })}>
              <option value="">Select branch</option>
              {(settings?.branches || []).map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Price (KES)</label>
            <input type="number" className="input" {...register('price', { required: 'Required', min: 1 })} />
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
