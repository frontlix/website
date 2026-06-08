import { describe, it, expect } from 'vitest';
import { parseNl, toCommaStr } from './number-nl';

describe('parseNl', () => {
  it('parst komma-decimaal', () => {
    expect(parseNl('24,3')).toBe(24.3);
  });
  it('parst punt-decimaal ook', () => {
    expect(parseNl('24.3')).toBe(24.3);
  });
  it('parst een heel getal', () => {
    expect(parseNl('24')).toBe(24);
  });
  it('geeft NaN bij lege of ongeldige invoer', () => {
    expect(Number.isNaN(parseNl(''))).toBe(true);
    expect(Number.isNaN(parseNl('abc'))).toBe(true);
  });
});

describe('toCommaStr', () => {
  it('toont punt als komma', () => {
    expect(toCommaStr(24.3)).toBe('24,3');
  });
  it('laat hele getallen heel', () => {
    expect(toCommaStr(24)).toBe('24');
  });
});
