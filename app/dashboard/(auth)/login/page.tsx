'use client'

import { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { loginAction, type LoginState } from './actions'
import styles from './page.module.css'

const initialState: LoginState = {}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  // Full page reload bij success: window.location.href forceert dat de browser
  // een verse GET doet met de net-gezette session-cookies. Een client-side
  // router.push() gebruikt soft-navigation en kan een race triggeren waarbij
  // de eerste GET /leads een 404 krijgt.
  useEffect(() => {
    if (state.redirectTo) {
      window.location.href = state.redirectTo
    }
  }, [state.redirectTo])

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

        <button type="submit" disabled={pending || !!state.redirectTo} className={styles.submit}>
          {pending ? 'Bezig…' : state.redirectTo ? 'Doorsturen…' : 'Inloggen'}
        </button>
      </form>

      <p className={styles.footer}>
        <Link href="/wachtwoord-vergeten">Wachtwoord vergeten?</Link>
      </p>
    </div>
  )
}
