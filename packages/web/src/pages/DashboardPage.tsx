import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileText,
  DollarSign,
  Clock,
  AlertCircle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { invoicesApi, entriesApi, customersApi } from '@/services/api';
import { formatCurrency, formatDate } from '@invoicer/shared';
import type { Invoice, InvoiceSummary, TimesheetEntry, Customer } from '@invoicer/shared';

export function DashboardPage() {
  const { data: summary } = useQuery<InvoiceSummary>({
    queryKey: ['invoices', 'summary'],
    queryFn: async () => {
      const response = await invoicesApi.getSummary();
      return response.data;
    },
  });

  const { data: recentInvoices } = useQuery<Invoice[]>({
    queryKey: ['invoices', 'recent'],
    queryFn: async () => {
      const response = await invoicesApi.getAll();
      return response.data.slice(0, 5);
    },
  });

  const { data: unbilledEntries } = useQuery<TimesheetEntry[]>({
    queryKey: ['entries', 'unbilled'],
    queryFn: async () => {
      const response = await entriesApi.getAll({ unbilledOnly: 'true' });
      return response.data;
    },
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await customersApi.getAll();
      return response.data;
    },
  });

  const unbilledTotal = unbilledEntries?.reduce((sum, e) => sum + e.calculatedCost, 0) || 0;
  const unbilledMinutes = unbilledEntries?.reduce((sum, e) => sum + e.totalMinutes, 0) || 0;

  const stats = [
    {
      label: 'Draft Invoices',
      value: summary?.totalDraft || 0,
      amount: formatCurrency(summary?.amountDraft || 0),
      icon: FileText,
      color: 'text-gray-500',
      bgColor: 'bg-gray-100/50 dark:bg-gray-800/50',
    },
    {
      label: 'Pending Payment',
      value: summary?.totalSent || 0,
      amount: formatCurrency(summary?.amountSent || 0),
      icon: DollarSign,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100/50 dark:bg-blue-900/30',
    },
    {
      label: 'Paid This Month',
      value: summary?.totalPaid || 0,
      amount: formatCurrency(summary?.amountPaid || 0),
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-100/50 dark:bg-green-900/30',
    },
    {
      label: 'Overdue',
      value: summary?.totalOverdue || 0,
      amount: formatCurrency(summary?.amountOverdue || 0),
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-100/50 dark:bg-red-900/30',
    },
  ];

  return (
    <div className="animate-fade-in">
      <Header
        title="Dashboard"
        subtitle="Overview of your invoicing activity"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.label} variant="subtle">
            <CardContent className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="stat-value">{stat.value}</p>
                <p className="stat-label">{stat.label}</p>
                <p className={`text-sm font-medium ${stat.color}`}>{stat.amount}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Unbilled Summary */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-500" />
            Unbilled Time
          </CardTitle>
          <Link to="/invoices/new">
            <Button variant="primary" size="sm">
              Create Invoice
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-primary-50/50 dark:bg-primary-900/20">
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {unbilledEntries?.length || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Entries</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-primary-50/50 dark:bg-primary-900/20">
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {Math.floor(unbilledMinutes / 60)}h {unbilledMinutes % 60}m
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Time</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-primary-50/50 dark:bg-primary-900/20">
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {formatCurrency(unbilledTotal)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Link to="/invoices" className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentInvoices && recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {recentInvoices.map((invoice) => {
                  const customer = customers?.find((c) => c.id === invoice.customerId);
                  return (
                    <Link
                      key={invoice.id}
                      to={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-white/30 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {customer?.name || 'Unknown'} - {formatDate(invoice.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(invoice.total)}
                        </p>
                        <StatusBadge status={invoice.status} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No invoices yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/import" className="block">
              <Button variant="secondary" className="w-full justify-start">
                <Clock className="w-5 h-5 mr-3" />
                Import Timesheet CSV
              </Button>
            </Link>
            <Link to="/entries/new" className="block">
              <Button variant="secondary" className="w-full justify-start">
                <Clock className="w-5 h-5 mr-3" />
                Add Manual Entry
              </Button>
            </Link>
            <Link to="/customers/new" className="block">
              <Button variant="secondary" className="w-full justify-start">
                <FileText className="w-5 h-5 mr-3" />
                Add New Customer
              </Button>
            </Link>
            <Link to="/invoices/new" className="block">
              <Button variant="primary" className="w-full justify-start">
                <FileText className="w-5 h-5 mr-3" />
                Create New Invoice
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
