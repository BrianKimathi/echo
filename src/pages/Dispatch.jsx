import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { FiPackage, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import AppLayout from '../components/layouts/AppLayout'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge, { statusVariant } from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { ButtonLoader } from '../components/ui/Spinner'
import { useAsyncList } from '../hooks/useAsync'
import { useAuth } from '../contexts/AuthContext'
import {
  saleService,
  customerService,
  inventoryService,
  paymentService,
  workshopService,
  ntsaService,
  dispatchService,
} from '../services'
import { formatCurrency, formatDate } from '../utils/helpers'
import { can } from '../utils/permissions'

export default function Dispatch() {
  const { profile } = useAuth()
  const { items: dispatchOrders, loading, reload } = useAsyncList(() => dispatchService.getAll())
  const [sales, setSales] = useState([])
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [payments, setPayments] = useState([])
  const [workshops, setWorkshops] = useState([])
  const [ntsa, setNtsa] = useState([])
  const [handoverOpen, setHandoverOpen] = useState(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm()
  const canManage = can.manageDispatch(profile?.role)

  useEffect(() => {
    Promise.all([
      saleService.getAll(),
      customerService.getAll(),
      inventoryService.getAll(),
      paymentService.getAll(),
      workshopService.getAll(),
      ntsaService.getAll(),
    ]).then(([s, c, v, p, w, n]) => {
      setSales(s)
      setCustomers(c)
      setVehicles(v)
      setPayments(p)
      setWorkshops(w)
      setNtsa(n)
    })
  }, [])

  // Sales that are ready for dispatch (or already dispatched)
  const dispatchableSales = sales.filter((s) =>
    ['Ready for Dispatch', 'Completed'].includes(s.status),
  )

  const getChecks = (sale) => {
    const salePayments = payments.filter((p) => p.saleId === sale.id)
    const paymentOk = salePayments.some((p) => p.confirmed)
    const ws = workshops.find((w) => w.saleId === sale.id)
    const wsOk = ws?.status === 'Completed'
    const nt = ntsa.find((n) => n.saleId === sale.id)
    const ntOk = nt?.status === 'Completed'
    const order = dispatchOrders.find((d) => d.saleId === sale.id)
    return { paymentOk, wsOk, ntOk, order, allOk: paymentOk && wsOk && ntOk }
  }

  const saleInfo = (sale) => {
    const customer = customers.find((c) => c.id === sale.customerId)?.name || '—'
    const vehicle = vehicles.find((v) => v.id === sale.vehicleId)
    return { customer, vehicle: vehicle ? `${vehicle.model} (${vehicle.color})` : '—' }
  }

  const openHandover = (sale) => {
    reset({ deliveryDate: dayjs().format('YYYY-MM-DD'), receivedBy: '', remarks: '' })
    setHandoverOpen(sale)
  }

  const completeHandover = async (formData) => {
    try {
      await dispatchService.create({
        saleId: handoverOpen.id,
        deliveryDate: formData.deliveryDate,
        receivedBy: formData.receivedBy,
        remarks: formData.remarks,
        completed: true,
        completedAt: Date.now(),
      })
      await saleService.completeHandover(handoverOpen.id, handoverOpen.vehicleId)
      toast.success('Vehicle handed over. Sale completed!')
      setHandoverOpen(null)
      reload()
      window.location.reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Dispatch" />
        <div className="card p-8 text-center text-slate-400">Loading…</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader
        title="Dispatch"
        subtitle={`${dispatchableSales.length} sale${dispatchableSales.length !== 1 ? 's' : ''} ready for dispatch`}
      />

      {dispatchableSales.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FiPackage}
            title="No dispatchable sales"
            subtitle="Sales become ready for dispatch when payment is confirmed, workshop is complete, and NTSA is complete."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {dispatchableSales.map((sale) => {
            const info = saleInfo(sale)
            const checks = getChecks(sale)
            return (
              <Card key={sale.id}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <Link to={`/sales/${sale.id}`} className="font-medium text-primary hover:underline">
                      Sale #{sale.id?.slice(-6)}
                    </Link>
                    <p className="text-sm text-slate-500">{info.customer} · {info.vehicle}</p>
                  </div>
                  <Badge variant={statusVariant(sale.status)}>{sale.status}</Badge>
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'Payment Confirmed', ok: checks.paymentOk },
                    { label: 'Workshop Completed', ok: checks.wsOk },
                    { label: 'NTSA Completed', ok: checks.ntOk },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-600">{c.label}</span>
                      {c.ok ? (
                        <span className="flex items-center gap-1 text-green-600"><FiCheckCircle size={16} /> Done</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500"><FiXCircle size={16} /> Pending</span>
                      )}
                    </div>
                  ))}
                </div>

                {checks.order ? (
                  <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                    <FiCheckCircle className="inline" /> Handed over on {formatDate(checks.order.completedAt)} · Received by {checks.order.receivedBy}
                  </div>
                ) : (
                  canManage && (
                    <button
                      className="btn-primary mt-4 w-full"
                      disabled={!checks.allOk}
                      onClick={() => openHandover(sale)}
                    >
                      <FiPackage /> {checks.allOk ? 'Complete Handover' : 'Awaiting prerequisites'}
                    </button>
                  )
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={!!handoverOpen}
        onClose={() => setHandoverOpen(null)}
        title="Complete Vehicle Handover"
        footer={
          <>
            <button className="btn-outline" onClick={() => setHandoverOpen(null)}>Cancel</button>
            <button type="submit" form="handover-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting && <ButtonLoader />} Confirm Handover
            </button>
          </>
        }
      >
        <form id="handover-form" onSubmit={handleSubmit(completeHandover)} className="space-y-4">
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            This will mark the sale as <b>Completed</b> and the vehicle as <b>Delivered</b>.
          </div>
          <div>
            <label className="label">Delivery Date</label>
            <input type="date" className="input" {...register('deliveryDate', { required: 'Required' })} />
          </div>
          <div>
            <label className="label">Received By</label>
            <input className="input" {...register('receivedBy', { required: 'Required' })} placeholder="Recipient name" />
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea rows={3} className="input" {...register('remarks')} />
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
