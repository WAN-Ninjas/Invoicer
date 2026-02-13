import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FileUpload } from '@/components/ui/FileUpload';
import { TemplateEditor } from '@/components/templates/TemplateEditor';
import { settingsApi } from '@/services/api';
import { Building2, Mail, Lock, DollarSign, FileText } from 'lucide-react';
import { useState } from 'react';
import type { TemplateType } from '@invoicer/shared';

const TEMPLATE_TABS: { type: TemplateType; label: string }[] = [
  { type: 'invoice_email', label: 'Invoice Email' },
  { type: 'reminder_email', label: 'Reminder Email' },
  { type: 'invoice_pdf', label: 'Invoice PDF' },
];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('invoice_email');

  const { data: settings, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await settingsApi.get();
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return settingsApi.update(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      return settingsApi.uploadLogo(file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setLogoFile(null);
      toast.success('Logo uploaded');
    },
    onError: () => toast.error('Failed to upload logo'),
  });

  const handleCompanySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      companyName: formData.get('companyName'),
      companyEmail: formData.get('companyEmail'),
      companyPhone: formData.get('companyPhone'),
      companyAddress: formData.get('companyAddress'),
    });
  };

  const handleInvoiceSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      defaultHourlyRate: parseFloat(formData.get('defaultHourlyRate') as string),
      defaultTaxRate: parseFloat(formData.get('defaultTaxRate') as string) / 100,
      invoicePrefix: formData.get('invoicePrefix'),
      invoiceTerms: formData.get('invoiceTerms'),
    });
  };

  const handleEmailSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      mailgunSmtpHost: formData.get('mailgunSmtpHost'),
      mailgunSmtpPort: parseInt(formData.get('mailgunSmtpPort') as string),
      mailgunSmtpUser: formData.get('mailgunSmtpUser'),
      mailgunSmtpPass: formData.get('mailgunSmtpPass'),
      mailgunFromEmail: formData.get('mailgunFromEmail'),
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('appPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password && password.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    updateMutation.mutate({ appPassword: password });
  };

  const handleLogoUpload = () => {
    if (logoFile) {
      uploadLogoMutation.mutate(logoFile);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <Header title="Settings" />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Settings"
        subtitle="Configure your invoicing system"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-500" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form key={`company-${dataUpdatedAt}`} onSubmit={handleCompanySubmit} className="space-y-4">
              <Input
                label="Company Name"
                name="companyName"
                defaultValue={settings?.companyName}
              />
              <Input
                label="Email"
                name="companyEmail"
                type="email"
                defaultValue={settings?.companyEmail || ''}
              />
              <Input
                label="Phone"
                name="companyPhone"
                defaultValue={settings?.companyPhone || ''}
              />
              <Textarea
                label="Address"
                name="companyAddress"
                defaultValue={settings?.companyAddress || ''}
              />
              <Button type="submit" variant="primary" isLoading={updateMutation.isPending}>
                Save Company Info
              </Button>
            </form>

            {/* Logo Upload */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium mb-3">Company Logo</h4>
              {settings?.companyLogo && (
                <div className="mb-3">
                  <img
                    src={`/uploads/logos/${settings.companyLogo}`}
                    alt="Company Logo"
                    className="max-h-20 rounded-sm"
                  />
                </div>
              )}
              <FileUpload
                accept="image/*"
                value={logoFile}
                onChange={setLogoFile}
              />
              {logoFile && (
                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={handleLogoUpload}
                  isLoading={uploadLogoMutation.isPending}
                >
                  Upload Logo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary-500" />
              Invoice Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form key={`invoice-${dataUpdatedAt}`} onSubmit={handleInvoiceSubmit} className="space-y-4">
              <Input
                label="Default Hourly Rate"
                name="defaultHourlyRate"
                type="number"
                step="0.01"
                min="0"
                defaultValue={settings?.defaultHourlyRate}
              />
              <Input
                label="Default Tax Rate (%)"
                name="defaultTaxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={(settings?.defaultTaxRate || 0) * 100}
              />
              <Input
                label="Invoice Number Prefix"
                name="invoicePrefix"
                defaultValue={settings?.invoicePrefix}
              />
              <Textarea
                label="Invoice Terms"
                name="invoiceTerms"
                defaultValue={settings?.invoiceTerms || ''}
                placeholder="Payment due within 30 days..."
              />
              <Button type="submit" variant="primary" isLoading={updateMutation.isPending}>
                Save Invoice Settings
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary-500" />
              Mailgun SMTP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form key={`email-${dataUpdatedAt}`} onSubmit={handleEmailSubmit} className="space-y-4">
              <Input
                label="SMTP Host"
                name="mailgunSmtpHost"
                defaultValue={settings?.mailgunSmtpHost}
              />
              <Input
                label="SMTP Port"
                name="mailgunSmtpPort"
                type="number"
                defaultValue={settings?.mailgunSmtpPort}
              />
              <Input
                label="SMTP User"
                name="mailgunSmtpUser"
                defaultValue={settings?.mailgunSmtpUser}
              />
              <Input
                label="SMTP Password"
                name="mailgunSmtpPass"
                type="password"
                defaultValue={settings?.mailgunSmtpPass}
                placeholder="Enter new password to change"
              />
              <Input
                label="From Email"
                name="mailgunFromEmail"
                type="email"
                defaultValue={settings?.mailgunFromEmail}
              />
              <Button type="submit" variant="primary" isLoading={updateMutation.isPending}>
                Save Email Settings
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary-500" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form key={`password-${dataUpdatedAt}`} onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                label="New Password"
                name="appPassword"
                type="password"
                placeholder="Enter new password"
              />
              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="Confirm new password"
              />
              <p className="text-xs text-gray-500">
                Leave empty to keep current password. Clear to remove password protection.
              </p>
              <Button type="submit" variant="primary" isLoading={updateMutation.isPending}>
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Email & PDF Templates - Full width */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              Email & PDF Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Tab buttons */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
              {TEMPLATE_TABS.map((tab) => (
                <button
                  key={tab.type}
                  type="button"
                  onClick={() => setSelectedTemplate(tab.type)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    selectedTemplate === tab.type
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Template editor */}
            <TemplateEditor templateType={selectedTemplate} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
