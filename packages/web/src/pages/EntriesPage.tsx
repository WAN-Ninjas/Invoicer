import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { entriesApi, customersApi } from '@/services/api';
import { formatCurrency, formatDate, formatDuration } from '@invoicer/shared';
import type { TimesheetEntry, Customer } from '@invoicer/shared';

export function EntriesPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [showUnbilledOnly, setShowUnbilledOnly] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const queryClient = useQueryClient();

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await customersApi.getAll();
      return response.data;
    },
  });

  const { data: entries, isLoading } = useQuery<TimesheetEntry[]>({
    queryKey: ['entries', selectedCustomer, showUnbilledOnly],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (selectedCustomer) params.customerId = selectedCustomer;
      if (showUnbilledOnly) params.unbilledOnly = 'true';
      const response = await entriesApi.getAll(params);
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => entriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      setIsModalOpen(false);
      toast.success('Entry created');
    },
    onError: () => toast.error('Failed to create entry'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      entriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      setIsModalOpen(false);
      setEditingEntry(null);
      toast.success('Entry updated');
    },
    onError: () => toast.error('Failed to update entry'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => entriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      toast.success('Entry deleted');
    },
    onError: () => toast.error('Cannot delete entry that is part of an invoice'),
  });

  const customerOptions = customers?.map((c) => ({ value: c.id, label: c.name })) || [];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const hours = parseInt(formData.get('hours') as string) || 0;
    const minutes = parseInt(formData.get('minutes') as string) || 0;
    const totalMinutes = hours * 60 + minutes;

    const data = {
      customerId: formData.get('customerId') as string,
      entryDate: formData.get('entryDate') as string,
      startTime: formData.get('startTime') as string || undefined,
      endTime: formData.get('endTime') as string || undefined,
      totalMinutes,
      taskDescription: formData.get('taskDescription') as string,
      requestor: formData.get('requestor') as string || undefined,
      hourlyRateOverride: formData.get('hourlyRateOverride')
        ? parseFloat(formData.get('hourlyRateOverride') as string)
        : undefined,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const getCustomerName = (customerId: string) => {
    return customers?.find((c) => c.id === customerId)?.name || 'Unknown';
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Time Entries"
        subtitle="Track and manage your billable time"
        actions={
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        }
      />

      <Card>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Select
                options={[{ value: '', label: 'All Customers' }, ...customerOptions]}
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnbilledOnly}
                onChange={(e) => setShowUnbilledOnly(e.target.checked)}
                className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Unbilled only
              </span>
            </label>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : entries && entries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.entryDate)}</TableCell>
                    <TableCell>{getCustomerName(entry.customerId)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entry.taskDescription}
                    </TableCell>
                    <TableCell>{formatDuration(entry.totalMinutes)}</TableCell>
                    <TableCell>{formatCurrency(entry.calculatedCost)}</TableCell>
                    <TableCell>
                      {entry.invoiceId ? (
                        <span className="badge badge-sent">Invoiced</span>
                      ) : (
                        <span className="badge badge-draft">Unbilled</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingEntry(entry);
                            setIsModalOpen(true);
                          }}
                          disabled={!!entry.invoiceId}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this entry?')) {
                              deleteMutation.mutate(entry.id);
                            }
                          }}
                          disabled={!!entry.invoiceId}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Clock}
              title="No entries yet"
              description="Add time entries manually or import from a CSV file."
              action={
                <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingEntry ? 'Edit Entry' : 'Add Entry'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Customer"
            name="customerId"
            required
            options={customerOptions}
            placeholder="Select customer"
            defaultValue={editingEntry?.customerId}
          />

          <Input
            label="Date"
            name="entryDate"
            type="date"
            required
            defaultValue={
              editingEntry?.entryDate
                ? new Date(editingEntry.entryDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0]
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              name="startTime"
              type="time"
              defaultValue={editingEntry?.startTime || ''}
            />
            <Input
              label="End Time"
              name="endTime"
              type="time"
              defaultValue={editingEntry?.endTime || ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hours"
              name="hours"
              type="number"
              min="0"
              defaultValue={editingEntry ? Math.floor(editingEntry.totalMinutes / 60) : 0}
            />
            <Input
              label="Minutes"
              name="minutes"
              type="number"
              min="0"
              max="59"
              defaultValue={editingEntry ? editingEntry.totalMinutes % 60 : 0}
            />
          </div>

          <Textarea
            label="Task Description"
            name="taskDescription"
            required
            defaultValue={editingEntry?.taskDescription || ''}
          />

          <Input
            label="Requestor"
            name="requestor"
            defaultValue={editingEntry?.requestor || ''}
          />

          <Input
            label="Rate Override (optional)"
            name="hourlyRateOverride"
            type="number"
            step="0.01"
            min="0"
            placeholder="Leave empty to use customer default"
            defaultValue={editingEntry?.hourlyRateOverride || ''}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingEntry ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
