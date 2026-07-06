import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiCheckCircle, FiFileText } from 'react-icons/fi'
import toast from 'react-hot-toast'
import AppLayout from '../components/layouts/AppLayout'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Badge, { statusVariant } from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { useAsyncList } from '../hooks/useAsync'
import { useAuth } from '../contexts/AuthContext'
import { ntsaService, saleService, customerService, inventoryService, workshopService } from '../services'
import { NTSA_STATUS, SALE_STATUS } from '../constants'
import { formatDate } from '../utils/helpers'
import { can } from '../utils/permissions'

const STEPS = [
  { key: 'applicationSubmitted', label: 'Application Submitted' },
  { key: 'inspectionCompleted', label: 'Inspection Completed' },
  { key: 'ownershipTransferred', label: 'Ownership Transferred' },
  { key: 'logbookIssued', label: 'Logbook Issued' },
]

export default function NTSA() {
  const { profile } = useAuth()
  const { items, loading, setItems, reload } = useAsyncList(() => ntsaService.getAll())
  const [sales, setSales] = useState([])
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [workshops, setWorkshops] = useState([])
  const canManage = can.manageNtsa(profile?.role)

  useEffect(() => {
    Promise.all([saleService.getAll(), customerService.getAll(), inventoryService.getAll(), workshopService.getAll()]).then(
      ([s, c, v, w]) => {
        setSales(s)
        setCustomers(c)
        setVehicles(v)
        setWorkshops(w)
      },
    )
  }, [])

  const saleInfo = (saleId) => {
    const sale = sales.find((s) => s.id === saleId)
    if (!sale) return { customer: '—', vehicle: '—' }
    return {
      customer: customers.find((c) => c.id === sale.customerId)?.name || '—',
      vehicle: (() => {
        const v = vehicles.find((x) => x.id === sale.vehicleId)
        return v ? `${v.model} (${v.chassisNumber || v.id?.slice(-4)})` : '—'
      })(),
    }
  }

  const toggleStep = async (proc, field) => {
    try {
      const updated = { [field]: !proc[field] }
      // If all steps done, mark completed; else processing
      const steps = STEPS.map((s) => (s.key === field ? !proc[s.key] : proc[s.key]))
      const allDone = steps.every(Boolean)
      const anyDone = steps.some(Boolean)
      updated.status = allDone ? 'Completed' : anyDone ? 'Processing' : 'Pending'
      await ntsaService.update(proc.id, updated)

      // If NTSA completed, check if workshop also completed → ready for dispatch
      if (allDone) {
        const sale = sales.find((s) => s.id === proc.saleId)
        const ws = workshops.find((w) => w.saleId === proc.saleId)
        if (sale && ws?.status === 'Completed' && sale.status !== 'Completed') {
          await saleService.update(sale.id, { status: 'Ready for Dispatch' })
        }
      }
      setItems((prev) => prev.map((p) => (p.id === proc.id ? { ...p, ...updated } : p)))
      toast.success(updated.status === 'Completed' ? 'NTSA process completed' : 'Updated')
      reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const updateStatus = async (proc, status) => {
    try {
      await ntsaService.update(proc.id, { status })
      setItems((prev) => prev.map((p) => (p.id === proc.id ? { ...p, status } : p)))
      toast.success(`Marked ${status}`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="NTSA" />
        <div className="card p-8 text-center text-slate-400">Loading…</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader title="NTSA Processing" subtitle={`${items.length} process${items.length !== 1 ? 'es' : ''}`} />

      {items.length === 0 ? (
        <div className="card">
          <EmptyState icon={FiFileText} title="No NTSA processes" subtitle="NTSA processes are created automatically when a sale's payment is confirmed." />
        </div>
      ) : (
        <DataTable
          columns={[
            { key: 'saleId', label: 'Sale' },
            { key: 'customer', label: 'Customer' },
            { key: 'vehicle', label: 'Vehicle' },
            { key: 'steps', label: 'Steps' },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: '' },
          ]}
          data={items}
          searchKeys={['status']}
          searchPlaceholder="Search…"
          renderRow={(proc) => {
            const info = saleInfo(proc.saleId)
            return (
              <tr key={proc.id}>
                <td className="font-mono text-xs">
                  <Link to={`/sales/${proc.saleId}`} className="text-primary hover:underline">#{proc.saleId?.slice(-6)}</Link>
                </td>
                <td className="text-slate-600">{info.customer}</td>
                <td className="text-slate-600">{info.vehicle}</td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    {STEPS.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => canManage && toggleStep(proc, s.key)}
                        disabled={!canManage}
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          proc[s.key] ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'
                        } ${canManage ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                        title={s.label}
                      >
                        {proc[s.key] ? '✓' : '○'} {s.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </td>
                <td>
                  <Badge variant={statusVariant(proc.status)}>{proc.status}</Badge>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    {canManage && proc.status !== 'Completed' && (
                      <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => toggleStep(proc, 'logbookIssued')}>
                        <FiCheckCircle size={14} /> Complete All
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          }}
        />
      )}
    </AppLayout>
  )
}
