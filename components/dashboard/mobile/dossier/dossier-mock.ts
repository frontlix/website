/** MOCK, v1 toont deze lead ongeacht [lead_id]. Wiren aan getLeadDetail in de eind-pass. */
const DC2 = { blue: '#1A56FF', green: '#16A34A', amber: '#F59E0B', red: '#DC2626', wa: '#25D366', neutral: '#9CA3AF' }

export type DossierLead = { id: string; naam: string; plaats: string; m2: number; fotos: number; prijs: number | null; stage: string; binnen: string; handover?: boolean }
export const DOSS_LEAD: DossierLead = { id: 'L-2087', naam: 'Jeroen de Vries', plaats: 'Delft', m2: 145, fotos: 4, prijs: 1872, stage: 'gesprek', binnen: '8 min' }

export type DossBijzonder = { l: string; v: string; tone: string }
export type DossVraag = { q: string; done: boolean }
export type DossRegel = { l: string; detail: string; bedrag: number }
export type DossActity = { icon: 'doc' | 'spark' | 'wa' | 'cam'; tone: string; t: string; time: string }

export const DOSS = {
  telefoon: '06 - 24 96 52 70', email: 'jeroen.devries@gmail.com',
  adres: 'Lindenlaan 14, 2611 GH Delft', afstand: 18,
  hoofd: 'Oprit / terras reiniging', sub: ['Voegen invegen', 'Beschermlaag aanbrengen'],
  surface: 'Vraagt om bevestiging van de m²', fase: 'Info verzamelen',
  bijzonderheden: [
    { l: 'Planten langs de rand', v: 'Ja, afschermen met folie', tone: DC2.amber },
    { l: 'Groene aanslag', v: 'Ja, aanwezig', tone: DC2.amber },
    { l: 'Korstmos', v: 'Nee', tone: DC2.neutral },
    { l: 'Voegzand', v: 'Onkruidwerend · antraciet', tone: DC2.blue },
  ] as DossBijzonder[],
  vragen: [
    { q: 'Foto’s ontvangen', done: true }, { q: 'Voegkleur gekozen', done: true },
    { q: 'Planten afgestemd', done: true }, { q: 'Oppervlakte bevestigd', done: false },
  ] as DossVraag[],
  offerte: {
    status: 'Nog niet verstuurd',
    regels: [
      { l: 'Reiniging oprit', detail: '145 m² × €3,95', bedrag: 572.75 },
      { l: 'Voegen invegen (onkruidwerend)', detail: '145 m² × €4,50', bedrag: 652.5 },
      { l: 'Beschermlaag', detail: '145 m² × €2,10', bedrag: 304.5 },
      { l: 'Planten afschermen', detail: '2 rollen folie × €8,50', bedrag: 17.0 },
    ] as DossRegel[],
    subtotaal: 1546.75, btw: 324.82, totaal: 1871.57,
  },
  fotos_list: [{ tag: 'Oprit · overzicht' }, { tag: 'Probleemgebied' }, { tag: 'Voegen close-up' }, { tag: 'Plantenrand' }],
  activity: [
    { icon: 'doc', tone: DC2.neutral, t: 'Lead binnengekomen via webformulier', time: '09:12' },
    { icon: 'spark', tone: DC2.blue, t: 'Surface stuurde het openingsbericht via WhatsApp', time: '09:12' },
    { icon: 'wa', tone: DC2.wa, t: '"Hoi! Ja, ongeveer 145m² inderdaad."', time: '09:28' },
    { icon: 'spark', tone: DC2.blue, t: 'Surface vroeg om recente foto’s en voegkleur', time: '09:42' },
    { icon: 'cam', tone: DC2.wa, t: 'Stuurde 4 foto’s', time: '10:08' },
    { icon: 'spark', tone: DC2.blue, t: 'Surface analyseert foto’s, offerte bijna klaar', time: 'nu' },
  ] as DossActity[],
}
