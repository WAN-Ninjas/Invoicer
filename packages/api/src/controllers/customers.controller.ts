import type { Request, Response } from 'express';
import * as customerService from '../services/customer.service.js';
import { createCustomerSchema, updateCustomerSchema } from '@invoicer/shared';
import { AppError } from '../middleware/errorHandler.js';

export async function getAll(_req: Request, res: Response): Promise<void> {
  const customers = await customerService.getAllCustomers();
  res.json(customers);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const customer = await customerService.getCustomerWithStats(id);

  if (!customer) {
    throw new AppError(404, 'Customer not found');
  }

  res.json(customer);
}

export async function create(req: Request, res: Response): Promise<void> {
  const data = createCustomerSchema.parse(req.body);
  const customer = await customerService.createCustomer(data);
  res.status(201).json(customer);
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const data = updateCustomerSchema.parse(req.body);
  const customer = await customerService.updateCustomer(id, data);
  res.json(customer);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;

  try {
    await customerService.deleteCustomer(id);
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('existing invoices')) {
      throw new AppError(400, error.message);
    }
    throw error;
  }
}
