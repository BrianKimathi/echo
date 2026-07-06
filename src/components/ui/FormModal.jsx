import { useForm } from 'react-hook-form'
import Modal from './Modal'
import { ButtonLoader } from './Spinner'

const Field = ({ label, error, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

export default function FormModal({
  open,
  onClose,
  title,
  fields,
  defaultValues,
  onSubmit,
  submitLabel = 'Save',
  size = 'md',
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues })

  // reset form when opening with new defaults
  const handleOpen = () => {
    if (open) reset(defaultValues)
  }
  // useForm's reset on open
  const { reset: _r } = { reset }
  void handleOpen

  const submit = async (data) => {
    await onSubmit(data)
    onClose?.()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="formmodal-form" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting && <ButtonLoader />}
            {submitLabel}
          </button>
        </>
      }
    >
      <form id="formmodal-form" onSubmit={handleSubmit(submit)} className="space-y-4">
        {fields.map((f) => {
          const err = errors[f.name]?.message
          if (f.type === 'select') {
            return (
              <Field key={f.name} label={f.label} error={err}>
                <select className="input" {...register(f.name, f.rules)}>
                  <option value="">Select {f.label}</option>
                  {f.options.map((o) => (
                    <option key={o.value ?? o} value={o.value ?? o}>
                      {o.label ?? o}
                    </option>
                  ))}
                </select>
              </Field>
            )
          }
          if (f.type === 'textarea') {
            return (
              <Field key={f.name} label={f.label} error={err}>
                <textarea rows={3} className="input" {...register(f.name, f.rules)} placeholder={f.placeholder} />
              </Field>
            )
          }
          return (
            <Field key={f.name} label={f.label} error={err}>
              <input
                type={f.type || 'text'}
                className="input"
                {...register(f.name, f.rules)}
                placeholder={f.placeholder}
              />
            </Field>
          )
        })}
      </form>
    </Modal>
  )
}
