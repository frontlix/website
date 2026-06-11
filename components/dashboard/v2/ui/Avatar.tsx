import styles from "./Avatar.module.css";

interface AvatarProps {
  /** Initialen (bv. "FB"). Als leeg: afgeleid uit `name`. */
  initials?: string;
  name?: string;
  /** Diameter in px. */
  size?: number;
  /** Hoek-radius; default rond. Gebruik bv. 11 voor de leadkaart-chip. */
  radius?: number | "round";
  /** Visuele variant. */
  variant?: "soft" | "gradient";
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

/** Avatar met initialen. Default zachte blauwe chip; `gradient` voor de
 *  brand-look. Geometrie (size/radius) is dynamisch → inline style. */
export function Avatar({
  initials,
  name = "",
  size = 40,
  radius = "round",
  variant = "soft",
}: AvatarProps) {
  const text = initials ?? initialsFromName(name);
  return (
    <div
      className={`${styles.avatar} ${variant === "gradient" ? styles.gradient : styles.soft}`}
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
