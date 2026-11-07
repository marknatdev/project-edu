import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExportPanel } from '@/components/export/ExportPanel';
import { ProposalEditor } from '@/components/proposal/ProposalEditor';
import { exportFixture } from '../fixtures/export';
import type { Project } from '@/types/domain';
describe('Save/Export optional account offering, rendered public UI seam', () => {
  it('offers optional Google login near Save without replacing the local save action', () => {
    const html = renderToStaticMarkup(createElement(ProposalEditor, { proposal: exportFixture.proposal, onSave() {}, onReassemble() {} }));
    expect(html).toContain('บันทึกการแก้ไข');
    expect(html).toContain('บัญชี Google (ไม่บังคับ)');
    expect(html).toContain('ยังไม่ซิงค์โครงงานข้ามอุปกรณ์');
  });
  it('keeps Guest export actions available alongside an honest optional-login offer', () => {
    const project = { ...exportFixture, id: 'synthetic', ideaId: 'synthetic', status: 'in_progress', createdAt: '', updatedAt: '' } as Project;
    const html = renderToStaticMarkup(createElement(ExportPanel, { project }));
    expect(html).toContain('Word (.docx)');
    expect(html).toContain('PDF / พิมพ์');
    expect(html).toContain('บัญชี Google (ไม่บังคับ)');
    expect(html).toContain('ยังไม่ซิงค์โครงงานข้ามอุปกรณ์');
  });
});
