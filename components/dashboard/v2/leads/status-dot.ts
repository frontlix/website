import type { StatusKind } from "@/components/dashboard/v2/demo-data";

/** De status-dot in een pipeline-kolomkop krijgt de "ink"-kleur van de
 *  bijbehorende StatusKind. We geven een var(--rb-*) terug (geen hardcoded
 *  hex) zodat het token de bron blijft; de waarde is data-afhankelijk en
 *  hoort dus als inline style op de dot. */
export function statusDotColor(kind: StatusKind): string {
  return `var(--rb-status-${kind}-ink)`;
}
