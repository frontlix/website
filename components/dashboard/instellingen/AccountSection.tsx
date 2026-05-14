'use client'

import { useState, useTransition } from 'react'
import { Lock, Mail, Save } from 'lucide-react'
import {
  updatePasswordAction,
  updateEmailAction,
} from '@/lib/dashboard/account-actions'
import styles from './AccountSection.module.css'

export function AccountSection({ email }: { email: string }) {
  return (
    <div className={styles.stack}>
      <PasswordCard />
      <EmailCard currentEmail={email} />
    </div>
  )
}

function PasswordCard() {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setMsg(null)
    startTransition(async () => {
      const result = await updatePasswordAction(fd)
      setMsg(result.ok ? { ok: true, text: result.message ?? 'Opgeslagen.' } : { ok: false, text: result.error })
      if (result.ok) (e.target as HTMLFormElement).reset()
    })
  }

  return (
    <form onSubmit={onSubmit} className={`${styles.card} dash-card`}>
      <div className={styles.cardHead}>
        <Lock size={18} />
        <div>
          <div className={styles.cardTitle}>Wachtwoord wijzigen</div>
          <div className={styles.cardSub}>Minimaal 8 karakters — gebruik iets sterks.</div>
        </div>
      </div>
      <div className={styles.fields}>
        <Field label="Huidig wachtwoord">
          <input type="password" name="huidig" required autoComplete="current-password" className={styles.input} />
        </Field>
        <Field label="Nieuw wachtwoord">
          <input type="password" name="nieuw" required autoComplete="new-password" minLength={8} className={styles.input} />
        </Field>
        <Field label="Herhaal nieuw wachtwoord">
          <input type="password" name="herhaal" required autoComplete="new-password" minLength={8} className={styles.input} />
        </Field>
      </div>
      {msg && <div className={msg.ok ? styles.ok : styles.error}>{msg.text}</div>}
      <button type="submit" disabled={pending} className={styles.submitBtn}>
        <Save size={13} /> {pending ? 'Opslaan…' : 'Wachtwoord opslaan'}
      </button>
    </form>
  )
}

function EmailCard({ currentEmail }: { currentEmail: string }) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setMsg(null)
    startTransition(async () => {
      const result = await updateEmailAction(fd)
      setMsg(result.ok ? { ok: true, text: result.message ?? 'Opgeslagen.' } : { ok: false, text: result.error })
    })
  }

  return (
    <form onSubmit={onSubmit} className={`${styles.card} dash-card`}>
      <div className={styles.cardHead}>
        <Mail size={18} />
        <div>
          <div className={styles.cardTitle}>E-mailadres</div>
          <div className={styles.cardSub}>Huidig: {currentEmail}</div>
        </div>
      </div>
      <div className={styles.fields}>
        <Field label="Nieuw e-mailadres">
          <input type="email" name="email" required defaultValue={currentEmail} autoComplete="email" className={styles.input} />
        </Field>
      </div>
      {msg && <div className={msg.ok ? styles.ok : styles.error}>{msg.text}</div>}
      <button type="submit" disabled={pending} className={styles.submitBtn}>
        <Save size={13} /> {pending ? 'Versturen…' : 'Wijziging aanvragen'}
      </button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.label}>
      <span>{label}</span>
      {children}
    </label>
  )
}
