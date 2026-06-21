"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, AlertTriangle, Info } from "lucide-react";
import { StatusPill } from "@/components/dashboard/v2/ui";
import type { WhatsAppConnectionState } from "../instellingen-data";
import integrStyles from "./IntegratiesPanel.module.css";

// ── Facebook JS SDK types (alleen wat we gebruiken) ──────────────────────
interface FbAuthResponse {
  code?: string;
}
interface FbLoginResponse {
  authResponse: FbAuthResponse | null;
  status?: string;
}
interface FbSdk {
  init(opts: {
    appId: string;
    cookie?: boolean;
    xfbml?: boolean;
    version: string;
  }): void;
  login(
    callback: (response: FbLoginResponse) => void,
    opts: Record<string, unknown>,
  ): void;
}
declare global {
  interface Window {
    FB?: FbSdk;
    fbAsyncInit?: () => void;
  }
}

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID ?? "";
const CONFIG_ID = process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID ?? "";
const FB_VERSION = "v21.0";

/**
 * Aan/uit-vlag voor de WhatsApp-koppeling. Default (env niet gezet of niet
 * 'true') => het blok toont de "Binnenkort"-staat: de knop "Koppel WhatsApp" is
 * zichtbaar maar uitgeschakeld, met een "Binnenkort"-badge en een kort regeltje.
 * Zet NEXT_PUBLIC_WHATSAPP_KOPPELING_ENABLED op 'true' (en zorg dat de META-
 * config-env aanwezig is) om de echte Embedded Signup-koppellogica te activeren.
 * Let op: NEXT_PUBLIC_* wordt op build-tijd ingebakken, dus na het zetten van de
 * vlag moet de app opnieuw gebouwd/gedeployd worden.
 */
const KOPPELING_ENABLED = process.env.NEXT_PUBLIC_WHATSAPP_KOPPELING_ENABLED === "true";

/** Laadt de Facebook JS SDK eenmalig client-side en initialiseert FB met de
 *  Frontlix-app. Resolved zodra window.FB beschikbaar en geinitialiseerd is. */
let fbSdkPromise: Promise<FbSdk> | null = null;
function loadFacebookSdk(): Promise<FbSdk> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.FB) return Promise.resolve(window.FB);
  if (fbSdkPromise) return fbSdkPromise;

  fbSdkPromise = new Promise<FbSdk>((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: META_APP_ID,
        cookie: true,
        xfbml: false,
        version: FB_VERSION,
      });
      if (window.FB) resolve(window.FB);
      else reject(new Error("FB SDK kon niet initialiseren"));
    };

    const existing = document.getElementById("facebook-jssdk");
    if (existing) {
      // Script staat er al; wacht op fbAsyncInit of een al-geladen FB.
      if (window.FB) {
        window.FB.init({
          appId: META_APP_ID,
          cookie: true,
          xfbml: false,
          version: FB_VERSION,
        });
        resolve(window.FB);
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => reject(new Error("Facebook SDK laden mislukt"));
    document.body.appendChild(script);
  });

  return fbSdkPromise;
}

export interface WhatsAppPanelProps {
  /** Begin-status uit whatsapp_connections (server-side via getWhatsAppConnectionStatus). */
  whatsapp: WhatsAppConnectionState;
  /** false in de demo-fallback (geen sessie): de connect/disconnect-acties zijn dan no-op. */
  live: boolean;
}

/**
 * WhatsApp-koppeling (Instellingen > Integraties, eigen blok naast de
 * E-mailkoppeling). Een bedrijf koppelt zijn eigen WhatsApp Business-nummer via
 * Meta Embedded Signup (Facebook Login for Business pop-up), zodat de bot
 * voortaan vanuit dat eigen nummer werkt. Drie statussen: niet gekoppeld (knop
 * "Koppel WhatsApp"), gekoppeld (groen + ontkoppelen) en needs_reconnect (rode
 * banner + opnieuw koppelen). Routes: POST /api/integrations/whatsapp/connect en
 * /disconnect.
 */
