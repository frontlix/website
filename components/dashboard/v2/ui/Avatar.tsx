import styles from "./Avatar.module.css";

interface AvatarProps {
  /** Initialen (bv. "FB"). Als leeg: afgeleid uit `name`. */
  initials?: string;
  name?: string;
  /** Diameter in px. */
  size?: number;
  /** Hoek-radius; default rond. Gebruik bv. 11 voor de leadkaart-chip. */
  radius?: number | "round";
  /** Visuele variant. `tint` (default) = gekleurd per persoon; `gradient` =
   *  brand-look; `soft` = vaste blauw-zachte chip. */
  variant?: "tint" | "soft" | "gradient";
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

/** Stabiele hash → tint-index 1..8 (zelfde persoon = altijd dezelfde kleur). */
function tintFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 8) + 1;
}

/** Avatar met initialen. Default een per-persoon gekleurde tint (op naam-hash),
 *  zodat elke lead/klant z'n eigen kleur heeft. `gradient` voor de brand-look. */
export function Avatar({
  initials,
  name = "",
  size = 40,
  radius = "round",
  variant = "tint",
}: AvatarProps) {
  const text = initials ?? initialsFromName(name);
  const variantClass =
    variant === "gradient"
      ? styles.gradient
      : variant === "soft"
        ? styles.soft
        : styles[`tint${tintFor((name || text || "?").toLowerCase())}`];

  return (
    <div
      className={`${styles.avatar} ${variantClass}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius === "round" ? "50%" : radius,
        fontSize: Math.round(size * 0.34),
      }}
    >
      {text || "?"}
    </div>
  );
}
