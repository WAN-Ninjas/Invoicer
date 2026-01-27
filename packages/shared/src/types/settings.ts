export interface AppSettings {
  appPassword: string;
  companyName: string;
  companyAddress: string;
  companyLogo: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  defaultHourlyRate: number;
  defaultTaxRate: number;
  invoicePrefix: string;
  invoiceTerms: string;
  mailgunSmtpHost: string;
  mailgunSmtpPort: number;
  mailgunSmtpUser: string;
  mailgunSmtpPass: string;
  mailgunFromEmail: string;
}

export interface UpdateSettingsInput {
  appPassword?: string;
  companyName?: string;
  companyAddress?: string;
  companyLogo?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  defaultHourlyRate?: number;
  defaultTaxRate?: number;
  invoicePrefix?: string;
  invoiceTerms?: string;
  mailgunSmtpHost?: string;
  mailgunSmtpPort?: number;
  mailgunSmtpUser?: string;
  mailgunSmtpPass?: string;
  mailgunFromEmail?: string;
}

export interface PublicSettings {
  companyName: string;
  companyLogo: string | null;
  defaultHourlyRate: number;
  defaultTaxRate: number;
  invoicePrefix: string;
}
