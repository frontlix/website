'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { vergetenAction, type WachtwoordVergetenState } from './actions'
import styles from '../login/page.module.css'

const initial: WachtwoordVergetenState = {}

export default function WachtwoordVergetenPage() {
  const [state, formAction, pending] = useActionState(vergetenAction, initial)

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Wachtwoord vergeten</h1>
      <p className={styles.subtitle}>
        Vul je e-mailadres in. We sturen een link waarmee je een nieuw wachtwoord kunt instellen.
      </p>

      {state?.success ? (
        <div className={styles.error} style={{ background: 'rgba(22,163,74,0.08)', borderColor: 'rgba(22,163,74,0.2)', color: '#15803d' }}>
          Als dit adres bij ons bekend is, ontvang je binnen een minuut een mail met instructies.
        </div>
      ) : (
        <form action={formAction} className={styles.form}>
          <label className={styles.label}>
            E-mail
            <input type="email" name="email" required autoComplete="email" className={styles.input} />
          </label>

          {state?.error && <p className={styles.error}>{state.error}</p>}

          <button type="submit" disabled={pending} className={styles.submit}>
            {pending ? 'Versturen…' : 'Verstuur reset-link'}
          </button>
        </form>
      )}

      <p className={styles.footer}>
        Wachtwoord weer voor de geest? <Link href="/login">Terug naar inloggen</Link>
      </p>
    </div>
  )
}
