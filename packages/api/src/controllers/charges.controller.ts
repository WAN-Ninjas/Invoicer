import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as chargeService from '../services/charge.service.js';
import type { ChargeType } from '../generated/prisma/client.js';

export const createCharge = asyncHandler(async (req: Request, res: Response) => {
  const { customerId, chargeType, description, quantity, unitPrice, chargeDate, notes, invoiceId } = req.body;

  const charge = await chargeService.createCharge({
    customerId,
    chargeType: chargeType as ChargeType,
    description,
    quantity: quantity ? parseFloat(quantity) : 1,
    unitPrice: parseFloat(unitPrice),
    chargeDate: new Date(chargeDate),
    notes,
    invoiceId,
  });

  res.status(201).json(charge);
});

export const updateCharge = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { chargeType, description, quantity, unitPrice, chargeDate, notes } = req.body;

  const charge = await chargeService.updateCharge(id, {
    chargeType: chargeType as ChargeType | undefined,
    description,
    quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
    unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
    chargeDate: chargeDate ? new Date(chargeDate) : undefined,
    notes,
  });

  res.json(charge);
});

export const deleteCharge = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await chargeService.deleteCharge(id);
  res.status(204).send();
});

export const getCharge = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const charge = await chargeService.getChargeById(id);

  if (!charge) {
    res.status(404).json({ error: 'Charge not found' });
    return;
  }

  res.json(charge);
});

export const getAllCharges = asyncHandler(async (req: Request, res: Response) => {
  const { customerId, chargeType, startDate, endDate, unbilledOnly } = req.query;

  const charges = await chargeService.getAllCharges({
    customerId: customerId as string | undefined,
    chargeType: chargeType as ChargeType | undefined,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    unbilledOnly: unbilledOnly === 'true',
  });

  res.json(charges);
});

export const getUnbilledCharges = asyncHandler(async (req: Request, res: Response) => {
  const { customerId } = req.query;
  const charges = await chargeService.getUnbilledCharges(customerId as string | undefined);
  res.json(charges);
});

export const getChargeTypes = asyncHandler(async (_req: Request, res: Response) => {
  const types = [
    { value: 'service', label: 'Service Fee', description: 'Monthly/recurring service fees' },
    { value: 'software', label: 'Software License', description: 'Software licenses and subscriptions' },
    { value: 'hardware', label: 'Hardware/Product', description: 'Physical items and hardware' },
    { value: 'consulting', label: 'Consulting', description: 'One-time consulting fees' },
    { value: 'expense', label: 'Expense', description: 'Reimbursable expenses' },
    { value: 'other', label: 'Other', description: 'Miscellaneous charges' },
  ];
  res.json(types);
});
