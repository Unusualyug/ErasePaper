import { z } from 'zod';
import config from '../config/env.js';

const CONTACT_NUMBER_KEY = 'publicWhatsappNumber';
const numberSchema = z
  .string()
  .trim()
  .min(8)
  .max(32)
  .regex(/^\+?[1-9][0-9\s().-]*[0-9]$/, 'Enter an international number with country code.')
  .refine((value) => value.startsWith('+') || value.replace(/\D/g, '').length >= 11, {
    message: 'Include the country code, for example +91 98257 51614.',
  })
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => /^[1-9]\d{7,14}$/.test(value), {
    message: 'Use 8–15 digits, including the country code.',
  });
const updateSchema = z.object({ whatsappNumber: numberSchema, confirmed: z.literal(true) }).strict();

export function createSiteConfigController(store) {
  async function currentNumber() {
    const saved = await store.settings.get(CONTACT_NUMBER_KEY);
    return typeof saved === 'string' && /^[1-9]\d{7,14}$/.test(saved) ? saved : config.whatsapp;
  }

  return {
    async publicConfig(req, res) {
      res.json({ mode: config.demo ? 'demo' : 'live', whatsappNumber: await currentNumber() });
    },
    async adminRead(req, res) {
      res.json({ whatsappNumber: await currentNumber() });
    },
    async update(req, res) {
      const { whatsappNumber } = updateSchema.parse(req.body);
      const current = await currentNumber();
      if (whatsappNumber !== current) {
        await store.withTransaction(async (tx) => {
          await store.settings.set(CONTACT_NUMBER_KEY, whatsappNumber, tx);
          await store.logs.create(
            {
              actorId: String(req.user._id),
              action: 'site.contact_number_updated',
              targetId: CONTACT_NUMBER_KEY,
              metadata: {},
            },
            tx,
          );
        });
      }
      res.json({ whatsappNumber });
    },
  };
}
