import { prisma } from '../config/database.js';
import { Prisma, ChargeType } from '@prisma/client';

export interface CreateChargeInput {
  customerId: string;
  chargeType: ChargeType;
  description: string;
  quantity?: number;
  unitPrice: number;
  chargeDate: Date;
  notes?: string;
  invoiceId?: string;
}

export interface UpdateChargeInput {
  chargeType?: ChargeType;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  chargeDate?: Date;
  notes?: string;
}

export async function createCharge(data: CreateChargeInput) {
  const quantity = data.quantity ?? 1;
  const total = quantity * data.unitPrice;

  return prisma.charge.create({
    data: {
      customerId: data.customerId,
      chargeType: data.chargeType,
      description: data.description,
      quantity: new Prisma.Decimal(quantity),
      unitPrice: new Prisma.Decimal(data.unitPrice),
      total: new Prisma.Decimal(total),
      chargeDate: data.chargeDate,
      notes: data.notes,
      invoiceId: data.invoiceId,
    },
    include: {
      customer: true,
    },
  });
}

export async function updateCharge(id: string, data: UpdateChargeInput) {
  const existing = await prisma.charge.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Charge not found');
  }

  const quantity = data.quantity ?? Number(existing.quantity);
  const unitPrice = data.unitPrice ?? Number(existing.unitPrice);
  const total = quantity * unitPrice;

  return prisma.charge.update({
    where: { id },
    data: {
      ...data,
      quantity: data.quantity !== undefined ? new Prisma.Decimal(data.quantity) : undefined,
      unitPrice: data.unitPrice !== undefined ? new Prisma.Decimal(data.unitPrice) : undefined,
      total: new Prisma.Decimal(total),
    },
    include: {
      customer: true,
    },
  });
}

export async function deleteCharge(id: string) {
  return prisma.charge.delete({ where: { id } });
}

export async function getChargeById(id: string) {
  return prisma.charge.findUnique({
    where: { id },
    include: {
      customer: true,
      invoice: true,
    },
  });
}

export async function getChargesByCustomer(customerId: string, unbilledOnly = false) {
  return prisma.charge.findMany({
    where: {
      customerId,
      ...(unbilledOnly ? { invoiceId: null } : {}),
    },
    include: {
      customer: true,
    },
    orderBy: { chargeDate: 'desc' },
  });
}

export async function getUnbilledCharges(customerId?: string) {
  return prisma.charge.findMany({
    where: {
      invoiceId: null,
      ...(customerId ? { customerId } : {}),
    },
    include: {
      customer: true,
    },
    orderBy: [
      { customerId: 'asc' },
      { chargeDate: 'desc' },
    ],
  });
}

export async function assignChargesToInvoice(chargeIds: string[], invoiceId: string) {
  return prisma.charge.updateMany({
    where: { id: { in: chargeIds } },
    data: { invoiceId },
  });
}

export async function unassignChargesFromInvoice(invoiceId: string) {
  return prisma.charge.updateMany({
    where: { invoiceId },
    data: { invoiceId: null },
  });
}

export async function getAllCharges(options?: {
  customerId?: string;
  chargeType?: ChargeType;
  startDate?: Date;
  endDate?: Date;
  unbilledOnly?: boolean;
}) {
  const where: Prisma.ChargeWhereInput = {};

  if (options?.customerId) {
    where.customerId = options.customerId;
  }
  if (options?.chargeType) {
    where.chargeType = options.chargeType;
  }
  if (options?.startDate || options?.endDate) {
    where.chargeDate = {};
    if (options.startDate) {
      where.chargeDate.gte = options.startDate;
    }
    if (options.endDate) {
      where.chargeDate.lte = options.endDate;
    }
  }
  if (options?.unbilledOnly) {
    where.invoiceId = null;
  }

  return prisma.charge.findMany({
    where,
    include: {
      customer: true,
      invoice: true,
    },
    orderBy: { chargeDate: 'desc' },
  });
}
