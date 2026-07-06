import {
  FiUsers,
  FiMessageSquare,
  FiShoppingCart,
  FiDollarSign,
  FiTruck,
  FiTool,
  FiFileText,
  FiPackage,
  FiCheckCircle,
} from 'react-icons/fi'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import dayjs from 'dayjs'
import AppLayout from '../components/layouts/AppLayout'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import Badge, { statusVariant } from '../components/ui/Badge'
import { SectionLoader } from '../components/ui/Spinner'
import { useDashboardData } from '../hooks/useDashboardData'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, formatDate, isToday, isThisMonth, timeAgo } from '../utils/helpers'

const COLORS = ['#0B6E4F', '#1C9A6D', '#F4B400', '#3b82f6', '#ef4444', '#94a3b8']

export default function Dashboard() {
  const { profile } = useAuth()
  const { data, loading } = useDashboardData()

  if (loading || !data) {
    return (
      <AppLayout>
        <SectionLoader label="Loading dashboard…" />
      </AppLayout>
    )
  }

  const { customers, inquiries, vehicles, sales, workshop, ntsa, dispatch, credit } = data
  const activeInquiries = inquiries.filter((i) => !['Converted', 'Cancelled'].includes(i.status))
  const salesToday = sales.filter((s) => isToday(s.createdAt))
  const pendingCredit = credit.filter((c) => ['Pending', 'Approved'].includes(c.status) && c.status !== 'Disbursed')
  const availableVehicles = vehicles.filter((v) => v.status === 'Available')
  const workshopJobs = workshop.filter((w) => w.status !== 'Completed')
  const pendingNtsa = ntsa.filter((n) => n.status !== 'Completed')
  const readyDispatch = sales.filter((s) => s.status === 'Ready for Dispatch')
  const completedSales = sales.filter((s) => s.status === 'Completed')

  // Sales this month (by day)
  const monthSales = sales.filter((s) => isThisMonth(s.createdAt))
  const byDay = {}
  monthSales.forEach((s) => {
    const d = dayjs(s.createdAt).format('DD MMM')
    byDay[d] = (byDay[d] || 0) + 1
  })
  const salesChartData = Object.entries(byDay).map(([day, count]) => ({ day, sales: count }))

  // Inquiry conversion
  const convData = [
    { name: 'New', value: inquiries.filter((i) => i.status === 'New').length },
    { name: 'Contacted', value: inquiries.filter((i) => i.status === 'Contacted').length },
    { name: 'Negotiating', value: inquiries.filter((i) => i.status === 'Negotiating').length },
    { name: 'Converted', value: inquiries.filter((i) => i.status === 'Converted').length },
    { name: 'Cancelled', value: inquiries.filter((i) => i.status === 'Cancelled').length },
  ].filter((d) => d.value > 0)

  // Vehicle stock
  const stockData = ['Available', 'Reserved', 'Workshop', 'Delivered', 'Sold'].map((st) => ({
    name: st,
    value: vehicles.filter((v) => v.status === st).length,
  }))

  // Recent activities
  const recent = [
    ...sales.map((s) => ({ type: 'Sale', text: `Sale created for vehicle ${s.vehicleId}`, time: s.createdAt })),
    ...inquiries.map((i) => ({ type: 'Inquiry', text: `Inquiry status: ${i.status}`, time: i.createdAt })),
    ...customers.map((c) => ({ type: 'Customer', text: `${c.name} registered`, time: c.createdAt })),
  ]
    .sort((a, b) => (b.time || 0) - (a.time || 0))
    .slice(0, 8)

  const stats = [
    { icon: FiUsers, label: 'Total Customers', value: customers.length, color: 'primary' },
    { icon: FiMessageSquare, label: 'Active Inquiries', value: activeInquiries.length, color: 'blue' },
    { icon: FiShoppingCart, label: 'Sales Today', value: salesToday.length, color: 'secondary' },
    { icon: FiDollarSign, label: 'Pending Credit', value: pendingCredit.length, color: 'amber' },
    { icon: FiTruck, label: 'Vehicles Available', value: availableVehicles.length, color: 'primary' },
    { icon: FiTool, label: 'Workshop Jobs', value: workshopJobs.length, color: 'blue' },
    { icon: FiFileText, label: 'Pending NTSA', value: pendingNtsa.length, color: 'amber' },
    { icon: FiPackage, label: 'Ready for Dispatch', value: readyDispatch.length, color: 'accent' },
    { icon: FiCheckCircle, label: 'Completed Sales', value: completedSales.length, color: 'secondary' },
  ]

  return (
    <AppLayout>
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${profile?.name}`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {stats.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 0.05} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-slate-700">Sales This Month</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={salesChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#0B6E4F" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-slate-700">Inquiry Conversion</h3>
          {convData.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">No inquiry data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={convData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {convData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-slate-700">Vehicle Stock</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="value" fill="#1C9A6D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-slate-700">Recent Activities</h3>
          <div className="space-y-3">
            {recent.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No activity yet</p>}
            {recent.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-slate-50 pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="badge bg-primary-50 text-primary">{a.type}</span>
                  <p className="text-sm text-slate-600">{a.text}</p>
                </div>
                <span className="text-xs text-slate-400">{timeAgo(a.time)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