export function WhatsAppPanel({ whatsapp, live }: WhatsAppPanelProps) {
  const router = useRouter();

  const connected = whatsapp.connected;
  const needsReconnect = connected && Boolean(whatsapp.needsReconnect);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // De sessie-gegevens uit het WA_EMBEDDED_SIGNUP-window-event komen apart
  // binnen van de FB.login-callback. We vangen ze op in een ref zodat de
  // callback (die de code levert) ze meteen kan combineren tot een POST.
  const sessionInfoRef = useRef<{ wabaId?: string; phoneNumberId?: string }>({});

  // Window message-listener: vangt het WA_EMBEDDED_SIGNUP-event op en haalt er
  // phone_number_id en waba_id uit (de code komt los uit de FB.login-callback).
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }
      let payload: unknown = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      const data = payload as {
        type?: string;
        event?: string;
        data?: { phone_number_id?: string; waba_id?: string };
      };
      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (data.event === "FINISH" || data.data) {
        sessionInfoRef.current = {
          wabaId: data.data?.waba_id,
          phoneNumberId: data.data?.phone_number_id,
        };
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const postConnect = useCallback(
    async (code: string) => {
      const { wabaId, phoneNumberId } = sessionInfoRef.current;
      if (!wabaId || !phoneNumberId) {
        setError(
          "Koppelen is afgebroken. Doorloop de WhatsApp-stappen helemaal en probeer opnieuw.",
        );
        setBusy(false);
        return;
      }
      try {
        const res = await fetch("/api/integrations/whatsapp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            waba_id: wabaId,
            phone_number_id: phoneNumberId,
          }),
        });
        const responseData = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok) {
          setError(responseData.error ?? "Koppelen mislukt. Probeer het opnieuw.");
          return;
        }
        // Server-prop herladen zodat de groene "Gekoppeld"-staat verschijnt.
        router.refresh();
      } catch {
        setError("Koppelen mislukt. Controleer je verbinding en probeer het opnieuw.");
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  async function connect() {
    if (!live || busy) return;
    if (!META_APP_ID || !CONFIG_ID) {
      setError("WhatsApp-koppeling is nog niet geconfigureerd. Neem contact op met Frontlix.");
      return;
    }
    setBusy(true);
    setError(null);
    sessionInfoRef.current = {};

    let FB: FbSdk;
    try {
      FB = await loadFacebookSdk();
    } catch {
      setError("Facebook kon niet geladen worden. Controleer je verbinding en probeer opnieuw.");
      setBusy(false);
      return;
    }

    FB.login(
      (response: FbLoginResponse) => {
        const code = response?.authResponse?.code;
        if (!code) {
          // Gebruiker heeft de pop-up gesloten of toestemming geweigerd.
          setError("Koppelen is geannuleerd.");
          setBusy(false);
          return;
        }
        void postConnect(code);
      },
      {
        config_id: CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "3",
        },
      },
    );
  }

  async function disconnect() {
    if (!live || busy) return;
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/integrations/whatsapp/disconnect", { method: "POST" });
      router.refresh();
    } catch {
      setError("Ontkoppelen mislukt. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  // Binnenkort-staat: zolang de vlag niet 'true' is, tonen we het blok "ready"
  // maar nog niet bruikbaar: de knop "Koppel WhatsApp" staat er zichtbaar maar
  // disabled, met de "Binnenkort"-badge en een kort regeltje. Geen Embedded
  // Signup-pop-up in deze staat. Hetzelfde markup-skelet (head + body) als de
  // echte staat, dus het verschijnt identiek op mobiel en desktop (de panelen
  // zijn een responsive component, geen aparte mobile-render).
  if (!KOPPELING_ENABLED) {
    return (
      <>
        <div className={integrStyles.head}>
          <span className={integrStyles.headIcon}>
            <MessageCircle size={22} />
          </span>
          <div className={integrStyles.headBody}>
            <div className={integrStyles.headTitleRow}>
              <span className={integrStyles.headTitle}>WhatsApp (eigen nummer)</span>
              <StatusPill kind="sent">Binnenkort</StatusPill>
            </div>
            <div className={integrStyles.headSub}>
              Koppel je eigen WhatsApp Business-nummer zodat berichten naar klanten
              vanuit jouw nummer vertrekken, niet vanuit het Frontlix-nummer.
            </div>
          </div>
        </div>

        <div className={integrStyles.body}>
          <p className={integrStyles.intro}>
            WhatsApp-koppeling komt binnenkort beschikbaar.
          </p>

          <div className={integrStyles.actions}>
            <button
              type="button"
              className={`${integrStyles.btnLink} ${integrStyles.btnPrimary}`}
              disabled
            >
              Koppel WhatsApp
            </button>
          </div>
        </div>
      </>
    );
  }

  // De koppelknop tonen we wanneer er nog geen werkende koppeling is, of
  // wanneer de koppeling opnieuw moet (needs_reconnect).
  const toonKoppelknop = !connected || needsReconnect;

  return (
    <>
      <div className={integrStyles.head}>
        <span className={integrStyles.headIcon}>
          <MessageCircle size={22} />
        </span>
        <div className={integrStyles.headBody}>
          <div className={integrStyles.headTitleRow}>
            <span className={integrStyles.headTitle}>WhatsApp (eigen nummer)</span>
            {connected && !needsReconnect ? (
              <StatusPill kind="new">Gekoppeld</StatusPill>
            ) : needsReconnect ? (
              <StatusPill kind="hot">Werkt niet meer</StatusPill>
            ) : (
              <StatusPill kind="sent">Niet gekoppeld</StatusPill>
            )}
          </div>
          <div className={integrStyles.headSub}>
            Koppel je eigen WhatsApp Business-nummer zodat berichten naar klanten
            vanuit jouw nummer vertrekken, niet vanuit het Frontlix-nummer.
          </div>
        </div>
      </div>

      <div className={integrStyles.body}>
        {connected && !needsReconnect && (
          <div className={integrStyles.accountRow}>
            <span className={integrStyles.accountLabel}>Gekoppeld als</span>
            <span className={integrStyles.accountValue}>
              {whatsapp.displayPhoneNumber ?? "onbekend nummer"}
            </span>
          </div>
        )}

        {needsReconnect && (
          <div className={`${integrStyles.status} ${integrStyles.statusErr}`}>
            <AlertTriangle size={13} />
            Je WhatsApp-koppeling werkt niet meer (toegang verlopen of ingetrokken).
            Berichten gaan nu tijdelijk weer vanaf het Frontlix-nummer. Koppel
            opnieuw om vanaf je eigen nummer te versturen.
          </div>
        )}

        {error && (
          <div className={`${integrStyles.status} ${integrStyles.statusErr}`}>
            <AlertTriangle size={13} />
            {error}
          </div>
        )}

        {toonKoppelknop && (
          <div className={integrStyles.actions}>
            <button
              type="button"
              className={`${integrStyles.btnLink} ${integrStyles.btnPrimary}`}
              onClick={connect}
              disabled={busy || !live}
            >
              {busy ? "Bezig..." : "Koppel WhatsApp"}
            </button>
            {connected && (
              <button
                type="button"
                className={`${integrStyles.btnLink} ${integrStyles.btnSecondary}`}
                onClick={disconnect}
                disabled={busy || !live}
              >
                Ontkoppelen
              </button>
            )}
          </div>
        )}

        {connected && !needsReconnect && (
          <div className={integrStyles.actions}>
            <button
              type="button"
              className={`${integrStyles.btnLink} ${integrStyles.btnSecondary}`}
              onClick={disconnect}
              disabled={busy || !live}
            >
              Ontkoppelen
            </button>
          </div>
        )}

        <div className={integrStyles.liveNote}>
          <Info size={14} className={integrStyles.liveNoteIcon} />
          <span>
            Koppelen doe je op de live site. Je doorloopt de WhatsApp-stappen met
            je eigen Facebook-login en nummer. Een wijziging is binnen een minuut
            actief in je geautomatiseerde berichten.
          </span>
        </div>
      </div>
    </>
  );
}
