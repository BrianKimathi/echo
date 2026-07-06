import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  FiArrowLeft,
  FiDollarSign,
  FiCheckCircle,
  FiUpload,
  FiFileText,
  FiPrinter,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import AppLayout from '../components/layouts/AppLayout'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge, { statusVariant } from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { ButtonLoader, SectionLoader } from '../components/ui/Spinner'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../contexts/AuthContext'
import {
  saleService,
  customerService,
  inventoryService,
  paymentService,
  creditService,
  workshopService,
  ntsaService,
} from '../services'
import { PAYMENT_METHODS, CREDIT_STATUS, SALE_STATUS } from '../constants'
import { formatCurrency, formatDate, formatDateTime, receiptNumber, saleNumber } from '../utils/helpers'
import { can } from '../utils/permissions'

export default function SaleDetails() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { data, loading, reload } = useAsync(async () => {
    const [sale, customers, vehicles] = await Promise.all([
      saleService.getById(id),
      customerService.getAll(),
      inventoryService.getAll(),
    ])
    const [payments, credit, workshop, ntsa] = await Promise.all([
      paymentService.getBySale(id),
      creditService.getBySale(id),
      workshopService.getBySale(id),
      ntsaService.getBySale(id),
    ])
    return {
      sale,
      customer: customers.find((c) => c.id === sale?.customerId),
      vehicle: vehicles.find((v) => v.id === sale?.vehicleId),
      payments,
      credit,
      workshop,
      ntsa,
    }
  }, [id])

  const [payOpen, setPayOpen] = useState(false)
  const [creditOpen, setCreditOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm()

  if (loading || !data) {
    return (
      <AppLayout>
        <SectionLoader label="Loading sale…" />
      </AppLayout>
    )
  }

  const { sale, customer, vehicle, payments, credit, workshop, ntsa } = data
  if (!sale) {
    return (
      <AppLayout>
        <PageHeader title="Sale Not Found" />
        <Link to="/sales" className="btn-outline">Back</Link>
      </AppLayout>
    )
  }

  const isCash = sale.paymentMethod === 'Cash'
  const paymentConfirmed = payments.some((p) => p.confirmed)
  const canManage = can.manageSales(profile?.role)
  const creditDisbursed = credit?.status === 'Disbursed'

  // ----- Cash workflow -----
  const openPayment = () => {
    reset({
      amount: sale.price,
      paymentMethod: 'Cash',
      reference: '',
      paymentDate: dayjs().format('YYYY-MM-DD'),
    })
    setPayOpen(true)
  }

  const recordPayment = async (formData) => {
    try {
      const rcp = receiptNumber()
      await paymentService.create({
        saleId: id,
        amount: Number(formData.amount),
        paymentMethod: formData.paymentMethod,
        reference: formData.reference,
        paymentDate: formData.paymentDate,
        receiptNumber: rcp,
        confirmed: false,
        recordedBy: profile.uid,
      })
      toast.success('Payment recorded')
      setPayOpen(false)
      reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const confirmPayment = async (payment) => {
    try {
      await paymentService.confirm(payment.id)
      // Trigger workflow: reserve vehicle, create workshop + NTSA
      await saleService.confirmPayment(sale, sale.vehicleId)
      toast.success('Payment confirmed. Workshop & NTSA processes initiated.')
      reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const printReceipt = (payment) => {
    const w = window.open('', '_blank', 'width=400,height=600')
    w.document.write(`
      <html><head><title>Receipt ${payment.receiptNumber}</title>
      <style>
        body{font-family:monospace;padding:20px;font-size:12px}
        h2{margin:0;text-align:center;color:#0B6E4F}
        hr{border:none;border-top:1px dashed #999;margin:10px 0}
        .row{display:flex;justify-content:space-between;margin:4px 0}
      </style></head><body>
      <h2>Tuk-Tuk e-Mobility</h2>
      <p style="text-align:center">Official Receipt</p>
      <hr>
      <div class="row"><span>Receipt No:</span><b>${payment.receiptNumber}</b></div>
      <div class="row"><span>Date:</span><b>${formatDate(payment.paymentDate)}</b></div>
      <div class="row"><span>Customer:</span><b>${customer?.name || '-'}</b></div>
      <div class="row"><span>Vehicle:</span><b>${vehicle?.model || '-'}</b></div>
      <div class="row"><span>Chassis:</span><b>${vehicle?.chassisNumber || '-'}</b></div>
      <hr>
      <div class="row"><span>Amount Paid:</span><b>${formatCurrency(payment.amount)}</b></div>
      <div class="row"><span>Method:</span><b>${payment.paymentMethod}</b></div>
      <div class="row"><span>Reference:</span><b>${payment.reference || '-'}</b></div>
      <hr>
      <p style="text-align:center">Thank you for your business!</p>
      </body></html>`)
    w.document.close()
    w.print()
  }

  // ----- Credit workflow -----
  const openCredit = () => {
    reset({ financier: '', status: 'Pending' })
    setCreditOpen(true)
  }

  const submitCredit = async (formData) => {
    try {
      if (credit) {
        await creditService.update(credit.id, { financier: formData.financier, status: formData.status })
      } else {
        await creditService.create({
          saleId: id,
          financier: formData.financier,
          status: 'Pending',
          documents: [],
        })
      }
      toast.success('Credit application saved')
      setCreditOpen(false)
      reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const updateCreditStatus = async (status) => {
    try {
      await creditService.update(credit.id, { status })
      if (status === 'Disbursed') {
        // Trigger workflow
        await saleService.confirmPayment(sale, sale.vehicleId)
        toast.success('Disbursement recorded. Workshop & NTSA initiated.')
      } else if (status === 'Rejected') {
        await saleService.update(id, { status: 'Payment Pending' })
        toast.success(`Credit ${status.toLowerCase()}`)
      } else {
        toast.success(`Credit ${status.toLowerCase()}`)
      }
      reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const uploadDocs = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    try {
      const { uploadMany } = await import('../services/storageService')
      const docs = await uploadMany(`credit/${id}`, files)
      const existing = credit?.documents || []
      await creditService.update(credit.id, { documents: [...existing, ...docs] })
      toast.success('Documents uploaded')
      reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  // ----- Stage indicators -----
  const stages = [
    { label: 'Payment', done: paymentConfirmed || creditDisbursed },
    { label: 'Workshop', done: workshop?.status === 'Completed' },
    { label: 'NTSA', done: ntsa?.status === 'Completed' },
    { label: 'Dispatch', done: sale.status === 'Completed' },
  ]

  return (
    <AppLayout>
      <Link to="/sales" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary">
        <FiArrowLeft /> Back to Sales
      </Link>
      <PageHeader
        title={`Sale #${sale.id?.slice(-6)}`}
        subtitle={`Created ${formatDateTime(sale.createdAt)}`}
        actions={<Badge variant={statusVariant(sale.status)}>{sale.status}</Badge>}
      />

      {/* Stage progress */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {stages.map((s, i) => (
            <div key={s.label} className="flex flex-1 items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${s.done ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                {s.done ? <FiCheckCircle /> : i + 1}
              </div>
              <div>
                <p className={`text-sm font-medium ${s.done ? 'text-primary' : 'text-slate-500'}`}>{s.label}</p>
                <p className="text-xs text-slate-400">{s.done ? 'Complete' : 'Pending'}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Summary */}
        <Card className="lg:col-span-1">
          <h3 className="mb-4 font-semibold text-slate-700">Sale Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Customer</span>
              {customer && (
                <Link to={`/customers/${customer.id}`} className="font-medium text-primary hover:underline">
                  {customer.name}
                </Link>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Vehicle</span>
              <span className="font-medium text-slate-700">{vehicle?.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Price</span>
              <span className="font-bold text-primary">{formatCurrency(sale.price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Method</span>
              <Badge variant={isCash ? 'green' : 'blue'}>{sale.paymentMethod}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Agent</span>
              <span className="text-slate-700">{sale.salesAgent}</span>
            </div>
          </div>
        </Card>

        {/* Payment / Credit section */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold text-slate-700">
            {isCash ? 'Payment' : 'Credit Application'}
          </h3>

          {isCash ? (
            <div>
              {payments.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-6 text-center">
                  <FiDollarSign size={32} className="mx-auto text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">No payment recorded yet</p>
                  {canManage && !paymentConfirmed && (
                    <button className="btn-primary mt-4" onClick={openPayment}>
                      <FiDollarSign /> Record Payment
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
                      <div>
                        <p className="font-medium text-slate-700">{formatCurrency(p.amount)}</p>
                        <p className="text-xs text-slate-400">
                          {p.paymentMethod} · {p.reference || 'No ref'} · {formatDate(p.paymentDate)}
                        </p>
                        <p className="text-xs text-slate-400">Receipt: {p.receiptNumber}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={p.confirmed ? 'green' : 'amber'}>
                          {p.confirmed ? 'Confirmed' : 'Pending'}
                        </Badge>
                        <button className="btn-ghost p-2" title="Print Receipt" onClick={() => printReceipt(p)}>
                          <FiPrinter size={16} />
                        </button>
                        {canManage && !p.confirmed && (
                          <button className="btn-primary px-3 py-1.5" onClick={() => confirmPayment(p)}>
                            <FiCheckCircle size={14} /> Confirm
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {!credit ? (
                <div className="rounded-xl bg-slate-50 p-6 text-center">
                  <FiFileText size={32} className="mx-auto text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">No credit application submitted</p>
                  {canManage && (
                    <button className="btn-primary mt-4" onClick={openCredit}>
                      <FiFileText /> Submit Application
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
                    <div>
                      <p className="font-medium text-slate-700">{credit.financier || 'No financier'}</p>
                      <p className="text-xs text-slate-400">Submitted {formatDate(credit.submittedAt)}</p>
                    </div>
                    <Badge variant={statusVariant(credit.status)}>{credit.status}</Badge>
                  </div>

                  {/* Documents */}
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-600">Documents</p>
                    {canManage && (
                      <label className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">
                        <FiUpload size={16} /> Upload Documents
                        <input type="file" multiple className="hidden" onChange={uploadDocs} />
                      </label>
                    )}
                    {credit.documents?.length > 0 ? (
                      <div className="space-y-1">
                        {credit.documents.map((d, i) => (
                          <a key={i} href={d.url} target="_blank" rel="noreferrer" className="block rounded-lg bg-slate-50 px-3 py-2 text-sm text-primary hover:underline">
                            📄 {d.name}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">No documents uploaded</p>
                    )}
                  </div>

                  {/* Status actions */}
                  {canManage && credit.status !== 'Disbursed' && credit.status !== 'Rejected' && (
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-outline" onClick={() => updateCreditStatus('Approved')}>Approve</button>
                      <button className="btn-danger" onClick={() => updateCreditStatus('Rejected')}>Reject</button>
                      {credit.status === 'Approved' && (
                        <button className="btn-primary" onClick={() => updateCreditStatus('Disbursed')}>
                          <FiDollarSign /> Record Disbursement
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Workshop & NTSA status */}
        <Card className="lg:col-span-3">
          <h3 className="mb-4 font-semibold text-slate-700">Workflow Status</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-700">Workshop</p>
                <Badge variant={statusVariant(workshop?.status || 'Pending')}>{workshop?.status || 'Pending'}</Badge>
              </div>
              {workshop && (
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>Battery: {workshop.batteryInspection ? '✓' : '○'}</p>
                  <p>Motor: {workshop.motorInspection ? '✓' : '○'}</p>
                  <p>Accessories: {workshop.accessoriesInstalled ? '✓' : '○'}</p>
                </div>
              )}
              {workshop && <Link to="/workshop" className="mt-2 inline-block text-xs text-primary hover:underline">View job →</Link>}
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-700">NTSA</p>
                <Badge variant={statusVariant(ntsa?.status || 'Pending')}>{ntsa?.status || 'Pending'}</Badge>
              </div>
              {ntsa && (
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>Application: {ntsa.applicationSubmitted ? '✓' : '○'}</p>
                  <p>Inspection: {ntsa.inspectionCompleted ? '✓' : '○'}</p>
                  <p>Ownership: {ntsa.ownershipTransferred ? '✓' : '○'}</p>
                  <p>Logbook: {ntsa.logbookIssued ? '✓' : '○'}</p>
                </div>
              )}
              {ntsa && <Link to="/ntsa" className="mt-2 inline-block text-xs text-primary hover:underline">View process →</Link>}
            </div>
          </div>
        </Card>
      </div>

      {/* Payment Modal */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record Payment"
        footer={
          <>
            <button className="btn-outline" onClick={() => setPayOpen(false)}>Cancel</button>
            <button type="submit" form="pay-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting && <ButtonLoader />} Record
            </button>
          </>
        }
      >
        <form id="pay-form" onSubmit={handleSubmit(recordPayment)} className="space-y-4">
          <div>
            <label className="label">Amount (KES)</label>
            <input type="number" className="input" {...register('amount', { required: 'Required', min: 1 })} />
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="input" {...register('paymentMethod')}>
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>M-Pesa</option>
              <option>Cheque</option>
            </select>
          </div>
          <div>
            <label className="label">Reference</label>
            <input className="input" {...register('reference')} placeholder="Transaction code / cheque no." />
          </div>
          <div>
            <label className="label">Payment Date</label>
            <input type="date" className="input" {...register('paymentDate', { required: 'Required' })} />
          </div>
        </form>
      </Modal>

      {/* Credit Modal */}
      <Modal
        open={creditOpen}
        onClose={() => setCreditOpen(false)}
        title="Credit Application"
        footer={
          <>
            <button className="btn-outline" onClick={() => setCreditOpen(false)}>Cancel</button>
            <button type="submit" form="credit-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting && <ButtonLoader />} Submit
            </button>
          </>
        }
      >
        <form id="credit-form" onSubmit={handleSubmit(submitCredit)} className="space-y-4">
          <div>
            <label className="label">Financier</label>
            <input className="input" {...register('financier', { required: 'Required' })} placeholder="e.g. Equity Bank" />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" {...register('status')}>
              {CREDIT_STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
