# Feedback Widget Architecture

> Design system: femme maximalist neobrutalism — see [`DESIGN.md`](../../DESIGN.md) before any UI code.
> Stack: Astro 6 SSR, Tailwind CSS v4 (CSS-first, NO `tailwind.config.js`), Drizzle + D1, Better Auth, Cloudflare R2/Workers.

---

## 1. Overview

A floating feedback button (fixed, bottom-right) expands into a panel where authenticated members can submit bug reports, feature requests, or general feedback. The widget auto-captures a screenshot of the current page, lets the user add optional annotated screenshots, uploads images to Cloudflare R2, then creates a GitHub issue and adds it to GitHub Project #1 (`cyberdeck-club` org, project number `1`).

**Visibility:** authenticated users only (`ctx.locals.user` present).

---

## 2. File Structure

```
src/
├── components/
│   └── feedback/
│       └── FeedbackWidget.tsx      ← React client island
├── lib/
│   ├── r2.ts                     ← R2 upload helpers
│   └── github-feedback.ts         ← GitHub REST + GraphQL helpers
├── pages/
│   └── api/
│       └── feedback.ts           ← POST endpoint (auth required)
src/env.d.ts                      ← Add MEDIA binding + R2 vars
wrangler.jsonc                    ← Uncomment R2 bucket binding
plans/FEEDBACK-WIDGET-DESIGN.md   ← This document
```

---

## 3. R2 Configuration

### 3.1 wrangler.jsonc — Uncomment R2 bucket

```jsonc
"r2_buckets": [
  {
    "binding": "MEDIA",
    "bucket_name": "cyberdeck-club-media",
  },
],
```

### 3.2 src/env.d.ts — Add to App.Env

```ts
interface Env {
  DB: DrizzleD1Database;
  MEDIA: R2Bucket;                        // ← add this
  PUBLIC_BASE_URL?: string;
  // ... existing fields ...
  GITHUB_FEEDBACK_PAT?: string;            // ← add this
  PUBLIC_MEDIA_BASE_URL?: string;          // ← add: R2 public base, e.g. https://pub-xxx.r2.dev
}
```

---

## 4. R2 Helper — src/lib/r2.ts

### 4.1 Path Conventions

| Prefix | Owner | Description |
|--------|-------|-------------|
| `feedback/{username}/` | feedback widget | Auto + user screenshots attached to feedback issues |
| `uploads/{username}/` | future use | User-uploaded media (profile photos, build images) |

**Files are named:** `{timestamp}-{type}.{ext}`

- `timestamp` — Unix epoch ms
- `type` — `auto` (html2canvas screenshot) or `user-N` (user-uploaded, N = 1-indexed)

### 4.2 Functions

```ts
// Upload a file buffer to R2 at feedback/{username}/{timestamp}-{type}.{ext}
// Returns the R2 object key (relative path)
export async function uploadFeedbackImage(
  env: App.Env,
  username: string,
  type: "auto" | `user-${number}`,
  ext: "png" | "jpg" | "jpeg" | "webp",
  data: ArrayBuffer
): Promise<string>;

// Build a public URL for a given R2 object key
export function getFeedbackImageUrl(env: App.Env, key: string): string;
```

### 4.3 Implementation Notes

- Use `env.MEDIA.put(key, data, { httpMetadata: { contentType } })`.
- `key` = `feedback/{sanitized-username}/{timestamp}-{type}.{ext}`.
- Sanitize `username` (replace spaces/slashes with `_`).
- Content-type inferred from extension; default to `application/octet-stream`.

---

## 5. GitHub Integration — src/lib/github-feedback.ts

### 5.1 REST API — Create Issue

**Endpoint:** `POST https://api.github.com/repos/{owner}/{repo}/issues`

**Headers:** `Authorization: Bearer {GITHUB_FEEDBACK_PAT}`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`

**Issue body structure:**

````markdown
## Feedback — {ISO date}

**Submitted by:** {displayName} ([@{username}](/admin/users?highlight={userId})) · {email}
**Page:** {current URL}

---

### Description

{free-text description}

---

### Screenshots

**Auto-captured view:**
![auto-captured screenshot]({R2 public URL})

{If user uploaded images:}
**Additional screenshot 1:**
![user screenshot 1]({R2 public URL})

(etc.)

---

*Submitted via cyberdeck.club feedback widget*
````

### 5.2 GraphQL API — Add to Project

**Endpoint:** `POST https://api.github.com/graphql`

**Query:** `addProjectV2ItemById` (GitHub GraphQL schema)

```graphql
mutation AddToProject($projectId: ID!, $itemId: ID!) {
  addProjectV2ItemById(input: { projectId: $projectId, itemId: $itemId }) {
    item {
      id
    }
  }
}
```

