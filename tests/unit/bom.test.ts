import { describe, it, expect } from 'vitest';
import { calculateBudget, type BomItem } from '@/lib/bom/budget';
import { createMemoryStorage, createProject, getProject, updateProjectBom, updateProjectProposal, deleteProject, wipeAllLearnerData, STORAGE_KEY, loadState, BOM_RECOVERY_KEY } from '@/lib/storage/store';

// Public calculator seam explicitly requested by M5.2.
describe('Project BOM budget estimate', () => {
  it('totals quantity × unit price in baht and compares with Constraints.budgetBaht', () => {
    expect(calculateBudget([
      { id: 'board', name: 'บอร์ด', quantity: 2, unitPriceBaht: 150.25, useSchoolSubstitute: false, substitutePriceBaht: 0 },
      { id: 'wire', name: 'สายไฟ', quantity: 3, unitPriceBaht: 20.1, useSchoolSubstitute: false, substitutePriceBaht: 5 },
    ], 500)).toEqual({ originalBaht: 360.8, totalBaht: 360.8, savedBaht: 0, remainingBaht: 139.2, status: 'under' });
  });
  it('substitutes the per-unit school price only when selected and shows savings and excess', () => {
    expect(calculateBudget([
      { id: 'board', name: 'บอร์ด', quantity: 2, unitPriceBaht: 150, useSchoolSubstitute: true, substitutePriceBaht: 20 },
      { id: 'wire', name: 'สายไฟ', quantity: 3, unitPriceBaht: 20, useSchoolSubstitute: false, substitutePriceBaht: 0 },
    ], 80)).toEqual({ originalBaht: 360, totalBaht: 100, savedBaht: 260, remainingBaht: -20, status: 'over' });
  });
  it.each([-1, NaN, Infinity, 1.234, 1_000_001])('rejects invalid price %s rather than reporting a misleading budget', (price) => {
    expect(() => calculateBudget([
      { id: 'bad', name: 'วัสดุ', quantity: 1, unitPriceBaht: price, useSchoolSubstitute: false, substitutePriceBaht: 0 },
    ], 500)).toThrow();
  });
  it('accepts an existing large Constraints budget independently of the item-price cap', () => {
    expect(calculateBudget([], 100_000_000_000_000).remainingBaht).toBe(100_000_000_000_000);
  });
  it('handles free borrowing, zero/missing budget and an exact decimal total without false over-budget', () => {
    const item: BomItem = { id: 'x', name: 'วัสดุ', quantity: 3, unitPriceBaht: 0.1, useSchoolSubstitute: false, substitutePriceBaht: 0 };
    expect(calculateBudget([item], 0.3)).toMatchObject({ totalBaht: 0.3, remainingBaht: 0, status: 'at' });
    expect(calculateBudget([{ ...item, useSchoolSubstitute: true }], 0)).toMatchObject({ totalBaht: 0, savedBaht: 0.3, status: 'at' });
    expect(calculateBudget([item], 0)).toMatchObject({ status: 'over', remainingBaht: -0.3 });
    expect(calculateBudget([], null)).toMatchObject({ totalBaht: 0, status: 'unknown', remainingBaht: null });
    expect(calculateBudget([{ ...item, useSchoolSubstitute: true, substitutePriceBaht: 1 }], 5).savedBaht).toBe(-2.7);
  });
  it.each([0, -1, 1.5, 10000, NaN])('rejects invalid quantity %s', (quantity) => {
    expect(() => calculateBudget([{ id: 'x', name: 'วัสดุ', quantity, unitPriceBaht: 1, useSchoolSubstitute: false, substitutePriceBaht: 0 }], 10)).toThrow();
  });
  it('keeps persisted BOM unchanged when an invalid write or a storage write fails', () => {
    const storage = createMemoryStorage();
    createProject({ id: 'a' }, storage);
    const item: BomItem = { id: 'x', name: 'วัสดุ', quantity: 1, unitPriceBaht: 10, useSchoolSubstitute: false, substitutePriceBaht: 0 };
    updateProjectBom('a', [item], storage);
    expect(() => updateProjectBom('a', [{ ...item, name: '   ' }], storage)).toThrow();
    expect(() => updateProjectBom('a', [item, item], storage)).toThrow();
    expect(() => updateProjectBom('a', [], { ...storage, setItem: () => { throw new Error('QuotaExceededError'); } })).toThrow('QuotaExceededError');
    expect(getProject('a', storage)?.bom).toEqual([item]);
  });
  it('preserves unrelated Projects and raw data when a stored BOM is malformed', () => {
    const storage = createMemoryStorage();
    createProject({ id: 'a', title: 'โครงงาน A' }, storage);
    createProject({ id: 'b', title: 'โครงงาน B' }, storage);
    const raw = JSON.parse(storage.getItem(STORAGE_KEY)!);
    raw.projects[0].bom = [{ id: 'invalid', name: 'วัสดุ', quantity: 0 }];
    const damaged = JSON.stringify(raw);
    storage.setItem(STORAGE_KEY, damaged);
    const { state, recovered } = loadState(storage);
    expect(recovered).toBe(true);
    expect(state.projects.map((p) => p.title)).toEqual(['โครงงาน A', 'โครงงาน B']);
    expect(state.projects[0].bom).toBeUndefined();
    expect(storage.getItem(STORAGE_KEY)).toBe(damaged); // reading must not overwrite damaged source
    expect(() => updateProjectBom('b', [], { ...storage, setItem: (key, value) => {
      if (key === BOM_RECOVERY_KEY) throw new Error('backup quota');
      storage.setItem(key, value);
    } })).toThrow('backup quota');
    expect(storage.getItem(STORAGE_KEY)).toBe(damaged);
    updateProjectBom('b', [], storage);
    expect(storage.getItem(BOM_RECOVERY_KEY)).toBe(damaged); // original retained before next valid write
    expect(getProject('a', storage)?.title).toBe('โครงงาน A');
    wipeAllLearnerData(storage);
    expect(storage.getItem(BOM_RECOVERY_KEY)).toBeNull();
  });
  it('persists add/edit/delete per Project without affecting Proposal or other Projects', () => {
    const storage = createMemoryStorage();
    const a = createProject({ id: 'a' }, storage);
    const b = createProject({ id: 'b' }, storage);
    const item: BomItem = { id: 'x', name: 'บอร์ด', quantity: 2, unitPriceBaht: 150, useSchoolSubstitute: true, substitutePriceBaht: 0 };
    expect(getProject(a.id, storage)?.bom).toBeUndefined(); // legacy Project is readable
    updateProjectBom(a.id, [item], storage);
    expect(getProject(a.id, storage)?.bom).toEqual([item]);
    expect(getProject(b.id, storage)?.bom).toBeUndefined();
    updateProjectBom(a.id, [{ ...item, quantity: 3 }], storage);
    updateProjectProposal(a.id, { ...a.proposal, title: 'แก้เอกสาร' }, storage);
    expect(getProject(a.id, storage)?.bom?.[0].quantity).toBe(3);
    updateProjectBom(a.id, [], storage);
    expect(getProject(a.id, storage)?.bom).toEqual([]);
    expect(updateProjectBom('missing', [item], storage)).toBeNull();
    deleteProject(a.id, storage);
    expect(getProject(a.id, storage)).toBeNull();
    wipeAllLearnerData(storage);
    expect(getProject(b.id, storage)).toBeNull();
  });
});
