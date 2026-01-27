import type { Request, Response } from 'express';
import * as settingsService from '../services/settings.service.js';
import type { PublicSettings, UpdateSettingsInput } from '@invoicer/shared';

export async function getSettings(req: Request, res: Response): Promise<void> {
  const settings = await settingsService.getSettings();

  // Don't expose password hash or sensitive SMTP credentials
  const safeSettings = {
    ...settings,
    appPassword: settings.appPassword ? '********' : '',
    mailgunSmtpPass: settings.mailgunSmtpPass ? '********' : '',
  };

  res.json(safeSettings);
}

export async function getPublicSettings(_req: Request, res: Response): Promise<void> {
  const settings = await settingsService.getSettings();

  const publicSettings: PublicSettings = {
    companyName: settings.companyName,
    companyLogo: settings.companyLogo,
    defaultHourlyRate: settings.defaultHourlyRate,
    defaultTaxRate: settings.defaultTaxRate,
    invoicePrefix: settings.invoicePrefix,
  };

  res.json(publicSettings);
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const updates: UpdateSettingsInput = req.body;

  // Filter out empty password updates (don't change if not provided)
  if (updates.appPassword === '' || updates.appPassword === '********') {
    delete updates.appPassword;
  }
  if (updates.mailgunSmtpPass === '' || updates.mailgunSmtpPass === '********') {
    delete updates.mailgunSmtpPass;
  }

  const settings = await settingsService.updateSettings(updates);

  // Don't expose password hash
  const safeSettings = {
    ...settings,
    appPassword: settings.appPassword ? '********' : '',
    mailgunSmtpPass: settings.mailgunSmtpPass ? '********' : '',
  };

  res.json(safeSettings);
}

export async function uploadLogo(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  // Update settings with the new logo filename
  await settingsService.updateSettings({
    companyLogo: req.file.filename,
  });

  res.json({
    success: true,
    filename: req.file.filename,
  });
}
