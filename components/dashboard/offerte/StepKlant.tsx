'use client'

import { Check } from 'lucide-react'
import type { ManualOfferteData } from '@/lib/dashboard/manual-offerte-types'
import styles from './ManualOfferteModal.module.css'

type SetFn = <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => void

export function StepKlant({ data, set }: { data: ManualOfferteData; set: SetFn }) {
  return (
    <>
      <div>
        <div className={styles.sectionLabel}>Klantgegevens</div>
        <div className={styles.sectionSub}>
          Telefoon is verplicht (om de offerte via WhatsApp te versturen). E-mail mag erbij voor de PDF.
        </div>
      </div>

      <div className={styles.grid2}>
        <Field label="Naam *">
          <input
            className={styles.input}
            value={data.naam}
            onChange={(e) => set('naam', e.target.value)}
            placeholder="Bv. Jan de Jong"
          />
        </Field>
        <Field label="Bedrijf (optioneel)">
          <input
            className={styles.input}
            value={data.bedrijf}
            onChange={(e) => set('bedrijf', e.target.value)}
            placeholder="Bv. VVE Schoonhof"
          />
        </Field>
        <Field label="Telefoon *">
          <input
            className={styles.input}
            value={data.telefoon}
            onChange={(e) => set('telefoon', e.target.value)}
            placeholder="06 - 12 34 56 78"
          />
        </Field>
        <Field label="E-mail">
          <input
            className={styles.input}
            value={data.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="jan@voorbeeld.nl"
          />
        </Field>
      </div>

      {/* Werk-adres */}
      <div>
        <div className={styles.kicker}>Werk-adres</div>
        <div className={styles.grid21} style={{ marginBottom: 12 }}>
          <Field label="Straat">
            <input
              className={styles.input}
              value={data.straat}
              onChange={(e) => set('straat', e.target.value)}
              placeholder="Bv. Beeklaan"
            />
          </Field>
          <Field label="Huisnummer">
            <input
              className={styles.input}
              value={data.huisnummer}
              onChange={(e) => set('huisnummer', e.target.value)}
              placeholder="14"
            />
          </Field>
        </div>
        <div className={styles.gridAddr}>
          <Field label="Postcode">
            <input
              className={styles.input}
              value={data.postcode}
              onChange={(e) => set('postcode', e.target.value)}
              placeholder="2611 GH"
            />
          </Field>
          <Field label="Plaats">
            <input
              className={styles.input}
              value={data.plaats}
              onChange={(e) => set('plaats', e.target.value)}
              placeholder="Delft"
            />
          </Field>
        </div>
      </div>

      {/* Factuur-adres */}
      <div>
        <div className={styles.kicker}>Factuur-adres</div>
        <button
          type="button"
          onClick={() => set('factuur_zelfde', !data.factuur_zelfde)}
          className={`${styles.checkCard} ${data.factuur_zelfde ? styles.checkCardActive : ''}`}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className={`${styles.checkBox} ${data.factuur_zelfde ? styles.checkBoxActive : ''}`}>
              {data.factuur_zelfde && <Check size={12} strokeWidth={3} />}
            </div>
            <div>
              <div className={`${styles.optLabel} ${data.factuur_zelfde ? styles.optLabelActive : ''}`}>
                Factuur-adres is gelijk aan werk-adres
              </div>
              <div className={styles.optSub}>
                {data.factuur_zelfde
                  ? 'Geen apart factuur-adres nodig'
                  : 'Vink uit om een afwijkend factuur-adres in te vullen'}
              </div>
            </div>
          </div>
        </button>

        {!data.factuur_zelfde && (
          <div
            style={{
              marginTop: 12,
              padding: 14,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              display: 'grid',
              gap: 12,
            }}
          >
            <div className={styles.grid21}>
              <Field label="Straat">
                <input
                  className={styles.input}
                  value={data.factuur_straat}
                  onChange={(e) => set('factuur_straat', e.target.value)}
                  placeholder="Bv. Postbusstraat"
                />
              </Field>
              <Field label="Huisnummer">
                <input
                  className={styles.input}
                  value={data.factuur_huisnummer}
                  onChange={(e) => set('factuur_huisnummer', e.target.value)}
                  placeholder="42"
                />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
              <Field label="Postcode">
                <input
                  className={styles.input}
                  value={data.factuur_postcode}
                  onChange={(e) => set('factuur_postcode', e.target.value)}
                  placeholder="2611 GH"
                />
              </Field>
              <Field label="Plaats">
                <input
                  className={styles.input}
                  value={data.factuur_plaats}
                  onChange={(e) => set('factuur_plaats', e.target.value)}
                  placeholder="Delft"
                />
              </Field>
            </div>
          </div>
        )}
      </div>

    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}