**Variables:** `{ "projectId": "PVT_kwHOA..." (from org project #1), "itemId": "PVT_..." (issue node id from REST response) }`

**Auth:** Same PAT as REST API.

### 5.3 Functions

```ts
export interface FeedbackIssueData {
  username: string;
  displayName: string;
  email: string;
  userId: string;
  pageUrl: string;
  description: string;
  autoScreenshotKey: string;      // R2 key
  additionalScreenshotKeys: string[];
  submittedAt: string;             // ISO 8601
}

export async function createFeedbackIssue(
  env: App.Env,
  data: FeedbackIssueData
): Promise<{ issueNumber: number; issueNodeId: string }>;

export async function addIssueToProject(
  env: App.Env,
  issueNodeId: string
): Promise<{ projectItemId: string }>;
```

### 5.4 Error Handling

- If `createFeedbackIssue` fails → return error to client (screenshot was already uploaded, clean up or leave as orphan).
- If `addIssueToProject` fails → log warning, do not fail the request (issue creation succeeded; project tracking is best-effort).
- Wrap all fetch calls in try/catch with descriptive error messages.

---

## 6. API Endpoint — src/pages/api/feedback.ts

### 6.1 Method & Content-Type

`POST` — `multipart/form-data` (supports file uploads)

### 6.2 Authentication

Check `ctx.locals.user` — if null, return `401 { error: "Not authenticated" }`.

### 6.3 Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | Yes | Free-text feedback context |
| `pageUrl` | string | Yes | Current page URL (from client `window.location.href`) |
| `autoScreenshot` | Blob | Yes | PNG from html2canvas |
| `images` | File[] | No | Additional user-uploaded images (max 5) |

### 6.4 Request Limits

- `autoScreenshot` max 10 MB
- Each `images` entry max 5 MB
- Max 5 additional images
- Total request size soft limit: 50 MB

### 6.5 Processing Flow

```
1. Validate auth session
2. Parse FormData
3. Validate description (non-empty, max 5000 chars)
4. Validate pageUrl (must be a valid URL on cyberdeck.club)
5. Upload autoScreenshot to R2 → keyA
6. Upload each image-N to R2 → [key1, key2, ...]
7. Construct GitHub issue body with R2 public URLs
8. Create GitHub issue via REST API → { number, node_id }
9. Add issue to Project #1 via GraphQL API
10. Return { success: true, issueNumber: number }
```

### 6.6 Response

**Success (201):**
```json
{ "success": true, "issueNumber": 42 }
```

**Auth error (401):**
```json
{ "error": "Not authenticated" }
```

**Validation error (400):**
```json
{ "error": "Description is required" }
```

**Server error (500):**
```json
{ "error": "Failed to create feedback issue" }
```

---

## 7. React Client Component — src/components/feedback/FeedbackWidget.tsx

### 7.1 Component Structure

```
FeedbackWidget (React, client:load)
├── TriggerButton (fixed, bottom-right)
│   └── ExpandedPanel (conditional, animated)
│       ├── Header ("Send us feedback")
│       ├── AutoScreenshotCapture (hidden canvas → base64)
│       ├── DescriptionTextarea
│       ├── FileUpload (additional screenshots)
│       ├── PreviewThumbnails
│       ├── SubmitButton
│       ├── LoadingState
│       ├── SuccessState
│       └── ErrorState
```

### 7.2 State Machine

```
idle → capturing → filling → submitting → success | error
                                          ↓
                                     (returns to filling after 3s)
```

### 7.3 Design System (Neobrutalist)

**Trigger button:**
```tsx
<button className="
  fixed bottom-6 right-6 z-50
  bg-primary-600 text-ink-950
  border-3 border-border rounded-sm
  w-14 h-14
  shadow-[4px_4px_0_0_var(--shadow-hard)]
  hover:translate-x-[2px] hover:translate-y-[2px]
  hover:shadow-[1px_1px_0_0_var(--shadow-hard)]
  active:translate-x-1 active:translate-y-1 active:shadow-none
  focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-focus focus-visible:ring-offset-2
  transition-[transform,box-shadow] duration-75
  flex items-center justify-center
">
  {/* Chat-bubble or lightbulb SVG icon */}
</button>
```

**Expanded panel:**
```tsx
<div className="
  fixed bottom-6 right-6 z-50
  bg-surface border-3 border-border rounded-sm
  shadow-[6px_6px_0_0_var(--shadow-hard)]
  w-80 p-6
  flex flex-col gap-4
">
```

**Input recipe:**
```tsx
<textarea className="
  w-full
  bg-surface border-2 border-border rounded-sm
  px-4 py-3
  font-sans text-base text-text
  placeholder:text-text-muted
  focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2
  resize-y min-h-[100px]
"/>
```

