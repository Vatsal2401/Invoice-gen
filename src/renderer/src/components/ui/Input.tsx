import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  numeric?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, numeric = false, id, className = '', ...props },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`
          border border-border rounded-md px-3 py-2 text-sm w-full
          focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
          disabled:bg-gray-100 disabled:text-text-secondary disabled:cursor-not-allowed
          ${numeric ? 'text-right tabular-nums' : ''}
          ${error ? 'border-danger focus:ring-danger' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
})

export default Input
