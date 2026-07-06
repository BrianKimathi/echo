import { useState, useEffect } from 'react'
import {
  FiBarChart2,
  FiDownload,
  FiFileText,
  FiUsers,
  FiTruck,
  FiShoppingCart,
  FiTool,
  FiPackage,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import AppLayout from '../components/layouts/AppLayout'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Badge, { statusVariant } from '../components/ui/Badge'
import { SectionLoader } from '../components/ui/Spinner'
import { useAsync } from '../hooks/useAsync'
import {
  saleService,
  customerService,
  inventoryService,
  workshopService,
  dispatchService,
} from '../services'
import { downloadFile, toCSV, formatCurrency, formatDate } from '../utils/helpers'

const REPORT_TYPES = [
  { key: 'sales', label: 'Sales Report', icon: FiShoppingCart },
  { key: 'customers', label: 'Customer Report', icon: FiUsers },
  { key: 'inventory', label: 'Inventory Report', icon: FiTruck },
  { key: 'workshop', label: 'Workshop Report', icon: FiTool },
  { key: 'dispatch', label: 'Dispatch Report', icon: FiPackage },
]

export default function Reports() {
  const [active, setActive] = useState('sales')
  const [rows, setRows] = useState([])
  const [columns, setColumns] = useState([])

  const { data, loading } = useAsync(async () => {
    const [sales, customers, vehicles, workshop, dispatch] = await Promise.all([
      saleService.getAll(),
      customerService.getAll(),
      inventoryService.getAll(),
      workshopService.getAll(),
      dispatchService.getAll(),
    ])
    return { sales, customers, vehicles, workshop, dispatch }
  }, [])

  useEffect(() => {
    if (!data) return
    let r = []
    let cols = []
    switch (active) {
      case 'sales':
        cols = [
          { key: 'id', label: 'Sale ID' },
          { key: 'customer', label: 'Customer' },
          { key: 'vehicle', label: 'Vehicle' },
          { key: 'price', label: 'Price' },
          { key: 'paymentMethod', label: 'Method' },
          { key: 'status', label: 'Status' },
          { key: 'date', label: 'Date' },
        ]
        r = data.sales.map((s) => ({
          id: s.id,
          customer: data.customers.find((c) => c.id === s.customerId)?.name || '-',
          vehicle: (() => {
            const v = data.vehicles.find((x) => x.id === s.vehicleId)
            return v ? `${v.model} (${v.color})` : '-'
          })(),
          price: formatCurrency(s.price),
          paymentMethod: s.paymentMethod,
          status: s.status,
          date: formatDate(s.createdAt),
        }))
        break
      case 'customers':
        cols = [
          { key: 'name', label: 'Name' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'idNumber', label: 'ID Number' },
          { key: 'customerType', label: 'Type' },
          { key: 'date', label: 'Registered' },
        ]
        r = data.customers.map((c) => ({
          name: c.name,
          phone: c.phone || '-',
          email: c.email || '-',
          idNumber: c.idNumber || '-',
          customerType: c.customerType,
          date: formatDate(c.createdAt),
        }))
        break
      case 'inventory':
        cols = [
          { key: 'model', label: 'Model' },
          { key: 'color', label: 'Color' },
          { key: 'price', label: 'Price' },
          { key: 'chassisNumber', label: 'Chassis' },
          { key: 'status', label: 'Status' },
          { key: 'date', label: 'Added' },
        ]
        r = data.vehicles.map((v) => ({
          model: v.model,
          color: v.color,
          price: formatCurrency(v.price),
          chassisNumber: v.chassisNumber || '-',
          status: v.status,
          date: formatDate(v.createdAt),
        }))
        break
      case 'workshop':
        cols = [
          { key: 'saleId', label: 'Sale ID' },
          { key: 'battery', label: 'Battery' },
          { key: 'motor', label: 'Motor' },
          { key: 'accessories', label: 'Accessories' },
          { key: 'status', label: 'Status' },
          { key: 'completedBy', label: 'Completed By' },
        ]
        r = data.workshop.map((w) => ({
          saleId: w.saleId,
          battery: w.batteryInspection ? 'Yes' : 'No',
          motor: w.motorInspection ? 'Yes' : 'No',
          accessories: w.accessoriesInstalled ? 'Yes' : 'No',
          status: w.status,
          completedBy: w.completedBy || '-',
        }))
        break
      case 'dispatch':
        cols = [
          { key: 'saleId', label: 'Sale ID' },
          { key: 'deliveryDate', label: 'Delivery Date' },
          { key: 'receivedBy', label: 'Received By' },
          { key: 'remarks', label: 'Remarks' },
          { key: 'completed', label: 'Completed' },
          { key: 'completedAt', label: 'Completed At' },
        ]
        r = data.dispatch.map((d) => ({
          saleId: d.saleId,
          deliveryDate: formatDate(d.deliveryDate),
          receivedBy: d.receivedBy || '-',
          remarks: d.remarks || '-',
          completed: d.completed ? 'Yes' : 'No',
          completedAt: d.completedAt ? formatDate(d.completedAt) : '-',
        }))
        break
      default:
        break
    }
    setColumns(cols)
    setRows(r)
  }, [data, active])

  const exportCSV = () => {
    if (!rows.length) return toast.error('No data to export')
    const csv = toCSV(rows)
    downloadFile(csv, `${active}-report-${Date.now()}.csv`)
    toast.success('CSV exported')
  }

  const exportPDF = () => {
    if (!rows.length) return toast.error('No data to export')
    import('jspdf').then(({ jsPDF }) =>
      import('jspdf-autotable').then((autoTable) => {
        const doc = new jsPDF()
        doc.setFontSize(16)
        doc.text(`${active.charAt(0).toUpperCase() + active.slice(1)} Report`, 14, 18)
        doc.setFontSize(10)
        doc.text(`Generated: ${formatDate(Date.now())}`, 14, 25)
        autoTable.default(doc, {
          startY: 30,
          head: [columns.map((c) => c.label)],
          body: rows.map((r) => columns.map((c) => String(r[c.key] ?? ''))),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [11, 110, 79] },
        })
        doc.save(`${active}-report-${Date.now()}.pdf`)
        toast.success('PDF exported')
      }),
    )
  }

  if (loading || !data) {
    return (
      <AppLayout>
        <SectionLoader label="Loading reports…" />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader
        title="Reports"
        subtitle="Generate and export business reports"
        actions={
          <>
            <button className="btn-outline" onClick={exportCSV}>
              <FiDownload /> CSV
            </button>
            <button className="btn-primary" onClick={exportPDF}>
              <FiFileText /> PDF
            </button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {REPORT_TYPES.map((r) => {
          const Icon = r.icon
          return (
            <button
              key={r.key}
              onClick={() => setActive(r.key)}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${
                active === r.key
                  ? 'border-primary bg-primary-50 text-primary'
                  : 'border-slate-100 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={24} />
              <span className="text-xs font-medium">{r.label}</span>
            </button>
          )
        })}
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">
            {REPORT_TYPES.find((r) => r.key === active)?.label}
          </h3>
          <span className="text-sm text-slate-400">{rows.length} records</span>
        </div>
        <DataTable
          columns={columns}
          data={rows}
          searchKeys={columns.map((c) => c.key)}
          searchPlaceholder="Search report…"
          renderRow={(row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.key === 'status' ? (
                    <Badge variant={statusVariant(row[c.key])}>{row[c.key]}</Badge>
                  ) : (
                    String(row[c.key] ?? '-')
                  )}
                </td>
              ))}
            </tr>
          )}
        />
      </Card>
    </AppLayout>
  )
}
