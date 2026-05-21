'use client'
import { useState } from 'react'
import { SplitView } from '@/components/dashboard/ui/SplitView'

export default function DevSplitViewPage() {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div style={{ padding: 24, height: 'calc(100vh - 60px)' }}>
      <SplitView
        list={
          <div>
            <h2>Items</h2>
            {['A', 'B', 'C'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSelected(item)}
                style={{ display: 'block', padding: 12, width: '100%', textAlign: 'left' }}
              >
                Item {item}
              </button>
            ))}
          </div>
        }
        detail={
          <div>
            <h2>Detail: {selected ?? '—'}</h2>
            <p>Detail van item {selected}.</p>
          </div>
        }
        detailVisible={selected !== null}
        onBack={() => setSelected(null)}
      />
    </div>
  )
}
