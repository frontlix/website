import { describe, it, expect } from 'vitest';
import { toMinM2BuitenStraal, toMaxAfstandKm } from './instellingen-mappers';

describe('werkgebied-grens mappers', () => {
  it('toMinM2BuitenStraal: waarde uit DB, anders default 200', () => {
    expect(toMinM2BuitenStraal({ radius_min_m2_buiten_straal: 150 } as never)).toBe(150);
    expect(toMinM2BuitenStraal({ radius_min_m2_buiten_straal: null } as never)).toBe(200);
    expect(toMinM2BuitenStraal(null)).toBe(200);
  });

  it('toMaxAfstandKm: waarde uit DB, anders null (geen grens)', () => {
    expect(toMaxAfstandKm({ radius_max_afstand_km: 250 } as never)).toBe(250);
    expect(toMaxAfstandKm({ radius_max_afstand_km: null } as never)).toBe(null);
    expect(toMaxAfstandKm(null)).toBe(null);
  });
});
