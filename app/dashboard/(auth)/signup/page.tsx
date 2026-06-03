'use client'

import { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { signupAction, type SignupState } from './actions'
import styles from './page.module.css'

const initialState: SignupState = {}

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, initialState)

  // Full page reload bij success, zelfde reden als in /login: voorkomt 404
  // op /wachtkamer door cookie-write race in Next.js Server Actions.
  useEffect(() => {
    if (state.redirectTo) {
      window.location.href = state.redirectTo
    }
  }, [state.redirectTo])

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Aanmelden</h1>
      <p className={styles.subtitle}>
        Vraag een dashboard-account aan. We bekijken je aanvraag handmatig en geven binnen 1 werkdag toegang.
      </p>

      <form action={formAction} className={styles.form}>
        <label className={styles.label}>
          Bedrijfsnaam
          <input type="text" name="bedrijfsnaam" required className={styles.input} />
        </label>

        <label className={styles.label}>
          E-mail
          <input type="email" name="email" required autoComplete="email" className={styles.input} />
        </label>

        <label className={styles.label}>
          Wachtwoord
          <input
            type="password"
            name="wachtwoord"
            required
            minLength={8}
            autoComplete="new-password"
            className={styles.input}
          />
          <span className={styles.hint}>Minstens 8 tekens.</span>
        </label>

        {state.error && <p className={styles.error}>{state.error}</p>}

        <button type="submit" disabled={pending || !!state.redirectTo} className={styles.submit}>
          {pending ? 'Bezig…' : state.redirectTo ? 'Doorsturen…' : 'Aanvraag versturen'}
        </button>
      </form>

      <p className={styles.footer}>
        Heb je al een account? <Link href="/login">Inloggen</Link>
      </p>
    </div>
  )
}
