import { describeContext } from '../../src/assistant/care-assistant.js';
import { ASSISTANT_EVAL } from '../fixtures/assistant-eval.js';
import { blind, parseCsv, score, SHEET_HEADER, toCsv } from './sheet.js';

describe('assistant eval set', () => {
  it('has 50 questions with unique ids across every topic', () => {
    expect(ASSISTANT_EVAL).toHaveLength(50);
    expect(new Set(ASSISTANT_EVAL.map((q) => q.id)).size).toBe(50);
    expect(new Set(ASSISTANT_EVAL.map((q) => q.topic)).size).toBe(8);
    for (const q of ASSISTANT_EVAL) {
      expect(q.focus.length).toBeGreaterThan(10);
      if (q.context) expect(describeContext(q.context)).toMatch(/bilgisi:\n/);
    }
  });
});

describe('scoring sheet', () => {
  it('round-trips Turkish text, semicolons, quotes and line breaks', () => {
    const rows = [
      [...SHEET_HEADER],
      [
        's01',
        'sulama',
        'Ne zaman; nasıl?',
        '',
        'odak',
        'A',
        'İki satır\n"tırnaklı" yanıt',
        '1',
        '1',
        '5',
        '',
      ],
    ];
    const text = toCsv(rows);
    expect(text.startsWith('\uFEFF')).toBe(true);
    expect(parseCsv(text)).toEqual(rows);
  });

  it('hides models behind letters', () => {
    const key = blind(['haiku', 'sonnet', 'opus'], () => 0);
    expect(Object.values(key).sort()).toEqual(['A', 'B', 'C']);
    expect(Object.keys(key).sort()).toEqual(['haiku', 'opus', 'sonnet']);
  });

  it('counts only graded answers and needs 85% correct and safe', () => {
    const rows = [
      [...SHEET_HEADER],
      ...Array.from({ length: 20 }, (_, i) => [
        `q${i}`,
        'genel',
        'soru',
        '',
        'odak',
        'A',
        'yanıt',
        i < 18 ? '1' : '0',
        '1',
        '4',
        '',
      ]),
      ...Array.from({ length: 20 }, (_, i) => [
        `q${i}`,
        'genel',
        'soru',
        '',
        'odak',
        'B',
        'yanıt',
        '1',
        i < 16 ? '1' : '0',
        i < 10 ? '' : '3',
        '',
      ]),
      ['q99', 'genel', 'soru', '', 'odak', 'B', 'yanıt', '', '', '', ''],
    ];
    const result = score(rows, { haiku: 'A', sonnet: 'B', opus: 'C' });
    expect(result).toEqual([
      {
        model: 'haiku',
        graded: 20,
        correctAndSafe: 0.9,
        turkish: 4,
        passes: true,
      },
      {
        model: 'sonnet',
        graded: 20,
        correctAndSafe: 0.8,
        turkish: 3,
        passes: false,
      },
      {
        model: 'opus',
        graded: 0,
        correctAndSafe: 0,
        turkish: null,
        passes: false,
      },
    ]);
  });
});
