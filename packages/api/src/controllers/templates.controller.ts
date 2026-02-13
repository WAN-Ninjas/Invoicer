import type { Request, Response } from 'express';
import * as templateService from '../services/template.service.js';
import type { TemplateType, UpdateTemplateInput } from '@invoicer/shared';
import { AppError } from '../middleware/errorHandler.js';

const VALID_TEMPLATE_TYPES: TemplateType[] = ['invoice_email', 'reminder_email', 'invoice_pdf'];

function isValidTemplateType(type: string): type is TemplateType {
  return VALID_TEMPLATE_TYPES.includes(type as TemplateType);
}

export async function getAll(_req: Request, res: Response): Promise<void> {
  const templates = await templateService.getAllTemplates();
  res.json(templates);
}

export async function getByType(req: Request, res: Response): Promise<void> {
  const type = req.params.type as string;

  if (!isValidTemplateType(type)) {
    throw new AppError(400, `Invalid template type: ${type}`);
  }

  const template = await templateService.getTemplate(type);

  if (!template) {
    // Return default template if not found in database
    const defaultTemplate = templateService.getDefaultTemplate(type);
    res.json({
      id: null,
      type,
      name: defaultTemplate.name,
      subject: defaultTemplate.subject,
      htmlContent: defaultTemplate.htmlContent,
      isDefault: true,
    });
    return;
  }

  res.json(template);
}

export async function update(req: Request, res: Response): Promise<void> {
  const type = req.params.type as string;

  if (!isValidTemplateType(type)) {
    throw new AppError(400, `Invalid template type: ${type}`);
  }

  const input: UpdateTemplateInput = {
    name: req.body.name,
    subject: req.body.subject,
    htmlContent: req.body.htmlContent,
  };

  // Ensure template exists (create from default if not)
  let template = await templateService.getTemplate(type);
  if (!template) {
    const defaultTemplate = templateService.getDefaultTemplate(type);
    const { prisma } = await import('../config/database.js');
    template = await prisma.template.create({
      data: {
        type,
        name: defaultTemplate.name,
        subject: defaultTemplate.subject,
        htmlContent: defaultTemplate.htmlContent,
      },
    });
  }

  const updated = await templateService.updateTemplate(type, input);
  res.json(updated);
}

export async function reset(req: Request, res: Response): Promise<void> {
  const type = req.params.type as string;

  if (!isValidTemplateType(type)) {
    throw new AppError(400, `Invalid template type: ${type}`);
  }

  // Ensure template exists (create from default if not)
  let template = await templateService.getTemplate(type);
  if (!template) {
    const defaultTemplate = templateService.getDefaultTemplate(type);
    const { prisma } = await import('../config/database.js');
    template = await prisma.template.create({
      data: {
        type,
        name: defaultTemplate.name,
        subject: defaultTemplate.subject,
        htmlContent: defaultTemplate.htmlContent,
      },
    });
    res.json(template);
    return;
  }

  const resetTemplate = await templateService.resetToDefault(type);
  res.json(resetTemplate);
}

export async function preview(req: Request, res: Response): Promise<void> {
  const type = req.params.type as string;
  const { htmlContent } = req.body;

  if (!isValidTemplateType(type)) {
    throw new AppError(400, `Invalid template type: ${type}`);
  }

  if (!htmlContent || typeof htmlContent !== 'string') {
    throw new AppError(400, 'htmlContent is required');
  }

  const sampleContext = templateService.getSampleContext();
  const processedHtml = templateService.processTemplate(htmlContent, sampleContext);

  res.json({
    html: processedHtml,
    context: sampleContext,
  });
}
