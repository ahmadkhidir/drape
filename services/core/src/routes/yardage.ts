/**
 * Drape Yardage & Pattern Spec Routes
 * Spec Anchor: CONTRACTS.md#C-016, FEAT-007, NFR-006
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  calculateYardage,
  type StandardSize,
  type YardageCalculationInput,
} from '../services/yardage.js';

const STANDARD_SIZES: [StandardSize, ...StandardSize[]] = [
  'US_0',
  'US_2',
  'US_4',
  'US_6',
  'US_8',
  'US_10',
  'US_12',
  'US_14',
  'US_16',
  'US_18',
  'US_20',
  'US_22',
  'US_24',
];

const CalculateYardageSchema = z.object({
  silhouetteId: z.string({ required_error: 'Silhouette ID is required.' }).min(1, 'Silhouette ID cannot be empty.'),
  fabricId: z.string({ required_error: 'Fabric SKU is required.' }).min(1, 'Fabric SKU cannot be empty.'),
  heightCm: z
    .number({ required_error: 'Height in centimeters is required.' })
    .min(120.0, 'Height must be at least 120.0 cm.')
    .max(220.0, 'Height cannot exceed 220.0 cm.'),
  bustCircumferenceCm: z
    .number()
    .min(60.0, 'Bust circumference must be at least 60.0 cm.')
    .max(180.0, 'Bust circumference cannot exceed 180.0 cm.')
    .optional(),
  waistCircumferenceCm: z
    .number()
    .min(50.0, 'Waist circumference must be at least 50.0 cm.')
    .max(160.0, 'Waist circumference cannot exceed 160.0 cm.')
    .optional(),
  hipCircumferenceCm: z
    .number()
    .min(70.0, 'Hip circumference must be at least 70.0 cm.')
    .max(190.0, 'Hip circumference cannot exceed 190.0 cm.')
    .optional(),
  customTrainLengthInches: z
    .number()
    .min(0.0, 'Train length cannot be negative.')
    .max(72.0, 'Train length cannot exceed 72.0 inches.')
    .optional(),
  standardSize: z.enum(STANDARD_SIZES).optional(),
});

export const yardageRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/v1/yardage/calculate
   * Public endpoint calculating tailored yardage, pattern pieces, and vector cutting marker layout.
   * Spec Anchor: C-016, FEAT-007, NFR-006
   */
  fastify.post('/api/v1/yardage/calculate', async (request, reply) => {
    const parseResult = CalculateYardageSchema.safeParse(request.body);

    if (!parseResult.success) {
      const fields: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const fieldName = issue.path.join('.') || 'body';
        fields[fieldName] = issue.message;
      }

      return reply.status(400).send({
        code: 'VALIDATION_FAILED',
        message: 'Measurements or dimensions outside acceptable physiological ranges.',
        fields,
      });
    }

    try {
      const calculation = await calculateYardage(parseResult.data as YardageCalculationInput);
      return reply.status(200).send(calculation);
    } catch (err: any) {
      if (err.code === 'FABRIC_OR_SILHOUETTE_NOT_FOUND' || err.statusCode === 404) {
        return reply.status(404).send({
          code: 'FABRIC_OR_SILHOUETTE_NOT_FOUND',
          message: err.message || 'Specified fabric SKU or silhouette block not found.',
        });
      }

      fastify.log.error(err);
      return reply.status(500).send({
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while calculating pattern layout.',
      });
    }
  });
};
