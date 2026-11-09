import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderDartCatalog } from '@/lib/mobile/dart-catalog';
import { SUBFIELDS, SUBJECTS } from '@/data/subfields';
import { SCIENCE_TOPIC_CARDS } from '@/data/cards/science';
import { COMPUTER_TOPIC_CARDS } from '@/data/cards/computer';
import { MATHEMATICS_TOPIC_CARDS } from '@/data/cards/mathematics';

const TARGET = resolve(__dirname, '../../mobile/lib/discovery/catalog.g.dart');
const cards = [...SCIENCE_TOPIC_CARDS, ...COMPUTER_TOPIC_CARDS, ...MATHEMATICS_TOPIC_CARDS];

describe('mobile Dart topic catalog (ADR 0006)', () => {
  const rendered = renderDartCatalog(SUBJECTS, SUBFIELDS, cards);

  it('is in sync with src/data', () => {
    if (process.env.UPDATE_DART_CATALOG === '1') writeFileSync(TARGET, rendered, 'utf8');
    expect(readFileSync(TARGET, 'utf8').replace(/\r\n/g, '\n')).toBe(rendered);
  });

  it('escapes Dart string metacharacters', () => {
    const out = renderDartCatalog(
      [{ id: 's', nameTh: "it's $5 \\ ok\nnext", nameEn: '', description: '', icon: '' }],
      [],
      [],
    );
    expect(out).toContain("nameTh: 'it\\'s \\$5 \\\\ ok\\nnext'");
  });

  it('exports every catalog card', () => {
    expect(cards.length).toBe(90);
    expect((rendered.match(/^ {2}DiscoveryCard\(/gm) ?? []).length).toBe(90);
  });
});
