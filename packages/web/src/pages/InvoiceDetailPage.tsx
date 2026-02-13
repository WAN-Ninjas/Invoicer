import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Send, Check, X, RotateCcw, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { invoicesApi } from '@/services/api';
import { formatCurrency, formatDate, formatDuration, getEffectiveRate, calculateCost } from '@invoicer/shared';
import type { InvoiceWithDetails, InvoiceStatus } from '@invoicer/shared';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderEmail, setReminderEmail] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; action: () => void } | null>(null);

  const { data: invoice, isLoading } = useQuery<InvoiceWithDetails>({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const response = await invoicesApi.getById(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: InvoiceStatus) => {
      return invoicesApi.update(id!, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const sendMutation = useMutation({
    mutationFn: async (email?: string) => {
      return invoicesApi.send(id!, email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setSendModalOpen(false);
      toast.success('Invoice sent');
    },
    onError: () => toast.error('Failed to send invoice'),
  });

  const reminderMutation = useMutation({
    mutationFn: async (email?: string) => {
      return invoicesApi.sendReminder(id!, email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      setReminderModalOpen(false);
      toast.success('Reminder sent');
    },
    onError: () => toast.error('Failed to send reminder'),
  });

  const downloadPdf = async () => {
    if (!invoice) return;
    try {
      const response = await invoicesApi.downloadPdf(id!);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  const handleSend = () => {
    sendMutation.mutate(sendEmail || undefined);
  };

  const handleReminder = () => {
    reminderMutation.mutate(reminderEmail || undefined);
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <Header title="Loading..." />
        <div className="text-center py-12">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="animate-fade-in">
        <Header title="Invoice Not Found" />
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">This invoice could not be found.</p>
            <Link to="/invoices">
              <Button variant="primary">Back to Invoices</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Header
        title={invoice.invoiceNumber}
        subtitle={`Invoice for ${invoice.customer.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/invoices">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <Button variant="secondary" onClick={downloadPdf}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            {invoice.status === 'draft' && (
              <Button variant="primary" onClick={() => {
                setSendEmail(invoice.customer.email || '');
                setSendModalOpen(true);
              }}>
                <Send className="w-4 h-4 mr-2" />
                Send Invoice
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <StatusBadge status={invoice.status} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.entries.map((entry) => {
                    const rate = getEffectiveRate(entry, invoice, invoice.customer);
                    const amount = calculateCost(entry.totalMinutes, rate);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDate(entry.entryDate)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.taskDescription}</p>
                            {entry.requestor && (
                              <p className="text-xs text-gray-500">
                                Requestor: {entry.requestor}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDuration(entry.totalMinutes)}</TableCell>
                        <TableCell>{formatCurrency(rate)}/hr</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span>{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.taxAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Tax ({(invoice.taxRate * 100).toFixed(1)}%):
                        </span>
                        <span>{formatCurrency(invoice.taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span>Total:</span>
                      <span>{formatCurrency(invoice.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {invoice.notes && (
                <div className="mt-6 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {invoice.customer.name}
              </p>
              {invoice.customer.email && (
                <p className="text-sm text-gray-500">{invoice.customer.email}</p>
              )}
              {invoice.customer.address && (
                <p className="text-sm text-gray-500 mt-2">{invoice.customer.address}</p>
              )}
            </CardContent>
          </Card>

          {/* Invoice Info */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice #:</span>
                <span className="font-medium">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span>{formatDate(invoice.createdAt)}</span>
              </div>
              {invoice.dueDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date:</span>
                  <span>{formatDate(invoice.dueDate)}</span>
                </div>
              )}
              {invoice.sentAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Sent:</span>
                  <span>{formatDate(invoice.sentAt)}</span>
                </div>
              )}
              {invoice.paidAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid:</span>
                  <span>{formatDate(invoice.paidAt)}</span>
                </div>
              )}
              {invoice.hourlyRateOverride && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Rate Override:</span>
                  <span>{formatCurrency(invoice.hourlyRateOverride)}/hr</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice.status === 'sent' && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => updateStatusMutation.mutate('paid')}
                  isLoading={updateStatusMutation.isPending}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark as Paid
                </Button>
              )}
              {invoice.status === 'draft' && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setSendEmail(invoice.customer.email || '');
                    setSendModalOpen(true);
                  }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Invoice
                </Button>
              )}
              {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setReminderEmail(invoice.customer.email || '');
                    setReminderModalOpen(true);
                  }}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Send Reminder
                </Button>
              )}
              {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => setConfirmAction({
                    title: 'Cancel Invoice',
                    message: 'Are you sure you want to cancel this invoice?',
                    action: () => updateStatusMutation.mutate('cancelled'),
                  })}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Invoice
                </Button>
              )}
              {invoice.status === 'cancelled' && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setConfirmAction({
                    title: 'Restore Invoice',
                    message: 'Restore this invoice to draft status?',
                    action: () => updateStatusMutation.mutate('draft'),
                  })}
                  isLoading={updateStatusMutation.isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore to Draft
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          confirmAction?.action();
          setConfirmAction(null);
        }}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        confirmLabel="Confirm"
        isLoading={updateStatusMutation.isPending}
      />

      {/* Send Modal */}
      <Modal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        title="Send Invoice"
      >
        <div className="space-y-4">
          <Input
            label="Recipient Email"
            type="email"
            value={sendEmail}
            onChange={(e) => setSendEmail(e.target.value)}
            placeholder="customer@example.com"
          />
          <p className="text-sm text-gray-500">
            The invoice PDF will be attached to the email.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setSendModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSend}
              isLoading={sendMutation.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reminder Modal */}
      <Modal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        title="Send Payment Reminder"
      >
        <div className="space-y-4">
          <Input
            label="Recipient Email"
            type="email"
            value={reminderEmail}
            onChange={(e) => setReminderEmail(e.target.value)}
            placeholder="customer@example.com"
          />
          <p className="text-sm text-gray-500">
            A friendly payment reminder will be sent with the invoice PDF attached.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setReminderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleReminder}
              isLoading={reminderMutation.isPending}
            >
              <Bell className="w-4 h-4 mr-2" />
              Send Reminder
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
