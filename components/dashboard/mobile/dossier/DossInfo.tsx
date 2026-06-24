'use client'

import { MapPin } from 'lucide-react'
import {
  DossLabel,
  DossRow,
  DossCheckPill,
  DossDotRow,
} from './DossAtoms'
import { streetViewHref, satelliteHref } from '@/lib/dashboard/maps-links'
import type { DossierLead, DossBijzonder } from './dossier-mock'
import styles from './DossInfo.module.css'

// ── DossInfo ──
// Info-tab: Contact, Dienst en Bijzonderheden, gevoed met echte lead-data
// (props) i.p.v. de DOSS-mock.
type DossInfoProps = {
  lead: Pick<DossierLead, 'm2' | 'id'>
  contact: { telefoon: string; email: string; adres: string; afstand: number | null; lat: number | null; lng: number | null }
  /** Genormaliseerd WhatsApp-nummer (0→31, alleen cijfers); leeg → geen WA-link. */
  waTel: string
  dienst: { hoofd: string; sub: string[] }
  bijzonderheden: DossBijzonder[]
}

export function DossInfo({ lead, contact, waTel, dienst, bijzonderheden }: DossInfoProps) {
  // Echte maps-link op het adres (alleen als er een adres is; mapper geeft '—').
  const heeftAdres = contact.adres !== '—' && contact.adres.trim() !== ''
  const mapsHref = heeftAdres
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.adres)}`
    : undefined
  // Street View + Satelliet op de geocode-coordinaten (m2 + terras inschatten).
  // Alleen tonen als de lead coordinaten heeft; anders dekt de maps-pin het al.
  const streetView = streetViewHref(contact.lat, contact.lng)
  const satelliet = satelliteHref(contact.lat, contact.lng)
  const viewLinks =
    streetView && satelliet
      ? [
          { label: 'Street View', href: streetView },
          { label: 'Satelliet', href: satelliet },
        ]
      : []
  return (
    <div className={styles.wrap}>
      {/* Contact-kaart: telefoon + e-mail + adres met getinte actie-knop. */}
      <section>
        <DossLabel>Contact</DossLabel>
        <div className={styles.card}>
          <DossRow
            icon="phone"
            label="Telefoon"
            value={contact.telefoon}
            // WhatsApp-icoon → het IN-APP gesprek met deze lead (inbox-thread),
            // niet de externe WhatsApp-app. Geen link zonder telefoonnummer.
            action={{ icon: 'wa', tone: 'var(--color-whatsapp)', href: waTel ? `/inbox?lead=${lead.id}` : undefined }}
          />
          <DossRow icon="mail" label="E-mail" value={contact.email} />
          <DossRow
            icon="pin"
            label={contact.afstand != null ? `Adres · ${contact.afstand} km` : 'Adres'}
            value={contact.adres}
            action={{ icon: 'pin', tone: 'var(--color-primary)', href: mapsHref }}
          />
          {viewLinks.length > 0 && (
            <div className={styles.locLinks}>
              {viewLinks.map((link) => (
                <a
                  key={link.label}
                  className={styles.locLink}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin size={12} aria-hidden="true" />
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Dienst-kaart: hoofd-dienst + check-pills per sub + een m²-pill. */}
      <section>
        <DossLabel>Dienst</DossLabel>
        <div className={styles.serviceCard}>
          <div className={styles.serviceTitle}>{dienst.hoofd}</div>
          <div className={styles.pillRow}>
            {dienst.sub.map((s) => (
              <DossCheckPill key={s}>{s}</DossCheckPill>
            ))}
            {lead.m2 > 0 && <span className={styles.m2Pill}>{lead.m2} m²</span>}
          </div>
        </div>
      </section>

      {/* Bijzonderheden: gekleurde dot-rijen (alleen tonen als er iets is). */}
      {bijzonderheden.length > 0 && (
        <section>
          <DossLabel>Bijzonderheden</DossLabel>
          <div className={styles.card}>
            {bijzonderheden.map((b) => (
              <DossDotRow key={b.l} tone={b.tone} label={b.l} value={b.v} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
