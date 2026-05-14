export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      berichten: {
        Row: {
          bericht: string | null
          foto_analyse: string | null
          foto_url: string | null
          id: string
          lead_id: string
          media_id: string | null
          richting: string
          timestamp: string | null
          type: string | null
          wa_message_id: string | null
        }
        Insert: {
          bericht?: string | null
          foto_analyse?: string | null
          foto_url?: string | null
          id?: string
          lead_id: string
          media_id?: string | null
          richting: string
          timestamp?: string | null
          type?: string | null
          wa_message_id?: string | null
        }
        Update: {
          bericht?: string | null
          foto_analyse?: string | null
          foto_url?: string | null
          id?: string
          lead_id?: string
          media_id?: string | null
          richting?: string
          timestamp?: string | null
          type?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "berichten_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      dashboard_user_profiles: {
        Row: {
          aangemaakt_op: string
          approved_op: string | null
          bedrijfsnaam: string | null
          is_owner: boolean
          onboarding_voltooid_op: string | null
          tenant_status: string
          user_id: string
        }
        Insert: {
          aangemaakt_op?: string
          approved_op?: string | null
          bedrijfsnaam?: string | null
          is_owner?: boolean
          onboarding_voltooid_op?: string | null
          tenant_status?: string
          user_id: string
        }
        Update: {
          aangemaakt_op?: string
          approved_op?: string | null
          bedrijfsnaam?: string | null
          is_owner?: boolean
          onboarding_voltooid_op?: string | null
          tenant_status?: string
          user_id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string
          dedup_hash: string
          dedup_suppressed: boolean
          error_message: string
          error_stack: string | null
          id: string
          lead_id: string | null
          notified_slack: boolean
          notified_whatsapp: boolean
          severity: string
          source: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          dedup_hash: string
          dedup_suppressed?: boolean
          error_message: string
          error_stack?: string | null
          id?: string
          lead_id?: string | null
          notified_slack?: boolean
          notified_whatsapp?: boolean
          severity: string
          source: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          dedup_hash?: string
          dedup_suppressed?: boolean
          error_message?: string
          error_stack?: string | null
          id?: string
          lead_id?: string | null
          notified_slack?: boolean
          notified_whatsapp?: boolean
          severity?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      fotos: {
        Row: {
          aangemaakt: string | null
          bron: string | null
          foto_analyse: string | null
          id: string
          lead_id: string
          public_url: string | null
          storage_path: string
          vervangen: boolean
        }
        Insert: {
          aangemaakt?: string | null
          bron?: string | null
          foto_analyse?: string | null
          id?: string
          lead_id: string
          public_url?: string | null
          storage_path: string
          vervangen?: boolean
        }
        Update: {
          aangemaakt?: string | null
          bron?: string | null
          foto_analyse?: string | null
          id?: string
          lead_id?: string
          public_url?: string | null
          storage_path?: string
          vervangen?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fotos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          aangemaakt_op: string
          auteur: string | null
          id: string
          lead_id: string
          tekst: string
        }
        Insert: {
          aangemaakt_op?: string
          auteur?: string | null
          id?: string
          lead_id: string
          tekst: string
        }
        Update: {
          aangemaakt_op?: string
          auteur?: string | null
          id?: string
          lead_id?: string
          tekst?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      lead_status_history: {
        Row: {
          gewijzigd_door: string | null
          gewijzigd_op: string
          id: string
          lead_id: string
          nieuwe_status: string | null
          oude_status: string | null
        }
        Insert: {
          gewijzigd_door?: string | null
          gewijzigd_op?: string
          id?: string
          lead_id: string
          nieuwe_status?: string | null
          oude_status?: string | null
        }
        Update: {
          gewijzigd_door?: string | null
          gewijzigd_op?: string
          id?: string
          lead_id?: string
          nieuwe_status?: string | null
          oude_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_status_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          aangemaakt_door: string | null
          aangemaakt_op: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          aangemaakt_door?: string | null
          aangemaakt_op?: string
          lead_id: string
          tag_id: string
        }
        Update: {
          aangemaakt_door?: string | null
          aangemaakt_op?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          aangemaakt: string | null
          afspraak_datum: string | null
          afspraak_geboekt_ip: string | null
          afspraak_geboekt_op: string | null
          afspraak_geboekt_via: string | null
          afspraak_starttijd: string | null
          afspraak_voorgestelde_datum: string | null
          afstand_km: number | null
          afwijzing_stap: string | null
          akkoord_bewijs: string | null
          akkoord_ip: string | null
          akkoord_op: string | null
          akkoord_via: string | null
          bedrijfsnaam: string | null
          beschermlaag_m2: number | null
          beschermlaag_vraag_gesteld: boolean
          bijgewerkt: string | null
          bot_gepauzeerd: boolean
          bron: string | null
          coords_geocoded_op: string | null
          dashboard_archived: boolean
          dashboard_status: string | null
          eigenaar_overgenomen: boolean
          email: string
          extra_arbeid_minuten: number | null
          extra_arbeid_omschrijving: string | null
          extra_arbeid_personen: number | null
          extra_arbeid_prijs_override: number | null
          factuur_huisnummer: string | null
          factuur_plaats: string | null
          factuur_postcode: string | null
          factuur_straat: string | null
          fotos_geweigerd: boolean | null
          fotos_leeftijd_bevestigd: boolean | null
          fotos_nieuwe_gevraagd: boolean | null
          fotos_ontvangen: boolean | null
          fotos_zijn_oud: boolean | null
          gesprek_fase: string
          google_event_id: string | null
          groene_aanslag: string | null
          hoofdcategorie: string
          huisnummer: string
          id: string
          inbox_gelezen_op: string | null
          invegen_m2: number | null
          klus_geblokkeerd: boolean
          korstmos: string | null
          korting_omschrijving: string | null
          korting_percentage: number | null
          lat: number | null
          lead_id: string
          lng: number | null
          m2: number | null
          m2_bevestigd: boolean
          naam: string
          offerte_geldigheid_dagen: number | null
          offerte_pending_sinds: string | null
          offerte_pending_whatsapp: boolean | null
          offerte_pending_wijzigingen: Json | null
          offerte_verstuurd: boolean | null
          offerte_verstuurd_op: string | null
          pending_eigenaar_review: Json | null
          plaats: string | null
          planten: string | null
          planten_afschermen: string | null
          postcode: string
          reminder_1_op: string | null
          reminder_2_op: string | null
          reminder_3_op: string | null
          review_request_verzonden_op: string | null
          status: string
          straat: string | null
          sub_diensten: string[] | null
          telefoon: string
          telefoon_offerte: string | null
          toelichting: string | null
          totaal_prijs: number | null
          voegzand_normaal_m2: number | null
          voegzand_normaal_prijs_per_zak: number | null
          voegzand_normaal_zakken: number | null
          voegzand_onkruidwerend_m2: number | null
          voegzand_onkruidwerend_prijs_per_zak: number | null
          voegzand_onkruidwerend_zakken: number | null
          voegzand_type: string | null
          voegzand_zakken: number | null
          wijzig_adres_concept: Json | null
          wijziging_concept: Json | null
          zand_kleur: string | null
          zand_kleur_antraciet: boolean | null
          zand_kleur_naturel: boolean | null
        }
        Insert: {
          aangemaakt?: string | null
          afspraak_datum?: string | null
          afspraak_geboekt_ip?: string | null
          afspraak_geboekt_op?: string | null
          afspraak_geboekt_via?: string | null
          afspraak_starttijd?: string | null
          afspraak_voorgestelde_datum?: string | null
          afstand_km?: number | null
          afwijzing_stap?: string | null
          akkoord_bewijs?: string | null
          akkoord_ip?: string | null
          akkoord_op?: string | null
          akkoord_via?: string | null
          bedrijfsnaam?: string | null
          beschermlaag_m2?: number | null
          beschermlaag_vraag_gesteld?: boolean
          bijgewerkt?: string | null
          bot_gepauzeerd?: boolean
          bron?: string | null
          coords_geocoded_op?: string | null
          dashboard_archived?: boolean
          dashboard_status?: string | null
          eigenaar_overgenomen?: boolean
          email: string
          extra_arbeid_minuten?: number | null
          extra_arbeid_omschrijving?: string | null
          extra_arbeid_personen?: number | null
          extra_arbeid_prijs_override?: number | null
          factuur_huisnummer?: string | null
          factuur_plaats?: string | null
          factuur_postcode?: string | null
          factuur_straat?: string | null
          fotos_geweigerd?: boolean | null
          fotos_leeftijd_bevestigd?: boolean | null
          fotos_nieuwe_gevraagd?: boolean | null
          fotos_ontvangen?: boolean | null
          fotos_zijn_oud?: boolean | null
          gesprek_fase?: string
          google_event_id?: string | null
          groene_aanslag?: string | null
          hoofdcategorie: string
          huisnummer: string
          id?: string
          inbox_gelezen_op?: string | null
          invegen_m2?: number | null
          klus_geblokkeerd?: boolean
          korstmos?: string | null
          korting_omschrijving?: string | null
          korting_percentage?: number | null
          lat?: number | null
          lead_id: string
          lng?: number | null
          m2?: number | null
          m2_bevestigd?: boolean
          naam: string
          offerte_geldigheid_dagen?: number | null
          offerte_pending_sinds?: string | null
          offerte_pending_whatsapp?: boolean | null
          offerte_pending_wijzigingen?: Json | null
          offerte_verstuurd?: boolean | null
          offerte_verstuurd_op?: string | null
          pending_eigenaar_review?: Json | null
          plaats?: string | null
          planten?: string | null
          planten_afschermen?: string | null
          postcode: string
          reminder_1_op?: string | null
          reminder_2_op?: string | null
          reminder_3_op?: string | null
          review_request_verzonden_op?: string | null
          status?: string
          straat?: string | null
          sub_diensten?: string[] | null
          telefoon: string
          telefoon_offerte?: string | null
          toelichting?: string | null
          totaal_prijs?: number | null
          voegzand_normaal_m2?: number | null
          voegzand_normaal_prijs_per_zak?: number | null
          voegzand_normaal_zakken?: number | null
          voegzand_onkruidwerend_m2?: number | null
          voegzand_onkruidwerend_prijs_per_zak?: number | null
          voegzand_onkruidwerend_zakken?: number | null
          voegzand_type?: string | null
          voegzand_zakken?: number | null
          wijzig_adres_concept?: Json | null
          wijziging_concept?: Json | null
          zand_kleur?: string | null
          zand_kleur_antraciet?: boolean | null
          zand_kleur_naturel?: boolean | null
        }
        Update: {
          aangemaakt?: string | null
          afspraak_datum?: string | null
          afspraak_geboekt_ip?: string | null
          afspraak_geboekt_op?: string | null
          afspraak_geboekt_via?: string | null
          afspraak_starttijd?: string | null
          afspraak_voorgestelde_datum?: string | null
          afstand_km?: number | null
          afwijzing_stap?: string | null
          akkoord_bewijs?: string | null
          akkoord_ip?: string | null
          akkoord_op?: string | null
          akkoord_via?: string | null
          bedrijfsnaam?: string | null
          beschermlaag_m2?: number | null
          beschermlaag_vraag_gesteld?: boolean
          bijgewerkt?: string | null
          bot_gepauzeerd?: boolean
          bron?: string | null
          coords_geocoded_op?: string | null
          dashboard_archived?: boolean
          dashboard_status?: string | null
          eigenaar_overgenomen?: boolean
          email?: string
          extra_arbeid_minuten?: number | null
          extra_arbeid_omschrijving?: string | null
          extra_arbeid_personen?: number | null
          extra_arbeid_prijs_override?: number | null
          factuur_huisnummer?: string | null
          factuur_plaats?: string | null
          factuur_postcode?: string | null
          factuur_straat?: string | null
          fotos_geweigerd?: boolean | null
          fotos_leeftijd_bevestigd?: boolean | null
          fotos_nieuwe_gevraagd?: boolean | null
          fotos_ontvangen?: boolean | null
          fotos_zijn_oud?: boolean | null
          gesprek_fase?: string
          google_event_id?: string | null
          groene_aanslag?: string | null
          hoofdcategorie?: string
          huisnummer?: string
          id?: string
          inbox_gelezen_op?: string | null
          invegen_m2?: number | null
          klus_geblokkeerd?: boolean
          korstmos?: string | null
          korting_omschrijving?: string | null
          korting_percentage?: number | null
          lat?: number | null
          lead_id?: string
          lng?: number | null
          m2?: number | null
          m2_bevestigd?: boolean
          naam?: string
          offerte_geldigheid_dagen?: number | null
          offerte_pending_sinds?: string | null
          offerte_pending_whatsapp?: boolean | null
          offerte_pending_wijzigingen?: Json | null
          offerte_verstuurd?: boolean | null
          offerte_verstuurd_op?: string | null
          pending_eigenaar_review?: Json | null
          plaats?: string | null
          planten?: string | null
          planten_afschermen?: string | null
          postcode?: string
          reminder_1_op?: string | null
          reminder_2_op?: string | null
          reminder_3_op?: string | null
          review_request_verzonden_op?: string | null
          status?: string
          straat?: string | null
          sub_diensten?: string[] | null
          telefoon?: string
          telefoon_offerte?: string | null
          toelichting?: string | null
          totaal_prijs?: number | null
          voegzand_normaal_m2?: number | null
          voegzand_normaal_prijs_per_zak?: number | null
          voegzand_normaal_zakken?: number | null
          voegzand_onkruidwerend_m2?: number | null
          voegzand_onkruidwerend_prijs_per_zak?: number | null
          voegzand_onkruidwerend_zakken?: number | null
          voegzand_type?: string | null
          voegzand_zakken?: number | null
          wijzig_adres_concept?: Json | null
          wijziging_concept?: Json | null
          zand_kleur?: string | null
          zand_kleur_antraciet?: boolean | null
          zand_kleur_naturel?: boolean | null
        }
        Relationships: []
      }
      offertes: {
        Row: {
          aangemaakt_op: string | null
          id: string
          korting_pct: number | null
          lead_id: string
          pdf_path: string
          pdf_url: string
          totaal_incl: number
          versie: number
        }
        Insert: {
          aangemaakt_op?: string | null
          id?: string
          korting_pct?: number | null
          lead_id: string
          pdf_path: string
          pdf_url: string
          totaal_incl: number
          versie: number
        }
        Update: {
          aangemaakt_op?: string | null
          id?: string
          korting_pct?: number | null
          lead_id?: string
          pdf_path?: string
          pdf_url?: string
          totaal_incl?: number
          versie?: number
        }
        Relationships: [
          {
            foreignKeyName: "offertes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          bijgewerkt_op: string
          eenheid: string | null
          id: string
          label: string
          rule_key: string
          sort_order: number
          toelichting: string | null
          waarde: number
        }
        Insert: {
          bijgewerkt_op?: string
          eenheid?: string | null
          id?: string
          label: string
          rule_key: string
          sort_order?: number
          toelichting?: string | null
          waarde: number
        }
        Update: {
          bijgewerkt_op?: string
          eenheid?: string | null
          id?: string
          label?: string
          rule_key?: string
          sort_order?: number
          toelichting?: string | null
          waarde?: number
        }
        Relationships: []
      }
      prijsregels: {
        Row: {
          aangemaakt: string | null
          aantal: number | null
          eenheid: string | null
          id: string
          lead_id: string
          omschrijving: string
          stukprijs: number
          totaal: number
          volgorde: number | null
        }
        Insert: {
          aangemaakt?: string | null
          aantal?: number | null
          eenheid?: string | null
          id?: string
          lead_id: string
          omschrijving: string
          stukprijs: number
          totaal: number
          volgorde?: number | null
        }
        Update: {
          aangemaakt?: string | null
          aantal?: number | null
          eenheid?: string | null
          id?: string
          lead_id?: string
          omschrijving?: string
          stukprijs?: number
          totaal?: number
          volgorde?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prijsregels_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      service_offerings: {
        Row: {
          actief: boolean
          dienst_key: string
          label: string
          sort_order: number
        }
        Insert: {
          actief?: boolean
          dienst_key: string
          label: string
          sort_order?: number
        }
        Update: {
          actief?: boolean
          dienst_key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      tags: {
        Row: {
          aangemaakt_op: string
          id: string
          kleur: string | null
          naam: string
        }
        Insert: {
          aangemaakt_op?: string
          id?: string
          kleur?: string | null
          naam: string
        }
        Update: {
          aangemaakt_op?: string
          id?: string
          kleur?: string | null
          naam?: string
        }
        Relationships: []
      }
      tenant_settings: {
        Row: {
          adres: string | null
          base_huisnummer: string | null
          base_label: string | null
          base_lat: number | null
          base_lng: number | null
          bedrijfsnaam: string
          bijgewerkt_op: string
          calendar_link: string | null
          chatbot_naam: string
          eigenaar_email: string | null
          eigenaar_spoed_telefoon: string | null
          eigenaar_whatsapp: string | null
          google_review_url: string | null
          id: string
          offerte_geldigheid_dagen: number
          plaats: string | null
          postcode: string | null
          radius_doorverwijs_bedrijf: string | null
          radius_max_km: number
          reminder_dag_1: number
          reminder_dag_2: number
          reminder_dag_3: number
        }
        Insert: {
          adres?: string | null
          base_huisnummer?: string | null
          base_label?: string | null
          base_lat?: number | null
          base_lng?: number | null
          bedrijfsnaam: string
          bijgewerkt_op?: string
          calendar_link?: string | null
          chatbot_naam: string
          eigenaar_email?: string | null
          eigenaar_spoed_telefoon?: string | null
          eigenaar_whatsapp?: string | null
          google_review_url?: string | null
          id?: string
          offerte_geldigheid_dagen?: number
          plaats?: string | null
          postcode?: string | null
          radius_doorverwijs_bedrijf?: string | null
          radius_max_km?: number
          reminder_dag_1?: number
          reminder_dag_2?: number
          reminder_dag_3?: number
        }
        Update: {
          adres?: string | null
          base_huisnummer?: string | null
          base_label?: string | null
          base_lat?: number | null
          base_lng?: number | null
          bedrijfsnaam?: string
          bijgewerkt_op?: string
          calendar_link?: string | null
          chatbot_naam?: string
          eigenaar_email?: string | null
          eigenaar_spoed_telefoon?: string | null
          eigenaar_whatsapp?: string | null
          google_review_url?: string | null
          id?: string
          offerte_geldigheid_dagen?: number
          plaats?: string | null
          postcode?: string | null
          radius_doorverwijs_bedrijf?: string | null
          radius_max_km?: number
          reminder_dag_1?: number
          reminder_dag_2?: number
          reminder_dag_3?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_approved_dashboard_user: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ============================================
// Frontlix dashboard — app-level types
// ============================================
//
// De DB-kolommen `leads.dashboard_status` en `leads.gesprek_fase` zijn TEXT
// met CHECK-constraints (geen Postgres ENUMs), dus Supabase genereert ze als
// `string | null`. Deze narrowing-unions houden we als applicatie-laag zodat
// de UI typed kan switchen op de bekende waarden.

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

// Convenience-types voor consumers (de Row-shape van elke tabel).
// Voor `leads` overriden we `dashboard_status` + `gesprek_fase` met de
// applicatie-unions zodat consumers niet handmatig hoeven te casten.
//
// De `web_chat_*` + `kanaal` + `whatsapp_bereikbaar` velden worden door
// een bot-side Supabase-migratie aangemaakt. Tot die migratie live is
// zijn ze er nog niet — daarom stubben we ze hier handmatig zodat de
// dashboard-code er nu al tegen kan worden geschreven. Zodra de migratie
// live is en `database.types.ts` opnieuw gegenereerd wordt mogen deze
// overrides blijven staan (ze worden dan redundant, niet conflicterend).
export type LeadKanaal = 'whatsapp' | 'web'

export type Lead = Omit<
  Database['public']['Tables']['leads']['Row'],
  'dashboard_status' | 'gesprek_fase'
> & {
  dashboard_status: DashboardStatus | null
  gesprek_fase: GesprekFase
  kanaal: LeadKanaal
  whatsapp_bereikbaar: boolean | null
  web_chat_token: string | null
  web_chat_token_expires_at: string | null
  web_chat_fallback_email_verzonden_op: string | null
  web_chat_reminder_verzonden_op: string | null
  web_chat_geopend_op: string | null
  web_chat_voltooid_op: string | null
  opening_wa_message_id: string | null
}

export type Bericht = Database['public']['Tables']['berichten']['Row'] & {
  kanaal: LeadKanaal
}
export type Foto = Database['public']['Tables']['fotos']['Row']
export type Offerte = Database['public']['Tables']['offertes']['Row']
export type Prijsregel = Database['public']['Tables']['prijsregels']['Row']
export type LeadNote = Database['public']['Tables']['lead_notes']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type LeadTag = Database['public']['Tables']['lead_tags']['Row']
export type LeadStatusHistory = Database['public']['Tables']['lead_status_history']['Row']
export type DashboardUserProfile = Database['public']['Tables']['dashboard_user_profiles']['Row']
export type TenantSettings = Database['public']['Tables']['tenant_settings']['Row']
export type PricingRule = Database['public']['Tables']['pricing_rules']['Row']
export type ServiceOffering = Database['public']['Tables']['service_offerings']['Row']
