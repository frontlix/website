import {
  Tag,
  Star,
  Flame,
  Heart,
  Crown,
  Shield,
  Award,
  Bell,
  Bookmark,
  MapPin,
  Sparkles,
  Zap,
  Diamond,
  Gem,
  Target,
  Flag,
  AlertTriangle,
  Briefcase,
  User,
  Repeat,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "@/lib/dashboard/tag-presets";

/**
 * Mapping van icon-key (string in DB) naar lucide-react component. Client-side
 * gehouden omdat hier React-componenten in zitten; de server kent alleen de
 * string-keys uit `tag-presets.ts`. Port van v1 tag-icons.tsx.
 */
export const ICON_REGISTRY: Record<IconKey, LucideIcon> = {
  Tag,
  Star,
  Flame,
  Heart,
  Crown,
  Shield,
  Award,
  Bell,
  Bookmark,
  MapPin,
  Sparkles,
  Zap,
  Diamond,
  Gem,
  Target,
  Flag,
  AlertTriangle,
  Briefcase,
  User,
  Repeat,
};

/** Fallback wanneer de DB-waarde niet matched met een bekende key. */
export const DEFAULT_TAG_ICON: LucideIcon = Tag;
