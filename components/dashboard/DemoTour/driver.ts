/**
 * Besturings-API voor de rondleiding: stuurt de ingesloten demo-app
 * (same-origin iframe met /demo-app/Dashboard.html) aan zoals een
 * gebruiker dat zou doen. Navigeren via hash, klikken op échte
 * elementen (nooit nep-klikken: bestaat een element niet, dan gebeurt
 * er stilletjes niets), typen in echte invoervelden, en een nepmuis
 * die in het bovenliggende venster over het browserkader glijdt.
 */

/** Wordt gegooid wanneer een hoofdstuk wordt afgebroken (spoelen/sluiten). */
export class TourAbort extends Error {
  constructor() {
    super('tour aborted')
  }
}

export type RunToken = { aborted: boolean }

export type CursorState = {
  /** positie in px binnen het browserkader */
  x: number
  y: number
  visible: boolean
  /** verhoog om het klik-effect opnieuw af te spelen */
  clickTick: number
  /** glijduur van de huidige beweging (afstands-afhankelijk) */
  durMs: number
}

export type DriverApi = {
  /** pauze-bewuste wachttijd; breekt af bij hoofdstukwissel */
  sleep: (ms: number) => Promise<void>
  /** navigeer de demo-app via de hash-router, bv. 'leads/L-2087' */
  goto: (path: string) => Promise<void>
  /** klik een item in de zijbalk op labeltekst */
  clickNav: (label: string) => Promise<void>
  /** klik een weergave-schakelaar (.seg-btn) op labeltekst */
  clickSeg: (label: RegExp) => Promise<void>
  /** klik een tab (.tabs .tab of losse .tab) op labeltekst */
  clickTab: (label: RegExp) => Promise<void>
  /** klik het eerste element dat selector matcht én de tekst bevat */
  clickText: (selector: string, text: RegExp) => Promise<void>
  /** beweeg alleen de cursor naar een element, zonder klik */
  cursorTo: (selector: string) => Promise<void>
  /** typ tekstwaarde teken voor teken in een echt invoerveld */
  type: (selector: string, value: string) => Promise<void>
  /** open de handmatige offerte-builder */
  openQuote: () => Promise<void>
  /** veiligheidsnet: sluit een eventueel open modal/overlay */
  closeOverlays: () => Promise<void>
  /** scroll de hoofdinhoud (.content) naar y */
  scrollTo: (y: number) => Promise<void>
}

type DriverDeps = {
  getIframe: () => HTMLIFrameElement | null
  /** element waarbinnen de cursor absoluut gepositioneerd is */
  getStage: () => HTMLElement | null
  isPaused: () => boolean
  token: RunToken
  setCursor: (updater: (c: CursorState) => CursorState) => void
}

const TYPE_MS = 40

