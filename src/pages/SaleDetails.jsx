import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  FiArrowLeft,
  FiDollarSign,
  FiCheckCircle,
  FiUpload,
  FiFileText,
  FiPrinter,
  FiTrash2,
  FiUser,
  FiLink as FiLinkIcon,
  FiMapPin,
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
  inquiryService,
  paymentService,
  creditService,
  workshopService,
  ntsaService,
  settingsService,
  uploadMany,
} from '../services'
import { CREDIT_STATUS, CREDIT_DOCUMENT_TYPES, VAT_RATE } from '../constants'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  receiptNumber,
  invoiceNumber,
  deliveryNoteNumber,
  computeVat,
} from '../utils/helpers'
import { can } from '../utils/permissions'

export default function SaleDetails() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { data, loading, reload } = useAsync(async () => {
    const [sale, customers, vehicles, inquiries, settings] = await Promise.all([
      saleService.getById(id),
      customerService.getAll(),
      inventoryService.getAll(),
      inquiryService.getAll(),
      settingsService.getAll(),
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
      inquiry: inquiries.find((i) => i.id === sale?.inquiryId),
      payments,
      credit,
      workshop,
      ntsa,
      settings,
    }
  }, [id])

  const [payOpen, setPayOpen] = useState(false)
  const [creditOpen, setCreditOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
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

  const { sale, customer, vehicle, inquiry, payments, credit, workshop, ntsa, settings } = data
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
  const financiers = settings?.financiers || []
  const branches = settings?.branches || []
  const creditDocs = credit?.documents || {}

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
    reset({
      financier: credit?.financier || '',
      status: credit?.status || 'Pending',
    })
    setCreditOpen(true)
  }

  const submitCredit = async (formData) => {
    try {
      const payload = {
        saleId: id,
        customerId: sale.customerId,
        inquiryId: sale.inquiryId || '',
        financier: formData.financier,
        status: credit?.status || 'Pending',
      }
      if (credit) {
        await creditService.update(credit.id, payload)
      } else {
        await creditService.create(payload)
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

  // ----- Categorized document upload (Firebase Storage) -----
  const uploadDocs = async (category, e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !credit) return
    setUploading(true)
    try {
      const uploaded = await uploadMany(`credit/${id}/${category}`, files)
      await creditService.addDocuments(credit.id, category, uploaded)
      toast.success('Documents uploaded')
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeDoc = async (category, index) => {
    try {
      await creditService.removeDocument(credit.id, category, index)
      toast.success('Document removed')
      reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  // ----- Invoice -----
  const openInvoice = () => {
    const vat = computeVat(sale.price, VAT_RATE)
    reset({
      registrationNo: sale.registrationNo || vehicle?.registrationNo || '',
      branch: sale.branch || '',
      vatRate: VAT_RATE,
      invoiceNumber: sale.invoiceNumber || invoiceNumber(),
      invoiceDate: sale.invoicedAt ? dayjs(sale.invoicedAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
    })
    setInvoiceOpen(true)
  }

  const saveInvoice = async (formData) => {
    try {
      await saleService.saveInvoice(id, {
        registrationNo: formData.registrationNo,
        invoiceNumber: formData.invoiceNumber,
        vatRate: Number(formData.vatRate),
      })
      // Also stamp the registration no + branch on the vehicle for record-keeping
      if (vehicle) {
        await inventoryService.update(vehicle.id, {
          registrationNo: formData.registrationNo,
        })
      }
      toast.success('Invoice generated')
      setInvoiceOpen(false)
      reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const printInvoice = () => {
    const price = Number(sale.price || 0)
    const rate = sale.vatRate ?? VAT_RATE
    const vat = computeVat(price, rate)
    const total = price + vat
    const w = window.open('', '_blank', 'width=800,height=900')
    w.document.write(`
      <html><head><title>Invoice ${sale.invoiceNumber || ''}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#0f172a}
        h1{color:#0B6E4F;margin:0}
        .head{display:flex;justify-content:space-between;border-bottom:2px solid #0B6E4F;padding-bottom:12px;margin-bottom:16px}
        .muted{color:#64748b;font-size:13px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{padding:8px 6px;text-align:left;font-size:13px;border-bottom:1px solid #e2e8f0}
        th{background:#f1f5f9}
        .tot{display:flex;justify-content:space-between;font-size:13px;margin:4px 0}
        .grand{font-weight:bold;font-size:16px;border-top:2px solid #0B6E4F;padding-top:8px;margin-top:8px}
      </style></head><body>
      <div class="head">
        <div>
          <h1>Tuk-Tuk e-Mobility</h1>
          <p class="muted">${sale.branch || '-'} Branch</p>
        </div>
        <div style="text-align:right">
          <p style="font-size:18px;font-weight:bold">INVOICE</p>
          <p class="muted">${sale.invoiceNumber || '-'}</p>
          <p class="muted">Date: ${sale.invoicedAt ? formatDate(sale.invoicedAt) : formatDate(Date.now())}</p>
        </div>
      </div>
      <div style="margin-bottom:16px">
        <p class="muted">Bill To</p>
        <p style="font-weight:bold">${customer?.name || '-'}</p>
        <p class="muted">${customer?.phone || ''} ${customer?.email ? '· ' + customer.email : ''}</p>
        <p class="muted">${customer?.address || ''}</p>
      </div>
      <table>
        <thead><tr><th>Description</th><th>Reg. No.</th><th>Chassis No.</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          <tr>
            <td>${vehicle?.model || '-'} (${vehicle?.color || ''})</td>
            <td>${sale.registrationNo || vehicle?.registrationNo || '-'}</td>
            <td>${vehicle?.chassisNumber || '-'}</td>
            <td style="text-align:right">${formatCurrency(price)}</td>
          </tr>
        </tbody>
      </table>
      <div style="max-width:300px;margin-left:auto;margin-top:16px">
        <div class="tot"><span>Subtotal</span><span>${formatCurrency(price)}</span></div>
        <div class="tot"><span>VAT (${(rate * 100).toFixed(0)}%)</span><span>${formatCurrency(vat)}</span></div>
        <div class="tot grand"><span>Total</span><span>${formatCurrency(total)}</span></div>
      </div>
      <p class="muted" style="margin-top:30px">Payment method: ${sale.paymentMethod}</p>
      <p class="muted">Thank you for your business!</p>
      </body></html>`)
    w.document.close()
    w.print()
  }

  const printDeliveryNote = () => {
    const w = window.open('', '_blank', 'width=800,height=900')
    w.document.write(`
      <html><head><title>Delivery Note ${sale.deliveryNoteNumber || deliveryNoteNumber()}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#0f172a}
        h1{color:#0B6E4F;margin:0}
        .head{display:flex;justify-content:space-between;border-bottom:2px solid #0B6E4F;padding-bottom:12px;margin-bottom:16px}
        .muted{color:#64748b;font-size:13px}
        .row{display:flex;justify-content:space-between;margin:6px 0;font-size:14px}
        .box{border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:12px 0}
        .sign{display:flex;justify-content:space-between;margin-top:60px;font-size:13px}
        .sign div{border-top:1px solid #475569;padding-top:4px;width:40%}
      </style></head><body>
      <div class="head">
        <div>
          <h1>Tuk-Tuk e-Mobility</h1>
          <p class="muted">${sale.branch || '-'} Branch</p>
        </div>
        <div style="text-align:right">
          <p style="font-size:18px;font-weight:bold">DELIVERY NOTE</p>
          <p class="muted">${sale.deliveryNoteNumber || deliveryNoteNumber()}</p>
          <p class="muted">Date: ${formatDate(Date.now())}</p>
        </div>
      </div>
      <div class="box">
        <div class="row"><span>Delivered To:</span><b>${customer?.name || '-'}</b></div>
        <div class="row"><span>Phone:</span><span>${customer?.phone || '-'}</span></div>
        <div class="row"><span>ID Number:</span><span>${customer?.idNumber || '-'}</span></div>
      </div>
      <div class="box">
        <div class="row"><span>Vehicle Model:</span><b>${vehicle?.model || '-'}</b></div>
        <div class="row"><span>Registration No.:</span><span>${sale.registrationNo || vehicle?.registrationNo || '-'}</span></div>
        <div class="row"><span>Chassis No.:</span><span>${vehicle?.chassisNumber || '-'}</span></div>
        <div class="row"><span>Color:</span><span>${vehicle?.color || '-'}</span></div>
        <div class="row"><span>Battery Serial:</span><span>${vehicle?.batterySerial || '-'}</span></div>
        <div class="row"><span>Motor Serial:</span><span>${vehicle?.motorSerial || '-'}</span></div>
      </div>
      <p class="muted">This is to acknowledge that the above vehicle has been delivered to the customer in good condition, with all accessories and documentation complete.</p>
      <div class="sign">
        <div>Received By (Customer)</div>
        <div>Authorised By (Tuk-Tuk e-Mobility)</div>
      </div>
      </body></html>`)
    w.document.close()
    w.print()
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
        actions={
          <div className="flex items-center gap-2">
            {canManage && (
              <button className="btn-outline" onClick={openInvoice}>
                <FiFileText /> Invoice
              </button>
            )}
            <button className="btn-outline" onClick={printDeliveryNote}>
              <FiPrinter /> Delivery Note
            </button>
            {sale.invoiceNumber && (
              <button className="btn-outline" onClick={printInvoice}>
                <FiPrinter /> Print Invoice
              </button>
            )}
            <Badge variant={statusVariant(sale.status)}>{sale.status}</Badge>
          </div>
        }
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
              <span className="text-slate-400">VAT ({((sale.vatRate ?? VAT_RATE) * 100).toFixed(0)}%)</span>
              <span className="text-slate-700">{formatCurrency(computeVat(sale.price, sale.vatRate ?? VAT_RATE))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total</span>
              <span className="font-bold text-slate-700">
                {formatCurrency(Number(sale.price || 0) + computeVat(sale.price, sale.vatRate ?? VAT_RATE))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Method</span>
              <Badge variant={isCash ? 'green' : 'blue'}>{sale.paymentMethod}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Branch</span>
              <span className="inline-flex items-center gap-1 text-slate-700">
                <FiMapPin size={13} /> {sale.branch || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Agent</span>
              <span className="text-slate-700">{sale.salesAgent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Reg. No.</span>
              <span className="text-slate-700">{sale.registrationNo || vehicle?.registrationNo || '-'}</span>
            </div>
            {sale.invoiceNumber && (
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice</span>
                <span className="font-mono text-xs text-slate-700">{sale.invoiceNumber}</span>
              </div>
            )}
            {inquiry && (
              <div className="flex justify-between">
                <span className="text-slate-400">Inquiry</span>
                <Link to={`/inquiries/${inquiry.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <FiLinkIcon size={12} /> #{inquiry.id?.slice(-6)}
                </Link>
              </div>
            )}
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
                  {/* Linked records */}
                  <div className="grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-slate-500">
                      <FiUser size={13} />
                      Customer:{' '}
                      {customer && (
                        <Link to={`/customers/${customer.id}`} className="text-primary hover:underline">
                          {customer.name}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <FiLinkIcon size={13} />
                      Inquiry:{' '}
                      {inquiry ? (
                        <Link to={`/inquiries/${inquiry.id}`} className="text-primary hover:underline">
                          #{inquiry.id?.slice(-6)}
                        </Link>
                      ) : '-'}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
                    <div>
                      <p className="font-medium text-slate-700">{credit.financier || 'No financier'}</p>
                      <p className="text-xs text-slate-400">Submitted {formatDate(credit.submittedAt)}</p>
                    </div>
                    <Badge variant={statusVariant(credit.status)}>{credit.status}</Badge>
                  </div>

                  {/* Categorized documents */}
                  <div>
                    <p className="mb-3 text-sm font-medium text-slate-600">Supporting Documents</p>
                    <div className="space-y-3">
                      {CREDIT_DOCUMENT_TYPES.map((doc) => {
                        const files = creditDocs[doc.key] || []
                        return (
                          <div key={doc.key} className="rounded-xl border border-slate-100 p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-sm font-medium text-slate-700">
                                {doc.label}
                                <span className="ml-2 text-xs text-slate-400">({files.length})</span>
                              </p>
                              {canManage && (
                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">
                                  {uploading ? 'Uploading…' : (<><FiUpload size={13} /> Upload</>)}
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    onChange={(e) => uploadDocs(doc.key, e)}
                                    disabled={uploading}
                                  />
                                </label>
                              )}
                            </div>
                            {files.length > 0 ? (
                              <div className="space-y-1">
                                {files.map((d, i) => (
                                  <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                                    <a href={d.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                                      📄 {d.name}
                                    </a>
                                    {canManage && (
                                      <button
                                        className="btn-ghost p-1 text-red-500"
                                        onClick={() => removeDoc(doc.key, i)}
                                        title="Remove"
                                      >
                                        <FiTrash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400">No file uploaded</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
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
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            <p>Customer: <b className="text-slate-700">{customer?.name}</b></p>
            <p>Inquiry: <b className="text-slate-700">#{inquiry?.id?.slice(-6) || '-'}</b></p>
            <p>Branch: <b className="text-slate-700">{sale.branch || '-'}</b></p>
          </div>
          <div>
            <label className="label">Financier</label>
            <select className="input" {...register('financier', { required: 'Required' })}>
              <option value="">Select financier</option>
              {financiers.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" {...register('status')}>
              {CREDIT_STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </form>
      </Modal>

      {/* Invoice Modal */}
      <Modal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        title="Generate Invoice"
        footer={
          <>
            <button className="btn-outline" onClick={() => setInvoiceOpen(false)}>Cancel</button>
            <button type="submit" form="invoice-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting && <ButtonLoader />} Save Invoice
            </button>
          </>
        }
      >
        <form id="invoice-form" onSubmit={handleSubmit(saveInvoice)} className="space-y-4">
          <div>
            <label className="label">Customer Name</label>
            <input className="input" value={customer?.name || ''} disabled />
          </div>
          <div>
            <label className="label">Chassis Number</label>
            <input className="input" value={vehicle?.chassisNumber || ''} disabled />
          </div>
          <div>
            <label className="label">Registration No.</label>
            <input className="input" {...register('registrationNo')} placeholder="e.g. KMEA 123A" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Total Amount (KES)</label>
              <input className="input" value={formatCurrency(sale.price)} disabled />
            </div>
            <div>
              <label className="label">VAT Rate</label>
              <select className="input" {...register('vatRate')}>
                <option value="0.16">16%</option>
                <option value="0.08">8%</option>
                <option value="0">0% (Exempt)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Invoice No.</label>
              <input className="input" {...register('invoiceNumber')} />
            </div>
            <div>
              <label className="label">Invoice Date</label>
              <input type="date" className="input" {...register('invoiceDate')} />
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(sale.price)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">VAT</span><span>{formatCurrency(computeVat(sale.price, Number(sale.vatRate ?? VAT_RATE)))}</span></div>
            <div className="mt-1 flex justify-between font-bold"><span>Total</span><span>{formatCurrency(Number(sale.price || 0) + computeVat(sale.price, Number(sale.vatRate ?? VAT_RATE)))}</span></div>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
