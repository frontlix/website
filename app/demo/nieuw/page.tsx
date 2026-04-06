import type { Metadata } from 'next'
import DemoCreator from '@/components/personalized-demo/DemoCreator'

export const metadata: Metadata = {
  title: 'Nieuwe demo aanmaken — Frontlix',
  robots: { index: false, follow: false },
}

export default function NieuweDemoPage() {
  return <DemoCreator />
}
