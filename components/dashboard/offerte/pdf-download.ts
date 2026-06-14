// ─────────────────────────────────────────────────────────────────────
// Levert een client-side gegenereerde offerte-PDF af op de manier die per
// platform werkt.
//
// Het probleem: op iOS Safari (en deels Android) wordt het klassieke
// `<a download>` voor een blob-URL genegeerd, het bestand opent dan in de
// pagina of er gebeurt niets, "downloaden lukt niet". De Web Share API met
// een File geeft daar juist het native deel-/bewaar-vel ("Bewaar in Bestanden",
// mailen, AirDrop, enz.), dat is op de telefoon de juiste manier om een
// gegenereerd bestand af te leveren.
//
// Strategie:
//   1. Web Share API met bestand (telefoon)  → deel-/bewaar-vel
//   2. <a download> (desktop)                → klassieke download
//   3. window.open(blob) (vangnet)           → open de PDF zodat de gebruiker
//      'm zelf via het deelmenu kan bewaren
// ─────────────────────────────────────────────────────────────────────

export async function deliverPdfBlob(blob: Blob, fileName: string): Promise<void> {
  const file = new File([blob], fileName, { type: "application/pdf" });

  // 1) Web Share API met bestand (iOS/Android). canShare({files}) is de
  //    betrouwbare feature-detectie; alleen aanroepen binnen een user-gesture.
  const nav =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & {
          canShare?: (data?: ShareData) => boolean;
          share?: (data?: ShareData) => Promise<void>;
        })
      : null;
  if (nav?.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: fileName });
      return;
    } catch (err) {
      // Gebruiker annuleerde het deel-vel → klaar, niet alsnog downloaden.
      if ((err as { name?: string })?.name === "AbortError") return;
      // Andere share-fout → val terug op de download hieronder.
    }
  }

  // 2) Klassieke download (desktop-browsers respecteren het download-attribuut).
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    // 3) Vangnet: open de PDF in een nieuw tabblad.
    window.open(url, "_blank", "noopener,noreferrer");
  } finally {
    // Geef de browser tijd om de download/het tabblad te starten voor we de
    // object-URL vrijgeven.
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
