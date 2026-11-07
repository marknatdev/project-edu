import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExportPanel } from '@/components/export/ExportPanel';
import { ProposalEditor } from '@/components/proposal/ProposalEditor';
import { exportFixture } from '../fixtures/export';
import type { Project } from '@/types/domain';
// ADR 0003: sign-in is required before these pages, so they no longer offer "optional" Google login or Guest wording.
describe('Save/Export after required sign-in, rendered public UI seam', () => {
  it('keeps the local save action without an optional-login offer', () => {
    const html = renderToStaticMarkup(createElement(ProposalEditor, { proposal: exportFixture.proposal, onSave() {}, onReassemble() {} }));
    expect(html).toContain('บันทึกการแก้ไข');
    expect(html).not.toContain('ไม่บังคับ)');
    expect(html).not.toContain('Guest');
  });
  it('keeps export actions without Guest or optional-login wording', () => {
    const project = { ...exportFixture, id: 'synthetic', ideaId: 'synthetic', status: 'in_progress', createdAt: '', updatedAt: '' } as Project;
    const html = renderToStaticMarkup(createElement(ExportPanel, { project }));
    expect(html).toContain('Word (.docx)');
    expect(html).toContain('PDF / พิมพ์');
    expect(html).not.toContain('บัญชี Google (ไม่บังคับ)');
    expect(html).not.toContain('Guest');
  });
});
