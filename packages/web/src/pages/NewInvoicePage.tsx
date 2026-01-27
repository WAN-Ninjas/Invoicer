import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { customersApi, entriesApi, invoicesApi } from '@/services/api';
import { formatCurrency, formatDate, formatDuration } from '@invoicer/shared';
import type { Customer, TimesheetEntry } from '@invoicer/shared';

export function NewInvoicePage() {
  const [customerId, setCustomerId] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [hourlyRateOverride, setHourlyRateOverride] = useState<string>('');
  const [taxRate, setTaxRate] = useState<string>('0');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await customersApi.getAll();
      return response.data;
    },
  });

  const { data: unbilledEntries } = useQuery<TimesheetEntry[]>({
    queryKey: ['entries', 'unbilled', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const response = await entriesApi.getUnbilled(customerId);
      return response.data;
    },
    enabled: !!customerId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await invoicesApi.create(data);
      return response.data;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      toast.success('Invoice created');
      navigate(`/invoices/${invoice.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create invoice');
    },
  });

  const customerOptions = customers?.map((c) => ({ value: c.id, label: c.name })) || [];
  const selectedCustomer = customers?.find((c) => c.id === customerId);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCustomerId(e.target.value);
    setSelectedEntries(new Set());
  };

  const toggleEntry = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const selectAll = () => {
    if (unbilledEntries) {
      setSelectedEntries(new Set(unbilledEntries.map((e) => e.id)));
    }
  };

  const deselectAll = () => {
    setSelectedEntries(new Set());
  };

  // Calculate totals
  const selectedEntriesList = unbilledEntries?.filter((e) => selectedEntries.has(e.id)) || [];
  const rate = hourlyRateOverride ? parseFloat(hourlyRateOverride) : selectedCustomer?.defaultHourlyRate || 0;
  const totalMinutes = selectedEntriesList.reduce((sum, e) => sum + e.totalMinutes, 0);
  const subtotal = selectedEntriesList.reduce((sum, e) => {
    const entryRate = e.hourlyRateOverride !== null ? e.hourlyRateOverride : rate;
    return sum + (e.totalMinutes / 60) * entryRate;
  }, 0);
  const taxRateNum = parseFloat(taxRate) / 100 || 0;
  const taxAmount = subtotal * taxRateNum;
  const total = subtotal + taxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedEntries.size === 0) {
      toast.error('Please select at least one entry');
      return;
    }

    const data: Record<string, unknown> = {
      customerId,
      entryIds: Array.from(selectedEntries),
      taxRate: taxRateNum,
      notes: notes || undefined,
      dueDate: dueDate || undefined,
    };

    if (hourlyRateOverride) {
      data.hourlyRateOverride = parseFloat(hourlyRateOverride);
    }

    createMutation.mutate(data);
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="New Invoice"
        subtitle="Create an invoice from unbilled time entries"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  label="Customer"
                  options={customerOptions}
                  placeholder="Select customer"
                  value={customerId}
                  onChange={handleCustomerChange}
                  required
                />

                <Input
                  label={`Rate Override (default: ${formatCurrency(selectedCustomer?.defaultHourlyRate || 0)}/hr)`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourlyRateOverride}
                  onChange={(e) => setHourlyRateOverride(e.target.value)}
                  placeholder="Leave empty to use defaults"
                />

                <Input
                  label="Tax Rate (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />

                <Input
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />

                <Textarea
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes to include on the invoice"
                />
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Entries:</span>
                    <span className="font-medium">{selectedEntries.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Time:</span>
                    <span className="font-medium">{formatDuration(totalMinutes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  {taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tax ({taxRate}%):</span>
                      <span className="font-medium">{formatCurrency(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-lg">{formatCurrency(total)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-4"
                  disabled={selectedEntries.size === 0}
                  isLoading={createMutation.isPending}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Entries Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Select Entries</CardTitle>
                {unbilledEntries && unbilledEntries.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      Clear
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!customerId ? (
                  <div className="text-center py-12 text-gray-500">
                    Select a customer to see unbilled entries
                  </div>
                ) : unbilledEntries && unbilledEntries.length > 0 ? (
                  <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Task</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unbilledEntries.map((entry) => {
                          const isSelected = selectedEntries.has(entry.id);
                          const entryRate = entry.hourlyRateOverride !== null
                            ? entry.hourlyRateOverride
                            : (hourlyRateOverride ? parseFloat(hourlyRateOverride) : selectedCustomer?.defaultHourlyRate || 0);
                          const entryAmount = (entry.totalMinutes / 60) * entryRate;

                          return (
                            <TableRow
                              key={entry.id}
                              className={`cursor-pointer ${isSelected ? 'bg-primary-50/50 dark:bg-primary-900/20' : ''}`}
                              onClick={() => toggleEntry(entry.id)}
                            >
                              <TableCell>
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-primary-500 border-primary-500'
                                    : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(entry.entryDate)}</TableCell>
                              <TableCell className="max-w-xs truncate">
                                {entry.taskDescription}
                              </TableCell>
                              <TableCell>{formatDuration(entry.totalMinutes)}</TableCell>
                              <TableCell>
                                {entry.hourlyRateOverride !== null && (
                                  <span className="text-xs text-primary-500">(override) </span>
                                )}
                                {formatCurrency(entryRate)}/hr
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(entryAmount)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No unbilled entries for this customer
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
