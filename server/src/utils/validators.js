import { z } from 'zod';
import { STATUSES } from '../config/services.js';
export const idSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid record ID');
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'Use an international number, e.g. +91 98765 43210');
export const profileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254).optional().or(z.literal('')),
  })
  .strict();
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
export const studentQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(120).default(''),
  from: z.string().date().optional().or(z.literal('')),
  to: z.string().date().optional().or(z.literal('')),
});
export const requestQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(120).default(''),
  service: z.string().max(60).default(''),
  status: z.enum(STATUSES).or(z.literal('')).default(''),
});
const text = z.string().trim().max(300);
export const detailsSchema = z
  .object({
    researchArea: text.optional(),
    academicLevel: text.optional(),
    citationStyle: text.optional(),
    deadline: z.string().date().optional().or(z.literal('')),
    researchStage: text.optional(),
    publicationTarget: text.optional(),
    surveyScope: text.optional(),
    comparisonCriteria: text.optional(),
    documentType: text.optional(),
    copies: z.coerce.number().int().min(1).max(10000).optional(),
    pageCount: z.coerce.number().int().min(1).max(5000).optional(),
    printType: text.optional(),
    binding: text.optional(),
    deliveryAddress: z.string().trim().max(1500).optional(),
    branch: text.optional(),
    college: text.optional(),
    technology: text.optional(),
    projectStage: text.optional(),
  })
  .strict();
export const newRequestSchema = z
  .object({
    serviceSlug: z.string().min(1).max(60),
    title: z.string().trim().min(5, 'Please use at least 5 characters').max(160),
    description: z
      .string()
      .trim()
      .min(20, 'Please add at least 20 characters about your requirements')
      .max(6000),
    additionalInfo: z.string().trim().max(3000).default(''),
    details: detailsSchema.default({}),
    integrityAcknowledged: z.literal(true, {
      errorMap: () => ({ message: 'Please acknowledge the academic assistance policy' }),
    }),
  })
  .strict();
export const updateRequestSchema = z
  .object({ status: z.enum(STATUSES).optional(), adminNotes: z.string().max(6000).optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Provide a status or notes');
export function validateRequestFields(service, details) {
  for (const field of service.fields) {
    const value = details[field.key];
    if (field.required && (value === undefined || value === ''))
      throw new Error(`${field.label} is required`);
    if (field.type === 'select' && value && !field.options.includes(value))
      throw new Error(`Choose a valid ${field.label.toLowerCase()}`);
    if (
      field.type === 'number' &&
      value !== undefined &&
      (!Number.isInteger(value) || value < field.min || value > field.max)
    )
      throw new Error(`${field.label} must be between ${field.min} and ${field.max}`);
  }
}
