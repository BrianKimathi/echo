import { useParams, Link } from 'react-router-dom'
import { FiArrowLeft, FiEdit2, FiPhone, FiMail, FiMapPin, FiUser } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useState } from 'react'
import AppLayout from '../components/layouts/AppLayout'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { ButtonLoader, SectionLoader } from '../components/ui/Spinner'
import { useAsync } from '../hooks/useAsync'
import { customerService, inquiryService, saleService } from '../services'
import { CUSTOMER_TYPES } from '../constants'
import { formatCurrency, formatDate } from '../utils/helpers'
import { useForm } from 'react-hook-form'

export default function CustomerDetails() {
  const { id } = useParams()
  const { data, loading, reload } = useAsync(async () => {
    const [customer, inquiries, sales] = await Promise.all([
      customerService.getById(id),
      inquiryService.getAll(),
      saleService.getAll(),
    ])
    return {
      customer,
      inquiries: inquiries.filter((i) => i.customerId === id),
      sales: sales.filter((s) => s.customerId === id),
    }
  }, [id])

  const [editOpen, setEditOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  if (loading || !data) {
    return (
      <AppLayout>
        <SectionLoader label="Loading customer…" />
      </AppLayout>
    )
  }

  const { customer, inquiries, sales } = data
  if (!customer) {
    return (
      <AppLayout>
        <PageHeader title="Customer Not Found" />
        <Link to="/customers" className="btn-outline">Back to Customers</Link>
      </AppLayout>
    )
  }

  const openEdit = () => {
    reset(customer)
    setEditOpen(true)
  }

  const onSubmit = async (formData) => {
    try {
      await customerService.update(id, formData)
      toast.success('Customer updated')
      setEditOpen(false)
      reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <AppLayout>
      <Link to="/customers" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary">
        <FiArrowLeft /> Back to Customers
      </Link>
      <PageHeader
        title={customer.name}
        subtitle={`Customer since ${formatDate(customer.createdAt)}`}
        actions={
          <button className="btn-outline" onClick={openEdit}>
            <FiEdit2 /> Edit
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
              {customer.name?.charAt(0).toUpperCase()}
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-800">{customer.name}</h3>
            <Badge variant="secondary" className="mt-1">{customer.customerType}</Badge>
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <FiPhone className="text-slate-400" /> {customer.phone || '-'}
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <FiMail className="text-slate-400" /> {customer.email || '-'}
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <FiUser className="text-slate-400" /> ID: {customer.idNumber || '-'}
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <FiMapPin className="text-slate-400" /> {customer.address || '-'}
            </div>
          </div>
          {customer.notes && (
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{customer.notes}</div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold text-slate-700">Inquiries ({inquiries.length})</h3>
          {inquiries.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No inquiries</p>
          ) : (
            <div className="space-y-2">
              {inquiries.map((inq) => (
                <Link
                  key={inq.id}
                  to={`/inquiries/${inq.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">Inquiry #{inq.id?.slice(-6)}</p>
                    <p className="text-xs text-slate-400">{formatDate(inq.createdAt)}</p>
                  </div>
                  <Badge variant="blue">{inq.status}</Badge>
                </Link>
              ))}
            </div>
          )}

          <h3 className="mb-4 mt-6 font-semibold text-slate-700">Sales ({sales.length})</h3>
          {sales.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No sales</p>
          ) : (
            <div className="space-y-2">
              {sales.map((s) => (
                <Link
                  key={s.id}
                  to={`/sales/${s.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">Sale #{s.id?.slice(-6)}</p>
                    <p className="text-xs text-slate-400">{formatCurrency(s.price)} · {formatDate(s.createdAt)}</p>
                  </div>
                  <Badge variant="green">{s.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Customer"
        size="lg"
        footer={
          <>
            <button className="btn-outline" onClick={() => setEditOpen(false)}>Cancel</button>
            <button type="submit" form="edit-customer" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting && <ButtonLoader />} Update
            </button>
          </>
        }
      >
        <form id="edit-customer" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Full Name</label>
            <input className="input" {...register('name', { required: 'Required' })} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" {...register('phone', { required: 'Required' })} />
          </div>
          <div>
            <label className="label">ID Number</label>
            <input className="input" {...register('idNumber')} />
          </div>
          <div>
            <label className="label">Customer Type</label>
            <select className="input" {...register('customerType')}>
              {CUSTOMER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" {...register('email')} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" {...register('address')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea rows={3} className="input" {...register('notes')} />
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
