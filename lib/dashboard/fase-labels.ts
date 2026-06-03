/** Surface-context-zin per gesprek_fase. Gedeeld door mobile Leads-expand + Inbox. */
export function botStatusForFase(fase: string | null | undefined): string {
  const labels: Record<string, string> = {
    info_verzamelen: 'Verzamelt info, wacht op klant-antwoord',
    offerte_besproken: 'Offerte verstuurd, wacht op reactie',
    onderhandelen: 'Onderhandelt, owner-aandacht mogelijk nodig',
    datum_kiezen: 'Datum kiezen, klant kiest afspraak',
    afspraak_bevestigd: 'Afspraak bevestigd, wacht op afronding',
  }
  return fase ? labels[fase] ?? 'Actief in gesprek' : 'Actief in gesprek'
}