export function createDriver(deps: DriverDeps): DriverApi {
  const { getIframe, getStage, isPaused, token, setCursor } = deps

  const doc = (): Document | null => getIframe()?.contentDocument ?? null
  /** laatste cursorpositie, voor afstands-afhankelijke glijduur */
  let lastPos = { x: 90, y: 90 }

  const sleep = async (ms: number) => {
    let remaining = ms
    while (remaining > 0) {
      if (token.aborted) throw new TourAbort()
      await new Promise((r) => setTimeout(r, 50))
      if (!isPaused()) remaining -= 50
    }
    if (token.aborted) throw new TourAbort()
  }

  const findByText = (selector: string, text: RegExp): HTMLElement | null => {
    const d = doc()
    if (!d) return null
    const matches = Array.from(d.querySelectorAll<HTMLElement>(selector))
    return matches.find((el) => text.test(el.textContent ?? '')) ?? null
  }

  /** cursor naar het midden van een element glijden; korte hop = snel, lange beweging = rustiger */
  const glideTo = async (el: HTMLElement) => {
    const iframe = getIframe()
    const stage = getStage()
    if (!iframe || !stage) return
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    await sleep(150)
    const er = el.getBoundingClientRect()
    const ir = iframe.getBoundingClientRect()
    const sr = stage.getBoundingClientRect()
    const x = ir.left - sr.left + er.left + er.width / 2
    const y = ir.top - sr.top + er.top + er.height / 2
    const dist = Math.hypot(x - lastPos.x, y - lastPos.y)
    const durMs = Math.round(Math.max(320, Math.min(900, dist * 1.4)))
    lastPos = { x, y }
    setCursor((c) => ({ ...c, x, y, durMs, visible: true }))
    await sleep(durMs + 60)
  }

  /**
   * Beweeg ernaartoe, speel het klik-effect en klik het échte element.
   * Is het element al actief (nav-item, seg-btn of tab die al aanstaat),
   * dan wijzen we alleen: een klik zou niets zichtbaars doen.
   */
  const clickEl = async (el: HTMLElement | null) => {
    if (!el) return // geen nep-klikken op iets dat er niet is
    await glideTo(el)
    if (el.classList.contains('active')) {
      await sleep(250)
      return
    }
    setCursor((c) => ({ ...c, clickTick: c.clickTick + 1 }))
    el.click()
    await sleep(240)
  }

  return {
    sleep,

    goto: async (path) => {
      const win = getIframe()?.contentWindow
      if (win) win.location.hash = '/' + path
      await sleep(550)
    },

    clickNav: async (label) => {
      await clickEl(findByText('.nav-item', new RegExp(label, 'i')))
    },

    clickSeg: async (label) => {
      await clickEl(findByText('.seg-btn', label))
    },

    clickTab: async (label) => {
      await clickEl(findByText('.tab', label))
    },

    clickText: async (selector, text) => {
      await clickEl(findByText(selector, text))
    },

    cursorTo: async (selector) => {
      const el = doc()?.querySelector<HTMLElement>(selector)
      if (el) await glideTo(el)
    },

    type: async (selector, value) => {
      const d = doc()
      const input = d?.querySelector<HTMLInputElement>(selector)
      if (!d || !input) return
      await glideTo(input)
      input.focus()
      // React controlled inputs: native setter + input-event per teken
      const win = d.defaultView as (Window & typeof globalThis) | null
      if (!win) return
      const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')?.set
      if (!setter) return
      for (let i = 1; i <= value.length; i++) {
        if (token.aborted) throw new TourAbort()
        setter.call(input, value.slice(0, i))
        input.dispatchEvent(new win.Event('input', { bubbles: true }))
        await sleep(TYPE_MS)
      }
    },

    openQuote: async () => {
      const btn = findByText('.btn.btn-primary', /Nieuwe offerte/i)
      if (btn) {
        await clickEl(btn)
      } else {
        const win = getIframe()?.contentWindow as
          | (Window & { __openManualQuote?: () => void })
          | null
        win?.__openManualQuote?.()
        await sleep(380)
      }
      await sleep(420)
    },

    closeOverlays: async () => {
      const d = doc()
      if (!d) return
      const overlay = d.querySelector<HTMLElement>('div[style*="z-index: 9000"]')
      if (!overlay) return
      const closeBtn = overlay.querySelector<HTMLElement>('.icon-btn')
      if (closeBtn) {
        await clickEl(closeBtn)
      } else {
        overlay.click() // backdrop-klik sluit de modal
        await sleep(300)
      }
    },

    scrollTo: async (y) => {
      const el = doc()?.querySelector<HTMLElement>('.content')
      if (el) {
        // klem op wat er echt te scrollen valt, zodat de beweging nooit
        // stil wordt afgekapt of onzichtbaar blijft
        const max = Math.max(0, el.scrollHeight - el.clientHeight)
        el.scrollTo({ top: Math.min(y, max), behavior: 'smooth' })
      }
      await sleep(750)
    },
  }
}
