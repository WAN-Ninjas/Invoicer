import type { InvoiceStatus } from '@invoicer/shared';

interface BadgeProps {
  status: InvoiceStatus;
}

export function StatusBadge({ status }: BadgeProps) {
  const statusClasses: Record<InvoiceStatus, string> = {
    draft: 'badge badge-draft',
    sent: 'badge badge-sent',
    paid: 'badge badge-paid',
    overdue: 'badge badge-overdue',
    cancelled: 'badge badge-cancelled',
  };

  const statusLabels: Record<InvoiceStatus, string> = {
    draft: 'Draft',
    sent: 'Sent',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
  };

  return (
    <span className={statusClasses[status]}>
      {statusLabels[status]}
    </span>
  );
}
