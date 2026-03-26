'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import ProjectModal from '@/components/ui/ProjectModal'
import styles from './Navbar.module.css'

const navLinks = [
  { label: 'Diensten', href: '/diensten' },
  { label: 'Over ons', href: '/over-ons' },
  { label: 'Contact', href: '/contact' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [projectModalOpen, setProjectModalOpen] = useState(false)

  const toggleMenu = () => setMenuOpen((prev) => !prev)
  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <header className={styles.navbar}>
        <div className={styles.inner}>
          {/* Logo */}
          <Link href="/" className={styles.logo} onClick={closeMenu}>
            <Image src="/logo.png" alt="Frontlix logo" width={44} height={44} className={styles.logoImage} />
            <span>Front<span className={styles.logoIx}>lix</span></span>
          </Link>

          {/* Desktop nav */}
          <nav className={styles.nav} aria-label="Hoofdnavigatie">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.navLink}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className={styles.actions}>
            <div className={styles.ctaDesktop}>
              <Button variant="primary" size="sm" onClick={() => setProjectModalOpen(true)}>
                Start jouw project
              </Button>
            </div>

            <button
              className={styles.menuBtn}
              onClick={toggleMenu}
              aria-label={menuOpen ? 'Menu sluiten' : 'Menu openen'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <nav
        className={`${styles.mobileMenu} ${menuOpen ? styles.open : ''}`}
        aria-label="Mobiel menu"
      >
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={styles.mobileNavLink}
            onClick={closeMenu}
          >
            {link.label}
          </Link>
        ))}
        <Button variant="primary" size="md" fullWidth onClick={() => { closeMenu(); setProjectModalOpen(true) }}>
          Start jouw project
        </Button>
      </nav>

      <ProjectModal isOpen={projectModalOpen} onClose={() => setProjectModalOpen(false)} />
    </>
  )
}
