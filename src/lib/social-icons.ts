/**
 * Social Platform Icons & Configuration
 *
 * Uses react-icons for platform logos, rendered to static SVG strings
 * via renderToStaticMarkup for use in Astro server-rendered components.
 *
 * All icons are monochrome and inherit currentColor.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { IconType } from "react-icons";
import {
  SiGithub,
  SiCodeberg,
  SiHackaday,
  SiPrintables,
  SiThingiverse,
  SiInstructables,
  SiTiktok,
  SiYoutube,
  SiInstagram,
  SiTwitch,
  SiMastodon,
  SiBluesky,
} from "react-icons/si";
import { TbWorld, TbCube3dSphere } from "react-icons/tb";

/** Render a react-icon component to a static SVG string */
function iconToSvg(Icon: IconType, size: number): string {
  return renderToStaticMarkup(createElement(Icon, { size }));
}

/** Platform configuration for social links display and form fields */
export interface PlatformConfig {
  key: string;
  label: string;
  icon: string;
  placeholder: string;
}

/**
 * All supported social platforms in display order:
 * personal site → code/maker platforms → video/social → fediverse
 */
export const PLATFORMS: PlatformConfig[] = [
  {
    key: "website",
    label: "Website",
    icon: iconToSvg(TbWorld, 20),
    placeholder: "https://yoursite.com",
  },
  {
    key: "github",
    label: "GitHub",
    icon: iconToSvg(SiGithub, 20),
    placeholder: "https://github.com/username",
  },
  {
    key: "codeberg",
    label: "Codeberg",
    icon: iconToSvg(SiCodeberg, 20),
    placeholder: "https://codeberg.org/username",
  },
  {
    key: "hackaday",
    label: "Hackaday.io",
    icon: iconToSvg(SiHackaday, 20),
    placeholder: "https://hackaday.io/username",
  },
  {
    key: "onshape",
    label: "Onshape",
    icon: iconToSvg(TbCube3dSphere, 20),
    placeholder: "https://cad.onshape.com/documents/...",
  },
  {
    key: "printables",
    label: "Printables",
    icon: iconToSvg(SiPrintables, 20),
    placeholder: "https://www.printables.com/@username",
  },
  {
    key: "thingiverse",
    label: "Thingiverse",
    icon: iconToSvg(SiThingiverse, 20),
    placeholder: "https://www.thingiverse.com/username",
  },
  {
    key: "instructables",
    label: "Instructables",
    icon: iconToSvg(SiInstructables, 20),
    placeholder: "https://www.instructables.com/member/username",
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: iconToSvg(SiTiktok, 20),
    placeholder: "https://tiktok.com/@username",
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: iconToSvg(SiYoutube, 20),
    placeholder: "https://youtube.com/@channel",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: iconToSvg(SiInstagram, 20),
    placeholder: "https://instagram.com/username",
  },
  {
    key: "twitch",
    label: "Twitch",
    icon: iconToSvg(SiTwitch, 20),
    placeholder: "https://twitch.tv/username",
  },
  {
    key: "mastodon",
    label: "Mastodon",
    icon: iconToSvg(SiMastodon, 20),
    placeholder: "https://mastodon.social/@user",
  },
  {
    key: "bluesky",
    label: "Bluesky",
    icon: iconToSvg(SiBluesky, 20),
    placeholder: "https://bsky.app/profile/handle",
  },
];

/** Small (16px) icon variants for form labels */
export const PLATFORM_ICONS_SM: Record<string, string> = Object.fromEntries(
  PLATFORMS.map((p) => {
    // Re-render at 16px for form label usage
    const iconMap: Record<string, IconType> = {
      website: TbWorld,
      github: SiGithub,
      codeberg: SiCodeberg,
      hackaday: SiHackaday,
      onshape: TbCube3dSphere,
      printables: SiPrintables,
      thingiverse: SiThingiverse,
      instructables: SiInstructables,
      tiktok: SiTiktok,
      youtube: SiYoutube,
      instagram: SiInstagram,
      twitch: SiTwitch,
      mastodon: SiMastodon,
      bluesky: SiBluesky,
    };
    const Icon = iconMap[p.key];
    return [p.key, Icon ? iconToSvg(Icon, 16) : ""];
  })
);

/** All allowed social link keys (for API validation) */
export const SOCIAL_KEYS = PLATFORMS.map((p) => p.key);
