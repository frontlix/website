'use client'
import { useState } from 'react'
import { MobileSheet } from '@/components/dashboard/ui/MobileSheet'

export default function DevMobileSheetPage() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ padding: 24 }}>
      <h1>Dev: MobileSheet</h1>
      <button type="button" onClick={() => setOpen(true)}>Open sheet</button>
      <MobileSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Voorbeeld-sheet"
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)}>Annuleer</button>
            <button type="button" onClick={() => setOpen(false)}>Bevestig</button>
          </>
        }
      >
        <p>Dit is de sheet-inhoud. Scroll-test:</p>
        {Array.from({ length: 30 }, (_, i) => (
          <p key={i}>Regel {i + 1}</p>
        ))}
      </MobileSheet>
    </div>
  )
}
