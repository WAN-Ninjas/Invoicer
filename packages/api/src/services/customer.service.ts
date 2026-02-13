import { prisma } from '../config/database.js';
import type {
  Customer,
  CustomerWithStats,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '@invoicer/shared';
import type { Prisma } from '../generated/prisma/client.js';
type Decimal = Prisma.Decimal;

function toNumber(decimal: Decimal | null | undefined): number {
  if (decimal === null || decimal === undefined) return 0;
  return decimal.toNumber();
}

function mapCustomer(customer: {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  defaultHourlyRate: Decimal;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Customer {
  return {
    ...customer,
    defaultHourlyRate: toNumber(customer.defaultHourlyRate),
  };
}

export async function getAllCustomers(): Promise<Customer[]> {
  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
  });

  return customers.map(mapCustomer);
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  return customer ? mapCustomer(customer) : null;
}

export async function getCustomerWithStats(id: string): Promise<CustomerWithStats | null> {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      invoices: {
        select: {
          id: true,
          total: true,
          status: true,
        },
      },
      timesheetEntries: {
        where: { invoiceId: null },
        select: {
          id: true,
          calculatedCost: true,
        },
      },
    },
  });

  if (!customer) return null;

  const totalInvoices = customer.invoices.length;
  const totalRevenue = customer.invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + toNumber(inv.total), 0);
  const unbilledEntries = customer.timesheetEntries.length;
  const unbilledAmount = customer.timesheetEntries.reduce(
    (sum, entry) => sum + toNumber(entry.calculatedCost),
    0
  );

  return {
    ...mapCustomer(customer),
    totalInvoices,
    totalRevenue,
    unbilledEntries,
    unbilledAmount,
  };
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const customer = await prisma.customer.create({
    data: {
      name: input.name,
      email: input.email || null,
      address: input.address || null,
      defaultHourlyRate: input.defaultHourlyRate,
      notes: input.notes || null,
    },
  });

  return mapCustomer(customer);
}

export async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      address: input.address,
      defaultHourlyRate: input.defaultHourlyRate,
      notes: input.notes,
    },
  });

  return mapCustomer(customer);
}

export async function deleteCustomer(id: string): Promise<void> {
  // Check if customer has invoices
  const invoiceCount = await prisma.invoice.count({
    where: { customerId: id },
  });

  if (invoiceCount > 0) {
    throw new Error('Cannot delete customer with existing invoices');
  }

  // Delete unbilled entries first
  await prisma.timesheetEntry.deleteMany({
    where: { customerId: id, invoiceId: null },
  });

  await prisma.customer.delete({
    where: { id },
  });
}

export async function findOrCreateCustomerByName(
  name: string,
  defaultRate: number
): Promise<Customer> {
  let customer = await prisma.customer.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name,
        defaultHourlyRate: defaultRate,
      },
    });
  }

  return mapCustomer(customer);
}
