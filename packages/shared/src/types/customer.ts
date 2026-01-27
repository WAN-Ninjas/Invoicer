export interface Customer {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  defaultHourlyRate: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerInput {
  name: string;
  email?: string;
  address?: string;
  defaultHourlyRate: number;
  notes?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string | null;
  address?: string | null;
  defaultHourlyRate?: number;
  notes?: string | null;
}

export interface CustomerWithStats extends Customer {
  totalInvoices: number;
  totalRevenue: number;
  unbilledEntries: number;
  unbilledAmount: number;
}
