const formatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

export function formatCurrencyINR(amount: number): string {
  return formatter.format(amount)
}

export function formatCurrencyWithSymbol(amount: number): string {
  return `₹${formatter.format(amount)}`
}
