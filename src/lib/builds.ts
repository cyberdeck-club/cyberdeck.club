import { eq, desc, and, sql, notLike, isNull, notInArray } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";

// Re-export types for convenience
export type Build = typeof schema.builds.$inferSelect;

/**
 * Get all published builds with author_name, ordered by created_at DESC
 */
export function getBuilds(
  db: DrizzleD1Database<typeof schema>,
  options?: { limit?: number; offset?: number; excludeUserIds?: string[] }
) {
  const { limit = 50, offset = 0, excludeUserIds } = options ?? {};

  const conditions = [
    eq(schema.builds.status, "published"),
    isNull(schema.builds.deletedAt),
    notLike(schema.user.name, "%[Test Account]%"),
    notLike(schema.user.name, "%[deleted]%"),
  ];

  if (excludeUserIds && excludeUserIds.length > 0) {
    conditions.push(notInArray(schema.builds.authorId, excludeUserIds));
  }

  return db
    .select({
      build: schema.builds,
      authorName: schema.user.name,
    })
    .from(schema.builds)
    .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
    .where(and(...conditions))
    .orderBy(desc(schema.builds.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single published build by slug with author_name
 */
export function getBuild(
  db: DrizzleD1Database<typeof schema>,
  slug: string
) {
  return db
    .select({
      build: schema.builds,
      authorName: schema.user.name,
    })
    .from(schema.builds)
    .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
    .where(and(eq(schema.builds.slug, slug), eq(schema.builds.status, "published"), isNull(schema.builds.deletedAt)))
    .limit(1);
}

/**
 * Get a single build by slug regardless of status (for privileged review).
 * Used by moderators/admins to preview builds before approval,
 * and by build authors to view their own pending/rejected builds.
 * Caller MUST verify the user has permission before using this.
 */
export function getBuildForReview(
  db: DrizzleD1Database<typeof schema>,
  slug: string
) {
  return db
    .select({
      build: schema.builds,
      authorName: schema.user.name,
    })
    .from(schema.builds)
    .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
    .where(and(eq(schema.builds.slug, slug), isNull(schema.builds.deletedAt)))
    .limit(1);
}

/**
 * Get all builds by a specific user, regardless of status.
 * Excludes soft-deleted builds. Ordered by createdAt DESC.
 * Used for the "My Builds" page so users can see their published,
 * pending, and needs-revision builds.
 */
export function getUserBuilds(
  db: DrizzleD1Database<typeof schema>,
  userId: string
) {
  return db
    .select({
      build: schema.builds,
      authorName: schema.user.name,
    })
    .from(schema.builds)
    .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
    .where(
      and(
        eq(schema.builds.authorId, userId),
        isNull(schema.builds.deletedAt)
      )
    )
    .orderBy(desc(schema.builds.createdAt));
}

/**
 * Get the latest N published builds, ordered by created_at DESC
 */
export function getRecentBuilds(
  db: DrizzleD1Database<typeof schema>,
  limit: number,
  options?: { excludeUserIds?: string[] }
) {
  const { excludeUserIds } = options ?? {};

  const conditions = [
    eq(schema.builds.status, "published"),
    isNull(schema.builds.deletedAt),
    notLike(schema.user.name, "%[Test Account]%"),
    notLike(schema.user.name, "%[deleted]%"),
  ];

  if (excludeUserIds && excludeUserIds.length > 0) {
    conditions.push(notInArray(schema.builds.authorId, excludeUserIds));
  }

  return db
    .select({
      build: schema.builds,
      authorName: schema.user.name,
    })
    .from(schema.builds)
    .innerJoin(schema.user, eq(schema.builds.authorId, schema.user.id))
    .where(and(...conditions));
}
// JSON field names that need parsing
const JSON_FIELDS = [
  "tags",
  "wiring",
  "codebase",
  "models3d",
  "photos",
  "videos",
  "tiktokLinks",
  "billOfMaterials",
  "circuitBoards",
  "inspirations",
  "powerDetails",
  "connectivity",
  "displayInfo",
  "enclosureDetails",
] as const;

type JsonFieldName = (typeof JSON_FIELDS)[number];

/**
 * Parsed build type with JSON fields converted from strings to objects
 */
export interface ParsedBuild extends Omit<Build, JsonFieldName> {
  tags: string[] | null;
  wiring: schema.WiringData | null;
  codebase: schema.CodebaseData | null;
  models3d: schema.Models3dData | null;
  photos: schema.PhotosData | null;
  videos: schema.VideosData | null;
  tiktokLinks: string[] | null;
  billOfMaterials: schema.BillOfMaterialsData | null;
  circuitBoards: schema.CircuitBoardsData | null;
  inspirations: schema.InspirationsData | null;
  powerDetails: schema.PowerDetailsData | null;
  connectivity: schema.ConnectivityData | null;
  displayInfo: schema.DisplayInfoData | null;
  enclosureDetails: schema.EnclosureDetailsData | null;
}

/**
 * Parse a raw build object from Drizzle, converting JSON text columns into typed objects.
 * Returns the build with parsed fields, where null JSON strings become null objects.
 */
export function parseBuildJsonFields<T extends Build>(build: T): ParsedBuild {
  const result: Record<string, unknown> = { ...build };

  // Parse tags (string array JSON)
  const tagsVal = (build as Record<string, unknown>).tags;
  if (tagsVal !== null && tagsVal !== undefined) {
    try {
      result.tags = JSON.parse(tagsVal as string) as string[];
    } catch {
      result.tags = null;
    }
  } else {
    result.tags = null;
  }

  // Parse tiktokLinks (string array JSON)
  const tiktokVal = (build as Record<string, unknown>).tiktokLinks;
  if (tiktokVal !== null && tiktokVal !== undefined) {
    try {
      result.tiktokLinks = JSON.parse(tiktokVal as string) as string[];
    } catch {
      result.tiktokLinks = null;
    }
  } else {
    result.tiktokLinks = null;
  }

  // Parse wiring
  const wiringVal = (build as Record<string, unknown>).wiring;
  if (wiringVal !== null && wiringVal !== undefined) {
    try {
      result.wiring = JSON.parse(wiringVal as string) as schema.WiringData;
    } catch {
      result.wiring = null;
    }
  } else {
    result.wiring = null;
  }

  // Parse codebase
  const codebaseVal = (build as Record<string, unknown>).codebase;
  if (codebaseVal !== null && codebaseVal !== undefined) {
    try {
      result.codebase = JSON.parse(codebaseVal as string) as schema.CodebaseData;
    } catch {
      result.codebase = null;
    }
  } else {
    result.codebase = null;
  }

  // Parse models3d
  const models3dVal = (build as Record<string, unknown>).models3d;
  if (models3dVal !== null && models3dVal !== undefined) {
    try {
      result.models3d = JSON.parse(models3dVal as string) as schema.Models3dData;
    } catch {
      result.models3d = null;
    }
  } else {
    result.models3d = null;
  }

  // Parse photos
  const photosVal = (build as Record<string, unknown>).photos;
  if (photosVal !== null && photosVal !== undefined) {
    try {
      result.photos = JSON.parse(photosVal as string) as schema.PhotosData;
    } catch {
      result.photos = null;
    }
  } else {
    result.photos = null;
  }

  // Parse videos
  const videosVal = (build as Record<string, unknown>).videos;
  if (videosVal !== null && videosVal !== undefined) {
    try {
      result.videos = JSON.parse(videosVal as string) as schema.VideosData;
    } catch {
      result.videos = null;
    }
  } else {
    result.videos = null;
  }

  // Parse billOfMaterials
  const bomVal = (build as Record<string, unknown>).billOfMaterials;
  if (bomVal !== null && bomVal !== undefined) {
    try {
      result.billOfMaterials = JSON.parse(bomVal as string) as schema.BillOfMaterialsData;
    } catch {
      result.billOfMaterials = null;
    }
  } else {
    result.billOfMaterials = null;
  }

  // Parse circuitBoards
  const cbVal = (build as Record<string, unknown>).circuitBoards;
  if (cbVal !== null && cbVal !== undefined) {
    try {
      result.circuitBoards = JSON.parse(cbVal as string) as schema.CircuitBoardsData;
    } catch {
      result.circuitBoards = null;
    }
  } else {
    result.circuitBoards = null;
  }

  // Parse inspirations
  const insVal = (build as Record<string, unknown>).inspirations;
  if (insVal !== null && insVal !== undefined) {
    try {
      result.inspirations = JSON.parse(insVal as string) as schema.InspirationsData;
    } catch {
      result.inspirations = null;
    }
  } else {
    result.inspirations = null;
  }

  // Parse powerDetails
  const pdVal = (build as Record<string, unknown>).powerDetails;
  if (pdVal !== null && pdVal !== undefined) {
    try {
      result.powerDetails = JSON.parse(pdVal as string) as schema.PowerDetailsData;
    } catch {
      result.powerDetails = null;
    }
  } else {
    result.powerDetails = null;
  }

  // Parse connectivity
  const connVal = (build as Record<string, unknown>).connectivity;
  if (connVal !== null && connVal !== undefined) {
    try {
      result.connectivity = JSON.parse(connVal as string) as schema.ConnectivityData;
    } catch {
      result.connectivity = null;
    }
  } else {
    result.connectivity = null;
  }

  // Parse displayInfo
  const diVal = (build as Record<string, unknown>).displayInfo;
  if (diVal !== null && diVal !== undefined) {
    try {
      result.displayInfo = JSON.parse(diVal as string) as schema.DisplayInfoData;
    } catch {
      result.displayInfo = null;
    }
  } else {
    result.displayInfo = null;
  }

  // Parse enclosureDetails
  const edVal = (build as Record<string, unknown>).enclosureDetails;
  if (edVal !== null && edVal !== undefined) {
    try {
      result.enclosureDetails = JSON.parse(edVal as string) as schema.EnclosureDetailsData;
    } catch {
      result.enclosureDetails = null;
    }
  } else {
    result.enclosureDetails = null;
  }

  return result as unknown as ParsedBuild;
}

/**
 * Input type for build data with typed JSON fields (before serialization)
 */
export interface BuildDataInput {
  tags?: string[] | null;
  wiring?: schema.WiringData | null;
  codebase?: schema.CodebaseData | null;
  models3d?: schema.Models3dData | null;
  photos?: schema.PhotosData | null;
  videos?: schema.VideosData | null;
  tiktokLinks?: string[] | null;
  billOfMaterials?: schema.BillOfMaterialsData | null;
  circuitBoards?: schema.CircuitBoardsData | null;
  inspirations?: schema.InspirationsData | null;
  powerDetails?: schema.PowerDetailsData | null;
  connectivity?: schema.ConnectivityData | null;
  displayInfo?: schema.DisplayInfoData | null;
  enclosureDetails?: schema.EnclosureDetailsData | null;
}

/**
 * Serialize build data with typed JSON fields to strings for DB storage.
 * Returns an object with JSON fields converted to strings, null values left as null.
 */
export function serializeBuildJsonFields(data: BuildDataInput): Record<string, string | null> {
  const result: Record<string, string | null> = {};

  // Serialize tags
  if (data.tags === undefined) {
    result.tags = null;
  } else if (data.tags === null) {
    result.tags = null;
  } else {
    result.tags = JSON.stringify(data.tags);
  }

  // Serialize tiktokLinks
  if (data.tiktokLinks === undefined) {
    result.tiktokLinks = null;
  } else if (data.tiktokLinks === null) {
    result.tiktokLinks = null;
  } else {
    result.tiktokLinks = JSON.stringify(data.tiktokLinks);
  }

  // Serialize wiring
  result.wiring = data.wiring === undefined || data.wiring === null ? null : JSON.stringify(data.wiring);

  // Serialize codebase
  result.codebase = data.codebase === undefined || data.codebase === null ? null : JSON.stringify(data.codebase);

  // Serialize models3d
  result.models3d = data.models3d === undefined || data.models3d === null ? null : JSON.stringify(data.models3d);

  // Serialize photos
  result.photos = data.photos === undefined || data.photos === null ? null : JSON.stringify(data.photos);

  // Serialize videos
  result.videos = data.videos === undefined || data.videos === null ? null : JSON.stringify(data.videos);

  // Serialize billOfMaterials
  result.billOfMaterials = data.billOfMaterials === undefined || data.billOfMaterials === null
    ? null
    : JSON.stringify(data.billOfMaterials);

  // Serialize circuitBoards
  result.circuitBoards = data.circuitBoards === undefined || data.circuitBoards === null
    ? null
    : JSON.stringify(data.circuitBoards);

  // Serialize inspirations
  result.inspirations = data.inspirations === undefined || data.inspirations === null
    ? null
    : JSON.stringify(data.inspirations);

  // Serialize powerDetails
  result.powerDetails = data.powerDetails === undefined || data.powerDetails === null
    ? null
    : JSON.stringify(data.powerDetails);

  // Serialize connectivity
  result.connectivity = data.connectivity === undefined || data.connectivity === null
    ? null
    : JSON.stringify(data.connectivity);

  // Serialize displayInfo
  result.displayInfo = data.displayInfo === undefined || data.displayInfo === null
    ? null
    : JSON.stringify(data.displayInfo);

  // Serialize enclosureDetails
  result.enclosureDetails = data.enclosureDetails === undefined || data.enclosureDetails === null
    ? null
    : JSON.stringify(data.enclosureDetails);

  return result;
}

/**
 * Validation result for a single field
 */
export interface FieldValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a single specialized build field.
 * Returns validation result with any error messages.
 */
export function validateBuildField(
  name: string,
  value: unknown
): FieldValidationResult {
  const errors: string[] = [];

  switch (name) {
    case "difficulty": {
      if (value !== null && value !== undefined) {
        const validValues = ["beginner", "intermediate", "advanced"];
        if (typeof value !== "string" || !validValues.includes(value)) {
          errors.push(`difficulty must be one of: ${validValues.join(", ")}`);
        }
      }
      break;
    }

    case "computePlatform": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "string") {
          errors.push("computePlatform must be a string");
        } else if (value.length > 100) {
          errors.push("computePlatform must be 100 characters or less");
        }
      }
      break;
    }

    case "estimatedCost": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "number" || !Number.isInteger(value)) {
          errors.push("estimatedCost must be an integer (cents)");
        } else if (value < 0) {
          errors.push("estimatedCost cannot be negative");
        } else if (value > 100000000) {
          errors.push("estimatedCost exceeds maximum value");
        }
      }
      break;
    }

    case "buildTime": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "string") {
          errors.push("buildTime must be a string");
        } else if (value.length > 100) {
          errors.push("buildTime must be 100 characters or less");
        }
      }
      break;
    }

    case "tags": {
      if (value !== null && value !== undefined) {
        if (!Array.isArray(value)) {
          errors.push("tags must be an array of strings");
        } else if (!value.every((item) => typeof item === "string")) {
          errors.push("tags must be an array of strings");
        }
      }
      break;
    }

    case "wiring": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "object" || value === null) {
          errors.push("wiring must be an object with description and imageUrls");
        } else {
          const w = value as schema.WiringData;
          if (typeof w.description !== "string") {
            errors.push("wiring.description must be a string");
          }
          if (!Array.isArray(w.imageUrls)) {
            errors.push("wiring.imageUrls must be an array of strings");
          } else if (!w.imageUrls.every((url) => typeof url === "string")) {
            errors.push("wiring.imageUrls must contain only strings");
          }
        }
      }
      break;
    }

    case "codebase": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "object" || value === null) {
          errors.push("codebase must be an object with description and url");
        } else {
          const c = value as schema.CodebaseData;
          if (typeof c.description !== "string") {
            errors.push("codebase.description must be a string");
          }
          if (typeof c.url !== "string") {
            errors.push("codebase.url must be a string");
          } else {
            try {
              new URL(c.url);
            } catch {
              errors.push("codebase.url must be a valid URL");
            }
          }
        }
      }
      break;
    }

    case "models3d": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "object" || value === null) {
          errors.push("models3d must be an object with description and files");
        } else {
          const m = value as schema.Models3dData;
          if (typeof m.description !== "string") {
            errors.push("models3d.description must be a string");
          }
          if (!Array.isArray(m.files)) {
            errors.push("models3d.files must be an array");
          } else {
            for (let i = 0; i < m.files.length; i++) {
              const file = m.files[i];
              if (typeof file.name !== "string") {
                errors.push(`models3d.files[${i}].name must be a string`);
              }
              if (typeof file.url !== "string") {
                errors.push(`models3d.files[${i}].url must be a string`);
              }
              if (file.imageUrl !== undefined && typeof file.imageUrl !== "string") {
                errors.push(`models3d.files[${i}].imageUrl must be a string if provided`);
              }
            }
          }
        }
      }
      break;
    }

    case "photos": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "object" || value === null) {
          errors.push("photos must be an object with mainImageUrl and buildStepImages");
        } else {
          const p = value as schema.PhotosData;
          if (typeof p.mainImageUrl !== "string") {
            errors.push("photos.mainImageUrl must be a string");
          }
          if (!Array.isArray(p.buildStepImages)) {
            errors.push("photos.buildStepImages must be an array of strings");
          } else if (!p.buildStepImages.every((url) => typeof url === "string")) {
            errors.push("photos.buildStepImages must contain only strings");
          }
        }
      }
      break;
    }

    case "videos": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "object" || value === null) {
          errors.push("videos must be an object with mainVideoUrl and optionally demoVideoUrl/buildStepVideos");
        } else {
          const v = value as schema.VideosData;
          if (typeof v.mainVideoUrl !== "string") {
            errors.push("videos.mainVideoUrl must be a string");
          }
          if (v.demoVideoUrl !== undefined && typeof v.demoVideoUrl !== "string") {
            errors.push("videos.demoVideoUrl must be a string if provided");
          }
          if (v.buildStepVideos !== undefined) {
            if (!Array.isArray(v.buildStepVideos)) {
              errors.push("videos.buildStepVideos must be an array of strings");
            } else if (!v.buildStepVideos.every((url) => typeof url === "string")) {
              errors.push("videos.buildStepVideos must contain only strings");
            }
          }
        }
      }
      break;
    }

    case "tiktokLinks": {
      if (value !== null && value !== undefined) {
        if (!Array.isArray(value)) {
          errors.push("tiktokLinks must be an array of strings");
        } else if (!value.every((item) => typeof item === "string")) {
          errors.push("tiktokLinks must be an array of strings");
        }
      }
      break;
    }

    case "billOfMaterials": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "object" || value === null) {
          errors.push("billOfMaterials must be an object with items array");
        } else {
          const b = value as schema.BillOfMaterialsData;
          if (!Array.isArray(b.items)) {
            errors.push("billOfMaterials.items must be an array");
          } else {
            for (let i = 0; i < b.items.length; i++) {
              const item = b.items[i];
              if (typeof item.item !== "string") {
                errors.push(`billOfMaterials.items[${i}].item must be a string`);
              }
              if (item.link !== undefined && typeof item.link !== "string") {
                errors.push(`billOfMaterials.items[${i}].link must be a string if provided`);
              }
              if (item.estimatedCost !== undefined && typeof item.estimatedCost !== "number") {
                errors.push(`billOfMaterials.items[${i}].estimatedCost must be a number if provided`);
              }
              if (item.notes !== undefined && typeof item.notes !== "string") {
                errors.push(`billOfMaterials.items[${i}].notes must be a string if provided`);
              }
            }
          }
        }
      }
      break;
    }

    case "circuitBoards": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "object" || value === null) {
          errors.push("circuitBoards must be an object with description, fileUrls, and imageUrls");
        } else {
          const cb = value as schema.CircuitBoardsData;
          if (typeof cb.description !== "string") {
            errors.push("circuitBoards.description must be a string");
          }
          if (!Array.isArray(cb.fileUrls)) {
            errors.push("circuitBoards.fileUrls must be an array of strings");
          } else if (!cb.fileUrls.every((url) => typeof url === "string")) {
            errors.push("circuitBoards.fileUrls must contain only strings");
          }
          if (!Array.isArray(cb.imageUrls)) {
            errors.push("circuitBoards.imageUrls must be an array of strings");
          } else if (!cb.imageUrls.every((url) => typeof url === "string")) {
            errors.push("circuitBoards.imageUrls must contain only strings");
          }
        }
      }
      break;
    }

    case "inspirations": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "object" || value === null) {
          errors.push("inspirations must be an object with buildSlugs and externalLinks");
        } else {
          const ins = value as schema.InspirationsData;
          if (!Array.isArray(ins.buildSlugs)) {
            errors.push("inspirations.buildSlugs must be an array of strings");
          } else if (!ins.buildSlugs.every((slug) => typeof slug === "string")) {
            errors.push("inspirations.buildSlugs must contain only strings");
          }
          if (!Array.isArray(ins.externalLinks)) {
            errors.push("inspirations.externalLinks must be an array");
          } else {
            for (let i = 0; i < ins.externalLinks.length; i++) {
              const link = ins.externalLinks[i];
              if (typeof link.title !== "string") {
                errors.push(`inspirations.externalLinks[${i}].title must be a string`);
              }
              if (typeof link.url !== "string") {
                errors.push(`inspirations.externalLinks[${i}].url must be a string`);
              } else {
                try {
                  new URL(link.url);
                } catch {
                  errors.push(`inspirations.externalLinks[${i}].url must be a valid URL`);
                }
              }
            }
          }
        }
      }
      break;
    }

    case "powerDetails": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "object" || value === null) {
          errors.push("powerDetails must be an object with batteryType, capacity, and estimatedRuntime");
        } else {
          const pd = value as schema.PowerDetailsData;
          if (typeof pd.batteryType !== "string") {
            errors.push("powerDetails.batteryType must be a string");
          }
          if (typeof pd.capacity !== "string") {
            errors.push("powerDetails.capacity must be a string");
          }
          if (typeof pd.estimatedRuntime !== "string") {
            errors.push("powerDetails.estimatedRuntime must be a string");
          }
        }
      }
      break;
    }

    case "connectivity": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "object" || value === null) {
          errors.push("connectivity must be an object with wifi, bluetooth, cellular, and other");
        } else {
          const conn = value as schema.ConnectivityData;
          if (typeof conn.wifi !== "boolean") {
            errors.push("connectivity.wifi must be a boolean");
          }
          if (typeof conn.bluetooth !== "boolean") {
            errors.push("connectivity.bluetooth must be a boolean");
          }
          if (typeof conn.cellular !== "boolean") {
            errors.push("connectivity.cellular must be a boolean");
          }
          if (!Array.isArray(conn.other)) {
            errors.push("connectivity.other must be an array of strings");
          } else if (!conn.other.every((item) => typeof item === "string")) {
            errors.push("connectivity.other must contain only strings");
          }
        }
      }
      break;
    }

    case "displayInfo": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "object" || value === null) {
          errors.push("displayInfo must be an object with type, size, and resolution");
        } else {
          const di = value as schema.DisplayInfoData;
          if (typeof di.type !== "string") {
            errors.push("displayInfo.type must be a string");
          }
          if (typeof di.size !== "string") {
            errors.push("displayInfo.size must be a string");
          }
          if (typeof di.resolution !== "string") {
            errors.push("displayInfo.resolution must be a string");
          }
        }
      }
      break;
    }

    case "enclosureDetails": {
      if (value !== null && value !== undefined) {
        if (typeof value !== "object" || value === null) {
          errors.push("enclosureDetails must be an object with material, source, and customization");
        } else {
          const ed = value as schema.EnclosureDetailsData;
          if (typeof ed.material !== "string") {
            errors.push("enclosureDetails.material must be a string");
          }
          if (typeof ed.source !== "string") {
            errors.push("enclosureDetails.source must be a string");
          }
          if (typeof ed.customization !== "string") {
            errors.push("enclosureDetails.customization must be a string");
          }
        }
      }
      break;
    }

    default:
      errors.push(`Unknown field: ${name}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
