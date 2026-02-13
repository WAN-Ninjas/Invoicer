import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { FileUpload } from '@/components/ui/FileUpload';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { customersApi, entriesApi } from '@/services/api';
import { formatCurrency, formatDate, formatDuration } from '@invoicer/shared';
import type { Customer, CsvImportPreview } from '@invoicer/shared';

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(90);
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await customersApi.getAll();
      return response.data;
    },
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!file || !customerId) return null;
      const response = await entriesApi.previewImport(file, customerId, hourlyRate);
      return response.data;
    },
    onSuccess: (data) => {
      setPreview(data);
    },
    onError: () => toast.error('Failed to parse CSV file'),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file || !customerId) return;
      return entriesApi.import(file, customerId, hourlyRate, file.name);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      toast.success(`Imported ${response?.data?.entriesCount} entries`);
      navigate('/entries');
    },
    onError: () => toast.error('Failed to import entries'),
  });

  const customerOptions = customers?.map((c) => ({ value: c.id, label: c.name })) || [];

  // Update hourly rate when customer changes
  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setCustomerId(id);
    setPreview(null);

    const customer = customers?.find((c) => c.id === id);
    if (customer) {
      setHourlyRate(customer.defaultHourlyRate);
    }
  };

  const handlePreview = () => {
    if (file && customerId) {
      previewMutation.mutate();
    }
  };

  const handleImport = () => {
    if (preview && preview.entries.length > 0) {
      importMutation.mutate();
    }
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Import CSV"
        subtitle="Import timesheet entries from a CSV file"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary-500" />
                Upload File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Customer"
                options={customerOptions}
                placeholder="Select customer"
                value={customerId}
                onChange={handleCustomerChange}
              />

              <Input
                label="Hourly Rate"
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => {
                  setHourlyRate(parseFloat(e.target.value) || 0);
                  setPreview(null);
                }}
              />

              <FileUpload
                label="CSV File"
                accept=".csv"
                value={file}
                onChange={(f) => {
                  setFile(f);
                  setPreview(null);
                }}
              />

              <Button
                variant="primary"
                className="w-full"
                onClick={handlePreview}
                disabled={!file || !customerId}
                isLoading={previewMutation.isPending}
              >
                Preview Import
              </Button>
            </CardContent>
          </Card>

          {/* Expected Format */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                Expected Format
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Your CSV should have these columns:
              </p>
              <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <li>Date (MM/DD/YY)</li>
                <li>Begin (H:MM AM/PM)</li>
                <li>End (H:MM AM/PM)</li>
                <li>Total Minutes</li>
                <li>Task</li>
                <li>Requestor</li>
                <li>Company</li>
                <li>Cost</li>
                <li>Running Total</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {preview ? (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 rounded-xl bg-green-50/50 dark:bg-green-900/20">
                      <Check className="w-6 h-6 text-green-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {preview.rowCount}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Valid Entries
                      </p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-primary-50/50 dark:bg-primary-900/20">
                      <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        {formatDuration(preview.totalMinutes)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total Time
                      </p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-primary-50/50 dark:bg-primary-900/20">
                      <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        {formatCurrency(preview.totalCost)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total Value
                      </p>
                    </div>
                  </div>

                  {preview.skippedRows > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-50/50 dark:bg-yellow-900/20 mb-4">
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm text-yellow-700 dark:text-yellow-300">
                        {preview.skippedRows} empty or invalid rows will be skipped
                      </span>
                    </div>
                  )}

                  {/* Entries Table */}
                  <div className="max-h-96 overflow-y-auto scrollbar-thin">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Task</TableHead>
                          <TableHead>Requestor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.entries.map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {formatDate(new Date(entry.entryDate))}
                            </TableCell>
                            <TableCell>
                              {entry.startTime || '-'} - {entry.endTime || '-'}
                            </TableCell>
                            <TableCell>{formatDuration(entry.totalMinutes)}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {entry.taskDescription}
                            </TableCell>
                            <TableCell>{entry.requestor || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Import Button */}
                  <div className="mt-6 flex justify-end">
                    <Button
                      variant="primary"
                      onClick={handleImport}
                      isLoading={importMutation.isPending}
                    >
                      Import {preview.rowCount} Entries
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a customer and upload a CSV file to preview the import</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
