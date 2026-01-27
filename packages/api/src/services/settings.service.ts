import { prisma } from '../config/database.js';
import type { AppSettings, UpdateSettingsInput } from '@invoicer/shared';
import bcrypt from 'bcryptjs';

const DEFAULT_SETTINGS: AppSettings = {
  appPassword: '',
  companyName: 'Your Company',
  companyAddress: '',
  companyLogo: null,
  companyEmail: null,
  companyPhone: null,
  defaultHourlyRate: 90,
  defaultTaxRate: 0,
  invoicePrefix: 'INV-',
  invoiceTerms: 'Payment due within 30 days.',
  mailgunSmtpHost: 'smtp.mailgun.org',
  mailgunSmtpPort: 587,
  mailgunSmtpUser: '',
  mailgunSmtpPass: '',
  mailgunFromEmail: '',
};

export async function getSettings(): Promise<AppSettings> {
  const settings = await prisma.setting.findMany();

  const result = { ...DEFAULT_SETTINGS };

  for (const setting of settings) {
    const key = setting.key as keyof AppSettings;
    if (key in result) {
      // Prisma Json type wraps primitives, extract the actual value
      const value = setting.value;
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  const setting = await prisma.setting.findUnique({
    where: { key },
  });

  if (setting) {
    return setting.value as AppSettings[K];
  }

  return DEFAULT_SETTINGS[key];
}

export async function updateSettings(input: UpdateSettingsInput): Promise<AppSettings> {
  const updates: Array<{ key: string; value: unknown }> = [];

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null) {
      let processedValue = value;

      // Hash password if being updated
      if (key === 'appPassword' && typeof value === 'string' && value.length > 0) {
        processedValue = await bcrypt.hash(value, 10);
      }

      updates.push({ key, value: processedValue });
    }
  }

  console.log('Updating settings:', updates.map(u => ({ key: u.key, valueType: typeof u.value })));

  // Upsert all settings
  await Promise.all(
    updates.map((update) =>
      prisma.setting.upsert({
        where: { key: update.key },
        update: { value: update.value as never },
        create: { key: update.key, value: update.value as never },
      })
    )
  );

  const result = await getSettings();
  console.log('Settings after update:', {
    companyName: result.companyName,
    companyEmail: result.companyEmail,
    companyAddress: result.companyAddress
  });

  return result;
}

export async function verifyPassword(password: string): Promise<boolean> {
  const storedHash = await getSetting('appPassword');

  // If no password is set, allow access (first-time setup)
  if (!storedHash || storedHash === '') {
    return true;
  }

  return bcrypt.compare(password, storedHash);
}

export async function isPasswordSet(): Promise<boolean> {
  const storedHash = await getSetting('appPassword');
  return Boolean(storedHash && storedHash !== '');
}

export async function initializeSettings(): Promise<void> {
  // Check if settings exist, if not create defaults
  const existingSettings = await prisma.setting.findMany();

  if (existingSettings.length === 0) {
    console.log('Initializing default settings...');

    const defaultEntries = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
      key,
      value: value as never,
    }));

    await prisma.setting.createMany({
      data: defaultEntries,
      skipDuplicates: true,
    });
  }
}
