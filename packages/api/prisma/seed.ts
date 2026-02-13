import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample customer
  const customer = await prisma.customer.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Acme Corp',
      email: 'billing@acme.example.com',
      address: '123 Business St\nSuite 100\nAnytown, ST 12345',
      defaultHourlyRate: 90,
      notes: 'Sample customer for demo purposes',
    },
  });

  console.log(`Created customer: ${customer.name}`);

  // Create some sample time entries
  const entries = [
    {
      id: '00000000-0000-0000-0001-000000000001',
      customerId: customer.id,
      entryDate: new Date('2024-01-15'),
      startTime: '09:00',
      endTime: '12:00',
      totalMinutes: 180,
      taskDescription: 'Initial system setup and configuration',
      requestor: 'Alex',
      calculatedCost: 270,
    },
    {
      id: '00000000-0000-0000-0001-000000000002',
      customerId: customer.id,
      entryDate: new Date('2024-01-16'),
      startTime: '14:00',
      endTime: '16:30',
      totalMinutes: 150,
      taskDescription: 'Network troubleshooting and optimization',
      requestor: 'Jordan',
      calculatedCost: 225,
    },
    {
      id: '00000000-0000-0000-0001-000000000003',
      customerId: customer.id,
      entryDate: new Date('2024-01-17'),
      startTime: '10:00',
      endTime: '11:00',
      totalMinutes: 60,
      taskDescription: 'User training session',
      requestor: 'Alex',
      calculatedCost: 90,
    },
  ];

  for (const entry of entries) {
    await prisma.timesheetEntry.upsert({
      where: { id: entry.id },
      update: {},
      create: entry,
    });
  }

  console.log(`Created ${entries.length} sample entries`);

  // Initialize default settings
  const defaultSettings = [
    { key: 'appPassword', value: '' },
    { key: 'companyName', value: 'Your Company' },
    { key: 'companyAddress', value: '' },
    { key: 'companyLogo', value: null },
    { key: 'companyEmail', value: null },
    { key: 'companyPhone', value: null },
    { key: 'defaultHourlyRate', value: 90 },
    { key: 'defaultTaxRate', value: 0 },
    { key: 'invoicePrefix', value: 'INV-' },
    { key: 'invoiceTerms', value: 'Payment due within 30 days.' },
    { key: 'mailgunSmtpHost', value: 'smtp.mailgun.org' },
    { key: 'mailgunSmtpPort', value: 587 },
    { key: 'mailgunSmtpUser', value: '' },
    { key: 'mailgunSmtpPass', value: '' },
    { key: 'mailgunFromEmail', value: '' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: { key: setting.key, value: setting.value as never },
    });
  }

  console.log('Initialized default settings');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
