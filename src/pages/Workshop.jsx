import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiCheckCircle, FiTool } from 'react-icons/fi'
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
import { workshopService, saleService, customerService, inventoryService } from '../services'
import { WORKSHOP_STATUS, SALE_STATUS } from '../constants'
import { formatDate } from '../utils/helpers'
import { can } from '../utils/permissions'

export default function Workshop() {
  const { profile } = useAuth()
  const { items, loading, setItems, reload } = useAsyncList(() => workshopService.getAll())
  const [sales, setSales] = useState([])
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const canManage = can.manageWorkshop(profile?.role)

  useEffect(() => {
    Promise.all([saleService.getAll(), customerService.getAll(), inventoryService.getAll()]).then(([s, c, v]) => {
      setSales(s)
      setCustomers(c)
      setVehicles(v)
    })
  }, [])

  const saleInfo = (saleId) => {
    const sale = sales.find((s) => s.id === saleId)
    if (!sale) return { customer: '—', vehicle: '—' }
    const customer = customers.find((c) => c.id === sale.customerId)?.name || '—'
    const vehicle = vehicles.find((v) => v.id === sale.vehicleId)
    return { customer, vehicle: vehicle ? `${vehicle.model} (${vehicle.color})` : '—' }
  }

  const openEdit = (job) => {
    setEditing(job)
    setModalOpen(true)
  }

  const toggleCheck = async (job, field) => {
    try {
      const updated = { [field]: !job[field] }
      const allDone =
        (field === 'batteryInspection' ? true : job.batteryInspection) &&
        (field === 'motorInspection' ? true : job.motorInspection) &&
        (field === 'accessoriesInstalled' ? true : job.accessoriesInstalled)
      if (allDone && !job[field]) {
        updated.status = 'In Progress'
      }
      await workshopService.update(job.id, updated)
      setItems((prev) => prev.map((j) => (j.id === job.id ? { ...j, ...updated } : j)))
    } catch (e) {
      toast.error(e.message)
    }
  }

  const updateStatus = async (job, status) => {
    try {
      const data = { status }
      if (status === 'Completed') {
        data.completedBy = profile?.name
        data.completedAt = Date.now()
        // Update sale status
        const sale = sales.find((s) => s.id === job.saleId)
        if (sale && sale.status === 'Workshop') {
          await saleService.update(sale.id, { status: 'NTSA' })
        }
      }
      await workshopService.update(job.id, data)
      setItems((prev) => prev.map((j) => (j.id === job.id ? { ...j, ...data } : j)))
      toast.success(`Job marked ${status}`)
      reload()
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Workshop" />
        <div className="card p-8 text-center text-slate-400">Loading…</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader title="Workshop" subtitle={`${items.length} job${items.length !== 1 ? 's' : ''}`} />

      {items.length === 0 ? (
        <div className="card">
          <EmptyState icon={FiTool} title="No workshop jobs" subtitle="Jobs are created automatically when a sale's payment is confirmed." />
        </div>
      ) : (
        <DataTable
          columns={[
            { key: 'saleId', label: 'Sale' },
            { key: 'customer', label: 'Customer' },
            { key: 'vehicle', label: 'Vehicle' },
            { key: 'checks', label: 'Inspection' },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: '' },
          ]}
          data={items}
          searchKeys={['status', 'completedBy']}
          searchPlaceholder="Search jobs…"
          renderRow={(job) => {
            const info = saleInfo(job.saleId)
            return (
              <tr key={job.id}>
                <td className="font-mono text-xs">
                  <Link to={`/sales/${job.saleId}`} className="text-primary hover:underline">#{job.saleId?.slice(-6)}</Link>
                </td>
                <td className="text-slate-600">{info.customer}</td>
                <td className="text-slate-600">{info.vehicle}</td>
                <td>
                  <div className="flex gap-2">
                    {[
                      { f: 'batteryInspection', l: 'Bat' },
                      { f: 'motorInspection', l: 'Mot' },
                      { f: 'accessoriesInstalled', l: 'Acc' },
                    ].map(({ f, l }) => (
                      <button
                        key={f}
                        onClick={() => canManage && toggleCheck(job, f)}
                        disabled={!canManage}
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          job[f] ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'
                        } ${canManage ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                        title={l}
                      >
                        {job[f] ? '✓' : '○'} {l}
                      </button>
                    ))}
                  </div>
                </td>
                <td>
                  <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    {canManage && job.status !== 'Completed' && (
                      <>
                        {job.status === 'Pending' && (
                          <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => updateStatus(job, 'In Progress')}>
                            Start
                          </button>
                        )}
                        <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => updateStatus(job, 'Completed')}>
                          <FiCheckCircle size={14} /> Complete
                        </button>
                      </>
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
