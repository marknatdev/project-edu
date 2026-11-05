import { z } from 'zod';
import type { BomItem } from '@/types/domain';
export type { BomItem } from '@/types/domain';

const PriceSchema = z.number().finite().min(0).max(1_000_000).refine(
  (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
  'ใช้ทศนิยมไม่เกิน 2 ตำแหน่ง',
);
export const BomItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(1).max(9999),
  unitPriceBaht: PriceSchema,
  useSchoolSubstitute: z.boolean(),
  substitutePriceBaht: PriceSchema,
});
export const BomSchema = z.array(BomItemSchema).max(200).refine(
  (items) => new Set(items.map((item) => item.id)).size === items.length,
  'รายการต้องมีรหัสไม่ซ้ำกัน',
);

/** Money is summed in integer satang, then presented as baht. */
export function calculateBudget(items: BomItem[], budgetBaht: number | null) {
  BomSchema.parse(items);
  if (budgetBaht !== null) z.number().finite().min(0).parse(budgetBaht);
  const original = items.reduce((sum, item) => sum + Math.round(item.unitPriceBaht * 100) * item.quantity, 0);
  const total = items.reduce((sum, item) => sum + Math.round(
    (item.useSchoolSubstitute ? item.substitutePriceBaht : item.unitPriceBaht) * 100,
  ) * item.quantity, 0);
  const remaining = budgetBaht === null ? null : Math.round(budgetBaht * 100) - total;
  return {
    originalBaht: original / 100,
    totalBaht: total / 100,
    savedBaht: (original - total) / 100,
    remainingBaht: remaining === null ? null : remaining / 100,
    status: remaining === null ? 'unknown' : remaining < 0 ? 'over' : remaining === 0 ? 'at' : 'under',
  };
}
