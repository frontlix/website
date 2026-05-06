'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction, type LoginState } from './actions'
import styles from './page.module.css'

const initialState: LoginState = {}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Inloggen</h1>
      <p className={styles.subtitle}>Log in op het Frontlix dashboard.</p>

      <form action={formAction} className={styles.form}>
        <label className={styles.label}>
          E-mail
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className={styles.input}
          />
        </label>

        <label className={styles.label}>
          Wachtwoord
          <input
            type="password"
            name="wachtwoord"
            required
            autoComplete="current-password"
            className={styles.input}
          />
        </label>

        {state.error && <p className={styles.error}>{state.error}</p>}

        <button type="submit" disabled={pending} className={styles.submit}>
          {pending ? 'Bezig…' : 'Inloggen'}
        </button>
      </form>

      <p className={styles.footer}>
        Nog geen account? <Link href="/signup">Aanmelden</Link>
      </p>
    </div>
  )
}
