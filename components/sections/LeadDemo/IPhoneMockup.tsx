import styles from './IPhoneMockup.module.css'

interface IPhoneMockupProps {
  children: React.ReactNode
  statusBarTime?: string
  statusBarVariant?: 'dark' | 'light'
}

export default function IPhoneMockup({ children, statusBarTime = '14:01', statusBarVariant = 'dark' }: IPhoneMockupProps) {
  return (
    <div className={styles.phone}>
      {/* Side buttons */}
      <div className={styles.btnSilent} />
      <div className={styles.btnVolUp} />
      <div className={styles.btnVolDown} />
      <div className={styles.btnPower} />

      <div className={styles.screen}>
        {/* Status bar row with Dynamic Island */}
        <div className={`${styles.statusBar} ${statusBarVariant === 'light' ? styles.statusBarLight : ''}`}>
          <span className={styles.statusTime}>{statusBarTime}</span>
          <div className={styles.dynamicIsland} />
          <span className={styles.statusIcons}>
            {/* Signal bars */}
            <svg width="14" height="10" viewBox="0 0 16 11" fill="none">
              <rect x="0" y="8" width="3" height="3" rx="0.5" fill="currentColor" />
              <rect x="4.5" y="5" width="3" height="6" rx="0.5" fill="currentColor" />
              <rect x="9" y="2" width="3" height="9" rx="0.5" fill="currentColor" />
              <rect x="13.5" y="0" width="3" height="11" rx="0.5" fill="currentColor" opacity="0.3" />
            </svg>
            {/* WiFi */}
            <svg width="13" height="10" viewBox="0 0 14 10" fill="none">
              <path d="M7 9.5a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" />
              <path d="M4.05 6.95a4.24 4.24 0 015.9 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              <path d="M1.64 4.54a7.48 7.48 0 0110.72 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            </svg>
            {/* Battery */}
            <svg width="20" height="10" viewBox="0 0 22 11" fill="none">
              <rect x="0.5" y="0.5" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1" fill="none" />
              <rect x="2" y="2" width="13" height="7" rx="1" fill="currentColor" />
              <path d="M20 3.5v4a1.5 1.5 0 000-4z" fill="currentColor" opacity="0.4" />
            </svg>
          </span>
        </div>

        {/* Phone content */}
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  )
}
