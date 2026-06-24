import { describe, it, expect } from 'vitest';
import { toMinM2BuitenStraal } from './instellingen-mappers';

describe('werkgebied-grens mappers', () => {
  it('toMinM2BuitenStraal: waarde uit DB, anders default 200', () => {
    expect(toMinM2BuitenStraal({ radius_min_m2_buiten_straal: 150 } as never)).toBe(150);
    expect(toMinM2BuitenStraal({ radius_min_m2_buiten_straal: null } as never)).toBe(200);
    expect(toMinM2BuitenStraal(null)).toBe(200);
  });
});
