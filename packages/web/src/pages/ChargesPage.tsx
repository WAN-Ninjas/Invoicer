import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, Edit2, Trash2 } from 'lucide-react';
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
import { chargesApi, customersApi } from '@/services/api';
import { formatCurrency, formatDate } from '@invoicer/shared';
import type { Customer } from '@invoicer/shared';

interface Charge {
  id: string;
  customerId: string;
  invoiceId: string | null;
  chargeType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  chargeDate: string;
  notes: string | null;
  customer?: Customer;
}

interface ChargeType {
  value: string;
  label: string;
  description: string;
}

export function ChargesPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [showUnbilledOnly, setShowUnbilledOnly] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const queryClient = useQueryClient();

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await customersApi.getAll();
      return response.data;
    },
  });

  const { data: chargeTypes } = useQuery<ChargeType[]>({
    queryKey: ['chargeTypes'],
    queryFn: async () => {
      const response = await chargesApi.getTypes();
      return response.data;
    },
  });

  const { data: charges, isLoading } = useQuery<Charge[]>({
    queryKey: ['charges', selectedCustomer, showUnbilledOnly],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (selectedCustomer) params.customerId = selectedCustomer;
      if (showUnbilledOnly) params.unbilledOnly = 'true';
      const response = await chargesApi.getAll(params);
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => chargesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      setIsModalOpen(false);
      toast.success('Charge created');
    },
    onError: () => toast.error('Failed to create charge'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      chargesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      setIsModalOpen(false);
      setEditingCharge(null);
      toast.success('Charge updated');
    },
    onError: () => toast.error('Failed to update charge'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chargesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      toast.success('Charge deleted');
    },
    onError: () => toast.error('Cannot delete charge that is part of an invoice'),
  });

  const customerOptions = customers?.map((c) => ({ value: c.id, label: c.name })) || [];
  const chargeTypeOptions = chargeTypes?.map((t) => ({ value: t.value, label: t.label })) || [];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      customerId: formData.get('customerId') as string,
      chargeType: formData.get('chargeType') as string,
      description: formData.get('description') as string,
      quantity: parseFloat(formData.get('quantity') as string) || 1,
      unitPrice: parseFloat(formData.get('unitPrice') as string),
      chargeDate: formData.get('chargeDate') as string,
      notes: formData.get('notes') as string || undefined,
    };

    if (editingCharge) {
      updateMutation.mutate({ id: editingCharge.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCharge(null);
  };

  const getCustomerName = (customerId: string) => {
    return customers?.find((c) => c.id === customerId)?.name || 'Unknown';
  };

  const getChargeTypeLabel = (type: string) => {
    return chargeTypes?.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Charges"
        subtitle="Manage custom charges, services, and products"
        actions={
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Charge
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
          ) : charges && charges.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell>{formatDate(charge.chargeDate)}</TableCell>
                    <TableCell>{getCustomerName(charge.customerId)}</TableCell>
                    <TableCell>
                      <span className="badge badge-info">
                        {getChargeTypeLabel(charge.chargeType)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {charge.description}
                    </TableCell>
                    <TableCell>{charge.quantity}</TableCell>
                    <TableCell>{formatCurrency(charge.total)}</TableCell>
                    <TableCell>
                      {charge.invoiceId ? (
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
                            setEditingCharge(charge);
                            setIsModalOpen(true);
                          }}
                          disabled={!!charge.invoiceId}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this charge?')) {
                              deleteMutation.mutate(charge.id);
                            }
                          }}
                          disabled={!!charge.invoiceId}
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
              icon={Package}
              title="No charges yet"
              description="Add custom charges for services, software licenses, products, or other billable items."
              action={
                <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Charge
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Charge Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCharge ? 'Edit Charge' : 'Add Charge'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Customer"
            name="customerId"
            required
            options={customerOptions}
            placeholder="Select customer"
            defaultValue={editingCharge?.customerId}
          />

          <Select
            label="Charge Type"
            name="chargeType"
            required
            options={chargeTypeOptions}
            placeholder="Select type"
            defaultValue={editingCharge?.chargeType || 'service'}
          />

          <Input
            label="Date"
            name="chargeDate"
            type="date"
            required
            defaultValue={
              editingCharge?.chargeDate
                ? new Date(editingCharge.chargeDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0]
            }
          />

          <Input
            label="Description"
            name="description"
            required
            placeholder="e.g., Monthly maintenance service"
            defaultValue={editingCharge?.description || ''}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              name="quantity"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={editingCharge?.quantity || 1}
            />
            <Input
              label="Unit Price"
              name="unitPrice"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              defaultValue={editingCharge?.unitPrice || ''}
            />
          </div>

          <Textarea
            label="Notes (optional)"
            name="notes"
            placeholder="Internal notes about this charge"
            defaultValue={editingCharge?.notes || ''}
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
              {editingCharge ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
