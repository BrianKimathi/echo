import { useState } from 'react'
import { FiPlus, FiTrash2, FiBriefcase, FiMapPin } from 'react-icons/fi'
import toast from 'react-hot-toast'
import AppLayout from '../components/layouts/AppLayout'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import { ButtonLoader } from '../components/ui/Spinner'
import { useAsync } from '../hooks/useAsync'
import { settingsService } from '../services'

export default function Settings() {
  const { data, loading, reload } = useAsync(() => settingsService.getAll(), [])
  const [financier, setFinancier] = useState('')
  const [branch, setBranch] = useState('')
  const [saving, setSaving] = useState(null)

  const addFinancier = async (e) => {
    e.preventDefault()
    if (!financier.trim()) return
    setSaving('financier')
    try {
      await settingsService.addFinancier(financier)
      setFinancier('')
      toast.success('Financier added')
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(null)
    }
  }

  const removeFinancier = async (name) => {
    try {
      await settingsService.removeFinancier(name)
      toast.success('Financier removed')
      reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const addBranch = async (e) => {
    e.preventDefault()
    if (!branch.trim()) return
    setSaving('branch')
    try {
      await settingsService.addBranch(branch)
      setBranch('')
      toast.success('Branch added')
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(null)
    }
  }

  const removeBranch = async (name) => {
    try {
      await settingsService.removeBranch(name)
      toast.success('Branch removed')
      reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading || !data) {
    return (
      <AppLayout>
        <PageHeader title="Settings" />
        <div className="card p-8 text-center text-slate-400">Loading…</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader
        title="Settings"
        subtitle="Manage the financiers and branches used across sales and credit applications."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Financiers */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <FiBriefcase className="text-primary" />
            <h3 className="font-semibold text-slate-700">Credit Financiers</h3>
          </div>

          <form onSubmit={addFinancier} className="mb-4 flex gap-2">
            <input
              className="input"
              placeholder="e.g. Watu Credit Ltd"
              value={financier}
              onChange={(e) => setFinancier(e.target.value)}
            />
            <button type="submit" className="btn-primary whitespace-nowrap" disabled={saving === 'financier' || !financier.trim()}>
              {saving === 'financier' ? <ButtonLoader /> : <FiPlus />} Add
            </button>
          </form>

          <div className="space-y-2">
            {data.financiers.length === 0 ? (
              <p className="text-sm text-slate-400">No financiers configured.</p>
            ) : (
              data.financiers.map((f) => (
                <div key={f} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5">
                  <span className="text-sm font-medium text-slate-700">{f}</span>
                  <button className="btn-ghost p-1.5 text-red-500" onClick={() => removeFinancier(f)} title="Remove">
                    <FiTrash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Branches */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <FiMapPin className="text-primary" />
            <h3 className="font-semibold text-slate-700">Branches</h3>
          </div>

          <form onSubmit={addBranch} className="mb-4 flex gap-2">
            <input
              className="input"
              placeholder="e.g. Mombasa"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
            <button type="submit" className="btn-primary whitespace-nowrap" disabled={saving === 'branch' || !branch.trim()}>
              {saving === 'branch' ? <ButtonLoader /> : <FiPlus />} Add
            </button>
          </form>

          <div className="space-y-2">
            {data.branches.length === 0 ? (
              <p className="text-sm text-slate-400">No branches configured.</p>
            ) : (
              data.branches.map((b) => (
                <div key={b} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5">
                  <span className="text-sm font-medium text-slate-700">{b}</span>
                  <button className="btn-ghost p-1.5 text-red-500" onClick={() => removeBranch(b)} title="Remove">
                    <FiTrash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
