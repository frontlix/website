'use client'

import { useState } from 'react'
import styles from './DemoCreator.module.css'

export default function DemoCreator() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [naam, setNaam] = useState('')
  const [bedrijf, setBedrijf] = useState('')
  const [branche, setBranche] = useState('')
  const [briefing, setBriefing] = useState('')
  const [slug, setSlug] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultUrl, setResultUrl] = useState('')

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password === 'FrontlixDemo') {
      setAuthenticated(true)
      setAuthError('')
    } else {
      setAuthError('Verkeerd wachtwoord.')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResultUrl('')

    if (!naam || !bedrijf || !branche || !briefing) {
      setError('Vul alle velden in.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/personalized-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer FrontlixDemo`,
        },
        body: JSON.stringify({
          naam,
          bedrijf,
          branche,
          briefing,
          ...(slug ? { slug } : {}),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Er ging iets mis.')
        return
      }

      setResultUrl(data.url)
    } catch {
      setError('Verbindingsfout. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(resultUrl)
  }

  // Wachtwoord-scherm
  if (!authenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Demo aanmaken</h1>
          <p className={styles.subtitle}>Voer het wachtwoord in om door te gaan.</p>
          <form onSubmit={handleLogin} className={styles.form}>
            <input
              type="password"
              className={styles.input}
              placeholder="Wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit" className={styles.button}>
              Inloggen
            </button>
            {authError && <p className={styles.error}>{authError}</p>}
          </form>
        </div>
      </div>
    )
  }

  // Succes-scherm
  if (resultUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>Demo aangemaakt</h1>
          <p className={styles.subtitle}>Kopieer de link en stuur hem naar je prospect.</p>
          <div className={styles.urlBox}>
            <span className={styles.urlText}>{resultUrl}</span>
            <button onClick={handleCopy} className={styles.copyButton}>
              Kopiëren
            </button>
          </div>
          <button
            onClick={() => {
              setResultUrl('')
              setNaam('')
              setBedrijf('')
              setBranche('')
              setBriefing('')
              setSlug('')
            }}
            className={styles.secondaryButton}
          >
            Nieuwe demo aanmaken
          </button>
        </div>
      </div>
    )
  }

  // Formulier
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Nieuwe demo aanmaken</h1>
        <p className={styles.subtitle}>
          Vul de gegevens van je prospect in. De chatbot past zich aan op basis van de briefing.
        </p>

        <form onSubmit={handleCreate} className={styles.form}>
          <label className={styles.label}>
            Naam prospect
            <input
              type="text"
              className={styles.input}
              placeholder="bijv. Jan Bakker"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            Bedrijf
            <input
              type="text"
              className={styles.input}
              placeholder="bijv. Bakkerij Jan"
              value={bedrijf}
              onChange={(e) => setBedrijf(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            Branche
            <input
              type="text"
              className={styles.input}
              placeholder="bijv. bakkerij, schoonmaak, horeca"
              value={branche}
              onChange={(e) => setBranche(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            Briefing
            <span className={styles.labelHint}>Wat moet de chatbot weten over deze prospect? Max 500 tekens.</span>
            <textarea
              className={styles.textarea}
              placeholder="bijv. Jan heeft een bakkerij in Amsterdam-Zuid met 40m2 tegelvloer bij de ingang. Focus op hygiëne en eerste indruk voor klanten."
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <span className={styles.charCount}>{briefing.length}/500</span>
          </label>

          <label className={styles.label}>
            URL-slug <span className={styles.optional}>(optioneel)</span>
            <span className={styles.labelHint}>Wordt automatisch gegenereerd als je dit leeg laat.</span>
            <input
              type="text"
              className={styles.input}
              placeholder="bijv. jan-bakkerij"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Bezig...' : 'Demo aanmaken'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>
    </div>
  )
}
