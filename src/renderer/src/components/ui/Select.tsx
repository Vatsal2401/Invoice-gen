import React from 'react'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  placeholder?: string
  error?: string
}

export default function Select({
  label,
  options,
  placeholder,
  error,
  id,
  className = '',
  ...props
}: SelectProps): React.ReactElement {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-text-secondary">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          border border-border rounded-md px-3 py-2 text-sm w-full bg-white
          focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
          disabled:bg-gray-100 disabled:text-text-secondary disabled:cursor-not-allowed
          ${error ? 'border-danger' : ''}
          ${className}
        `}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