**Primary button:**
```tsx
<button className="
  w-full
  bg-primary-600 text-ink-950
  border-3 border-border rounded-sm
  px-5 py-2.5
  font-display font-extrabold text-base
  shadow-[4px_4px_0_0_var(--shadow-hard)]
  hover:translate-x-[2px] hover:translate-y-[2px]
  hover:shadow-[1px_1px_0_0_var(--shadow-hard)]
  active:translate-x-1 active:translate-y-1 active:shadow-none
  focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-focus focus-visible:ring-offset-2
  transition-[transform,box-shadow] duration-75
  disabled:opacity-50 disabled:cursor-not-allowed
"/>
```

### 7.4 html2canvas Integration

```tsx
import html2canvas from "html2canvas";

async function captureScreenshot(): Promise<Blob | null> {
  const canvas = await html2canvas(document.body, {
    useCORS: true,
    allowTaint: false,
    scale: window.devicePixelRatio || 1,
    logging: false,
  });
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.9);
  });
}
```

- Capture happens when panel opens (not on trigger click).
- Store blob in component state.
- Show small thumbnail preview after capture.
- If capture fails, allow submit without auto-screenshot (flag field in API).

### 7.5 File Upload for Additional Screenshots

- Standard `<input type="file" accept="image/*" multiple />`.
- Client-side validation: max 5 files, max 5 MB each.
- Show thumbnail previews with remove button.
- Append as `images` field in `FormData`.

### 7.6 Copy (Warm, Plainspoken)

| Context | Copy |
|---------|------|
| Trigger tooltip | "Send feedback" |
| Panel heading | "Got thoughts?" |
| Description placeholder | "What's up? Broken link, missing photo, wild idea — all good." |
| Screenshot label | "Here's what you're seeing" |
| Additional photos label | "Add more screenshots (optional)" |
| Submit button | "Send it" |
| Loading | "Sending…" |
| Success message | "Feedback sent! Thanks for helping make cyberdeck.club better." |
| Error message | "That didn't go through — want to try again?" |
| Auth prompt | (component not rendered if not authenticated) |

### 7.7 Animation & Motion

- Panel open/close: `max-height` transition, 200ms, `ease-out`.
- Success checkmark: scale-in 200ms.
- All transitions ≤ 250ms per DESIGN.md §1.7.
- Wrap in `motion-safe:` or respect `prefers-reduced-motion`.

---

## 8. BaseLayout Integration

```astro
<!-- src/layouts/BaseLayout.astro -->
{/* before </body> */}
{user && <FeedbackWidget client:load />}
```

**Note:** The widget is **only rendered when `user` is present** (authenticated). Since `BaseLayout.astro` doesn't currently receive a `user` prop, either:

1. Pass `user` from every page layout that extends `BaseLayout`, OR
2. Move the auth check into the widget itself (check `window.cyberdeckUser` or call an API route).

Recommended: pass `user` prop through the layout chain.

---

## 9. Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `GITHUB_FEEDBACK_PAT` | Cloudflare secret | PAT from feedback bot account (org-level or repo-level with `issues:write` + `project:write`) |
| `PUBLIC_MEDIA_BASE_URL` | Cloudflare vars | Public R2 bucket URL, e.g. `https://pub-xxx.r2.dev` |

**R2 bucket must be public** (or use R2's public bucket URL feature) for GitHub issue image links to work.

---

## 10. npm Dependency

```bash
npm install html2canvas
```

**Do NOT use `pnpm`** — project rules require `npm`.

Add to `package.json` via `npm install html2canvas` (do not edit `package.json` directly).

---

## 11. Implementation Order

1. **Uncomment R2 in wrangler.jsonc** — verify binding works before writing R2 helper
2. **Add types to src/env.d.ts** — `R2Bucket`, `MEDIA` binding, `GITHUB_FEEDBACK_PAT`, `PUBLIC_MEDIA_BASE_URL`
3. **Implement `src/lib/r2.ts`** — upload helper + URL builder, test with local `wrangler dev`
4. **Implement `src/lib/github-feedback.ts`** — REST issue creation + GraphQL project add
5. **Implement `src/pages/api/feedback.ts`** — POST handler with auth check + FormData parsing + R2 upload + GitHub calls
6. **Install html2canvas** — `npm install html2canvas`
7. **Implement `src/components/feedback/FeedbackWidget.tsx`** — full client island
8. **Add to BaseLayout** — pass `user` prop, render `<FeedbackWidget client:load />`
9. **Test locally** — `wrangler dev`, submit feedback, verify GitHub issue + project item
10. **Set secrets** — `wrangler secret put GITHUB_FEEDBACK_PAT --env beta` (and production)
