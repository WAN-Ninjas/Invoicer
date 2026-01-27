export type ChargeType = 'service' | 'software' | 'hardware' | 'consulting' | 'expense' | 'other';

export interface Charge {
  id: string;
  invoiceId: string | null;
  customerId: string;
  chargeType: ChargeType;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  chargeDate: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChargeInput {
  customerId: string;
  chargeType: ChargeType;
  description: string;
  quantity?: number;
  unitPrice: number;
  chargeDate: Date | string;
  notes?: string;
  invoiceId?: string;
}

export interface UpdateChargeInput {
  chargeType?: ChargeType;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  chargeDate?: Date | string;
  notes?: string;
}

export const CHARGE_TYPE_LABELS: Record<ChargeType, string> = {
  service: 'Service Fee',
  software: 'Software License',
  hardware: 'Hardware/Product',
  consulting: 'Consulting',
  expense: 'Expense',
  other: 'Other',
};
