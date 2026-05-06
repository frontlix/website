/**
 * Handgeschreven Database-type voor Supabase queries. Dekt alleen de
 * tabellen + kolommen die het dashboard daadwerkelijk gebruikt.
 *
 * Latere optie: vervangen door automatisch gegenereerde types via
 *   npx supabase gen types typescript --project-id <ref> > database.types.ts
 * Voor nu handmatig zodat we geen Supabase CLI / project-access-token nodig
 * hebben tijdens dev.
 *
 * Wanneer je een nieuwe tabel/kolom toevoegt aan een Plan 1+-migratie,
 * werk dan ook dit bestand bij.
 */

export type DashboardStatus =
  | 'open'
  | 'opgevolgd'
  | 'afgehandeld'
  | 'no_show'
  | 'geen_interesse'
  | 'archief'

export type GesprekFase =
  | 'info_verzamelen'
  | 'offerte_besproken'
  | 'onderhandelen'
  | 'datum_kiezen'
  | 'afspraak_bevestigd'

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string
          lead_id: string
          naam: string
          bedrijfsnaam: string | null
          email: string
          telefoon: string
          postcode: string
          huisnummer: string
          straat: string | null
          plaats: string | null
          toelichting: string | null
          hoofdcategorie: string
          sub_diensten: string[]
          m2: number | null
          planten: string | null
          planten_afschermen: string | null
          zand_kleur: string | null
          groene_aanslag: string | null
          fotos_ontvangen: boolean
          fotos_geweigerd: boolean
          status: string
          gesprek_fase: GesprekFase
          document_id: string | null
          offerte_verstuurd: boolean
          offerte_verstuurd_op: string | null
          afstand_km: number | null
          totaal_prijs: number | null
          extra_arbeid_minuten: number
          extra_arbeid_personen: number
          voegzand_zakken: number
          korting_percentage: number
          afspraak_datum: string | null
          afspraak_starttijd: string | null
          google_event_id: string | null
          akkoord_op: string | null
          akkoord_via: string | null
          afspraak_geboekt_op: string | null
          afspraak_geboekt_via: string | null
          dashboard_status: DashboardStatus | null
          dashboard_archived: boolean
          bron: string
          aangemaakt: string
          bijgewerkt: string
        }
      }
      berichten: {
        Row: {
          id: string
          lead_id: string
          richting: string
          bericht: string | null
          type: string
          media_id: string | null
          foto_url: string | null
          foto_analyse: string | null
          wa_message_id: string | null
          timestamp: string
        }
      }
      fotos: {
        Row: {
          id: string
          lead_id: string
          storage_path: string
          public_url: string | null
          foto_analyse: string | null
          bron: string
          aangemaakt: string
        }
      }
      offertes: {
        Row: {
          id: string
          lead_id: string
          versie: number
          pdf_path: string
          pdf_url: string
          totaal_incl: number
          korting_pct: number
          aangemaakt_op: string
        }
      }
      prijsregels: {
        Row: {
          id: string
          lead_id: string
          omschrijving: string
          aantal: number | null
          eenheid: string | null
          stukprijs: number
          totaal: number
          volgorde: number
          aangemaakt: string
        }
      }
      lead_notes: {
        Row: {
          id: string
          lead_id: string
          tekst: string
          auteur: string | null
          aangemaakt_op: string
        }
      }
      tags: {
        Row: {
          id: string
          naam: string
          kleur: string | null
          aangemaakt_op: string
        }
      }
      lead_tags: {
        Row: {
          lead_id: string
          tag_id: string
          aangemaakt_door: string | null
          aangemaakt_op: string
        }
      }
      lead_status_history: {
        Row: {
          id: string
          lead_id: string
          oude_status: string | null
          nieuwe_status: string
          gewijzigd_door: string | null
          gewijzigd_op: string
        }
      }
      dashboard_user_profiles: {
        Row: {
          user_id: string
          bedrijfsnaam: string | null
          tenant_status: 'pending' | 'approved' | 'rejected'
          is_owner: boolean
          onboarding_voltooid_op: string | null
          approved_op: string | null
          aangemaakt_op: string
        }
      }
      tenant_settings: {
        Row: {
          id: string
          bedrijfsnaam: string
          chatbot_naam: string
          adres: string | null
          postcode: string | null
          plaats: string | null
          eigenaar_email: string | null
          eigenaar_whatsapp: string | null
          calendar_link: string | null
          offerte_geldigheid_dagen: number
          reminder_dag_1: number
          reminder_dag_2: number
          reminder_dag_3: number
          radius_max_km: number
          radius_doorverwijs_bedrijf: string | null
          bijgewerkt_op: string
        }
      }
    }
  }
}

// Convenience-types voor consumers:
export type Lead = Database['public']['Tables']['leads']['Row']
export type Bericht = Database['public']['Tables']['berichten']['Row']
export type Foto = Database['public']['Tables']['fotos']['Row']
export type Offerte = Database['public']['Tables']['offertes']['Row']
export type Prijsregel = Database['public']['Tables']['prijsregels']['Row']
export type LeadNote = Database['public']['Tables']['lead_notes']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type LeadTag = Database['public']['Tables']['lead_tags']['Row']
export type LeadStatusHistory = Database['public']['Tables']['lead_status_history']['Row']
export type DashboardUserProfile = Database['public']['Tables']['dashboard_user_profiles']['Row']
export type TenantSettings = Database['public']['Tables']['tenant_settings']['Row']
