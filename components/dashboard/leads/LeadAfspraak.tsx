'use client'

import { Calendar, Clock } from 'lucide-react'
import type { Lead } from '@/lib/dashboard/database.types'
import { formatDateNL } from '@/lib/dashboard/format'
import { AppointmentForm } from '@/components/dashboard/bot-actions/AppointmentForm'
import styles from './LeadAfspraak.module.css'

export function LeadAfspraak({ lead }: { lead: Lead }) {
  const heeft = lead.afspraak_datum && lead.afspraak_starttijd

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Afspraak</h3>
      {heeft ? (
        <>
          <div className={styles.afspraak}>
            <div className={styles.row}>
              <Calendar size={14} />
              <span>{formatDateNL(lead.afspraak_datum)}</span>
            </div>
            <div className={styles.row}>
              <Clock size={14} />
              <span>{lead.afspraak_starttijd}</span>
            </div>
            {lead.google_event_id && (
              <p className={styles.calendarNote}>Synced met Google Calendar</p>
            )}
          </div>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <AppointmentForm
              leadId={lead.lead_id}
              mode="reschedule"
              initialDate={lead.afspraak_datum}
              initialTime={lead.afspraak_starttijd}
            />
          </div>
        </>
      ) : (
        <>
          <p className={styles.empty}>Nog geen afspraak ingepland.</p>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <AppointmentForm leadId={lead.lead_id} mode="book" />
          </div>
        </>
      )}
    </div>
  )
}
