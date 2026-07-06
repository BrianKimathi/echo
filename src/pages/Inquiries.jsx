import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { FiPlus, FiEye, FiArrowRight } from 'react-icons/fi'
import toast from 'react-hot-toast'
import AppLayout from '../components/layouts/AppLayout'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Badge, { statusVariant } from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { ButtonLoader } from '../components/ui/Spinner'
import { useAsyncList } from '../hooks/useAsync'
import { useAuth } from '../contexts/AuthContext'
import { inquiryService, customerService, inventoryService, saleService } from '../services'
import { INQUIRY_STATUS } from '../constants'
import { formatDate } from '../utils/helpers'

export default function Inquiries() {
  const { profile } = useAuth()
  const { items, loading, reload } = useAsyncList(() => inquiryService.getAll())
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  useEffect(() => {
    Promise.all([customerService.getAll(), inventoryService.getAll()]).then(([c, v]) => {
      setCustomers(c)
      setVehicles(v)
    })
  }, [])

  const openCreate = () => {
    reset({
      customerId: '',
      vehicleId: '',
      salesAgent: profile?.name || '',
      status: 'New',
      notes: '',
    })
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      await inquiryService.create({ ...data, salesAgentId: profile.uid })
      toast.success('Inquiry created')
      setModalOpen(false)
      reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const customerName = (id) => customers.find((c) => c.id === id)?.name || '—'
  const vehicleModel = (id) => {
    const v = vehicles.find((x) => x.id === id)
    return v ? `${v.model} (${v.chassisNumber || v.id?.slice(-4)})` : '—'
  }

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Inquiries" />
        <div className="card p-8 text-center text-slate-400">Loading…</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader
        title="Inquiries"
        subtitle={`${items.length} inquiry${items.length !== 1 ? 'ies' : ''}`}
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <FiPlus /> New Inquiry
          </button>
        }
      />

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No inquiries yet"
            subtitle="Create an inquiry to track a customer's interest in a vehicle."
            action={
              <button className="btn-primary" onClick={openCreate}>
                <FiPlus /> New Inquiry
              </button>
            }
          />
        </div>
      ) : (
        <DataTable
          columns={[
            { key: 'id', label: 'Inquiry' },
            { key: 'customerId', label: 'Customer' },
            { key: 'vehicleId', label: 'Vehicle' },
            { key: 'salesAgent', label: 'Agent' },
            { key: 'status', label: 'Status' },
            { key: 'createdAt', label: 'Date' },
            { key: 'actions', label: '' },
          ]}
          data={items}
          searchKeys={['salesAgent', 'status', 'notes']}
          searchPlaceholder="Search inquiries…"
          renderRow={(inq) => (
            <tr key={inq.id}>
              <td className="font-mono text-xs text-slate-500">#{inq.id?.slice(-6)}</td>
              <td>
                <Link to={`/customers/${inq.customerId}`} className="font-medium text-primary hover:underline">
                  {customerName(inq.customerId)}
                </Link>
              </td>
              <td className="text-slate-600">{vehicleModel(inq.vehicleId)}</td>
              <td className="text-slate-600">{inq.salesAgent}</td>
              <td>
                <Badge variant={statusVariant(inq.status)}>{inq.status}</Badge>
              </td>
              <td className="text-slate-500">{formatDate(inq.createdAt)}</td>
              <td>
                <div className="flex justify-end">
                  <Link to={`/inquiries/${inq.id}`} className="btn-ghost p-2" title="View">
                    <FiEye size={16} />
                  </Link>
                </div>
              </td>
            </tr>
          )}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Inquiry"
        size="lg"
        footer={
          <>
            <button className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" form="inquiry-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting && <ButtonLoader />} Create
            </button>
          </>
        }
      >
        <form id="inquiry-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Customer</label>
            <select className="input" {...register('customerId', { required: 'Customer is required' })}>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
              ))}
            </select>
            {errors.customerId && <p className="mt-1 text-xs text-red-500">{errors.customerId.message}</p>}
          </div>
          <div>
            <label className="label">Vehicle</label>
            <select className="input" {...register('vehicleId', { required: 'Vehicle is required' })}>
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.model} — {v.color} ({v.chassisNumber || v.id?.slice(-4)}) · {v.status}
                </option>
              ))}
            </select>
            {errors.vehicleId && <p className="mt-1 text-xs text-red-500">{errors.vehicleId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Sales Agent</label>
              <input className="input" {...register('salesAgent', { required: 'Required' })} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" {...register('status')}>
                {INQUIRY_STATUS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea rows={3} className="input" {...register('notes')} />
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
