import { classNames } from '../../utils/helpers'

export default function Card({ children, className, ...props }) {
  return (
    <div className={classNames('card p-5', className)} {...props}>
      {children}
    </div>
  )
}
