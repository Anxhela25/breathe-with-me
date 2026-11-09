import { Link } from 'react-router-dom'

const styles = {
  primary: 'w-full rounded-3xl bg-sage px-6 py-4 text-lg font-bold text-white shadow-lg shadow-sage/20 active:scale-[0.98]',
  outline: 'w-full rounded-3xl border border-sage px-6 py-3 text-base text-sage active:scale-[0.98]',
  link: 'px-2 py-2 text-sm text-sage underline underline-offset-4',
}

/** A button, or a link styled like a button when `to` is given. */
export default function Button({ to, variant = 'primary', className = '', ...props }) {
  const cls = `${styles[variant]} block text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage ${className}`
  return to ? <Link to={to} className={cls} {...props} /> : <button type="button" className={cls} {...props} />
}
