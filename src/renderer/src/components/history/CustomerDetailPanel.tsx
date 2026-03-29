import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, FilePlus } from 'lucide-react'
import type { CustomerInvoiceSummary } from '../../types'
import { formatCurrencyWithSymbol } from '../../utils/formatCurrency'
import Button from '../ui/Button'
import CustomerAvatarBadge from './CustomerAvatarBadge'
import AllInvoicesView from './AllInvoicesView'

interface Props {
  customer: CustomerInvoiceSummary
  onBack: () => void
}

export default function CustomerDetailPanel({ customer, onBack }: Props): React.ReactElement {
  const navigate = useNavigate()
  const hasLinkedLedger = !!customer.customer_id

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-border flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft size={14} /> Back</Button>
        <div className="w-px h-5 bg-border" />
        <CustomerAvatarBadge name={customer.customer_name} size="sm" />
        <div>
          <div className="font-semibold text-text-primary leading-tight">{customer.customer_name}</div>
          {customer.gstin && <div className="text-xs font-mono text-text-secondary">{customer.gstin}</div>}
        </div>
        <div className="flex-1" />

        {/* Mini stats */}
        <div className="flex items-center gap-4 text-xs text-text-secondary mr-3">
          <div className="text-center">
            <div className="font-semibold text-text-primary text-sm">{customer.invoice_count}</div>
            <div>Invoices</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-700 text-sm tabular-nums">{formatCurrencyWithSymbol(Number(customer.total_revenue))}</div>
            <div>Revenue</div>
          </div>
          {customer.draft_count > 0 && (
            <div className="text-center">
              <div className="font-semibold text-warning text-sm">{customer.draft_count}</div>
              <div>Drafts</div>
            </div>
          )}
        </div>

        {hasLinkedLedger && (
          <Button variant="secondary" size="sm" onClick={() => navigate(`/customers/${customer.customer_id}/ledger`)}>
            <BookOpen size={13} /> Ledger
          </Button>
        )}
        <Button size="sm" onClick={() => customer.customer_id
          ? navigate(`/invoices/new?customerId=${customer.customer_id}`)
          : navigate('/invoices/new')
        }>
          <FilePlus size={13} /> New Invoice
        </Button>
      </div>

      {/* Invoice table for this customer */}
      <div className="flex-1 overflow-hidden">
        <AllInvoicesView
          customerId={customer.customer_id ?? undefined}
          buyerName={customer.customer_id ? undefined : customer.customer_name}
        />
      </div>
    </div>
  )
}
