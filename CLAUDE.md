# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NGX Vision** is a premium viral lead magnet that creates a cinematic 8-second transformation video. Users upload a photo, provide profile data, and receive an AI-generated video showing them as the hero of their transformation journey using **Google VEO 3.1 API**.

## Business Context

**Strategic Purpose**: NGX Vision is a **viral lead-generation tool** designed to capture users through emotional impact and convert them to NGX's main subscription fitness app.

**Differentiators vs NGX Transform**:
- Transform = 4 static images (m0/m4/m8/m12)
- **Vision = 1 cinematic VIDEO (8 seconds)** ← This repo
- 10x higher emotional impact through video
- Native audio (AI-generated soundtrack)
- Stories/TikTok ready (9:16 vertical format)
- Uses YOUR actual photo as reference to preserve identity

**Growth Strategy**:
- Free tool with high shareability (video content is inherently viral)
- Captures email leads at wizard entry
- Results page includes CTA to NGX subscription app
- Shareable URLs with Open Graph meta tags for social spread

## User Journey

```
Landing (/)
    ↓
Wizard (/wizard)
    ├── Email capture (lead)
    ├── Photo upload (frontal, good lighting)
    ├── Identity & Biometrics (age, sex, height, weight, bodyType)
    ├── Focus Zone (upper/lower/abs/full)
    ├── Goals & Strategy (level, goal, weeklyTime)
    └── Mental Logs (stress, sleep, discipline sliders)
    ↓
Processing (VideoLoader)
    ├── "Analizando tu potencial..."
    ├── "Componiendo tu narrativa heroica..."
    ├── "Renderizando tu trailer cinematográfico..."
    └── ~60-120 seconds wait (VEO generation)
    ↓
Results (/v/[shareId])
    ├── Fullscreen video player (autoplay, loop)
    ├── Hero narrative text overlay
    ├── Download MP4 button
    ├── Share buttons (Stories, TikTok, WhatsApp)
    └── CTA → NGX Subscription
```

## Development Commands

```bash
pnpm dev          # Dev server at localhost:3000
pnpm build        # Production build
pnpm start        # Production server
pnpm lint         # ESLint
```

## Architecture

**Stack**: Next.js 15.5 (App Router) + React 19 + Firebase + Google VEO 3.1 + Gemini + Tailwind CSS v4

### Data Flow

1. **Wizard** (`/wizard`) → User uploads photo + profile data
2. **Session Creation** → Firebase Storage (photo) + Firestore (session doc)
3. **Analysis** (`/api/analyze`) → Gemini generates:
   - `user_visual_anchor` (detailed facial description for identity preservation)
   - `hero_narrative` (inspiring story)
   - `veo_prompt` (cinematic video prompt)
4. **Video Generation** (`/api/generate-video`) → VEO 3.1 creates 8-second cinematic video
5. **Results** (`/v/[shareId]`) → Shareable video player page

### Key Services

| Service | Location | Purpose |
|---------|----------|---------|
| `veo.ts` | `src/lib/` | VEO 3.1 API client with polling |
| `gemini.ts` | `src/lib/` | Gemini 2.5 Flash for analysis + veo_prompt generation |
| `firebaseAdmin.ts` | `src/lib/` | Server-side Firestore/Storage operations |
| `storage.ts` | `src/lib/` | Signed URL generation, video uploads |
| `validators.ts` | `src/lib/` | Zod schemas for all API inputs |

### API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sessions` | POST | Create session with profile + photo |
| `/api/sessions/[shareId]` | GET | Fetch session data |
| `/api/sessions/[shareId]/video-url` | GET | Get signed URL for video |
| `/api/analyze` | POST | Run Gemini analysis, generate veo_prompt |
| `/api/generate-video` | POST | Generate video with VEO 3.1 |
| `/api/leads` | POST | Capture email leads |

### VEO 3.1 Specifications

| Parameter | Value | Notes |
|-----------|-------|-------|
| Model | `veo-3.0-generate-preview` | Current model |
| Duration | 8 seconds | Optimal quality/cost balance |
| Resolution | 1080p | HD vertical video |
| Aspect Ratio | 9:16 | Vertical - Stories/TikTok optimized |
| Audio | Native | AI-generated soundtrack |
| Reference Images | 1 | User's uploaded photo for identity |
| Generation Time | 60-180 seconds | Requires polling |

### Type Definitions

Core types in `src/types/`:
- `VisionAnalysisResult` - user_visual_anchor, hero_narrative, veo_prompt
- `VeoGenerationConfig` - VEO API configuration
- `VisionSession` - Full session with video data

Video types in `src/types/video.ts`:
- `VeoGenerationConfig` - Video generation parameters
- `VeoGenerationResult` - Video output with metadata
- `VideoViewerProps` - Player component props

### Key UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `VideoViewer` | `src/components/` | Fullscreen video player with controls |
| `VideoLoader` | `src/components/` | Animated loading for video generation |
| `BiometricLoader` | `src/components/` | Fallback loading screen |

### AI Prompt Strategy

The Gemini integration generates:
1. **user_visual_anchor**: Immutable facial/physical description for identity preservation
2. **hero_narrative**: 2-3 sentence inspiring narrative in second person
3. **veo_prompt**: Complete VEO 3.1 prompt with:
   - Identity lock (preserve facial features)
   - 8-second cinematic sequence
   - Nike ad aesthetic
   - Audio direction
   - 9:16 vertical format constraints

## Environment Variables

```bash
# Firebase (required)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN..."  # Escape \n as literal

# Gemini API (required - for analysis AND VEO)
GEMINI_API_KEY=

# VEO Config (optional - has defaults)
VEO_MODEL=veo-3.0-generate-preview
VEO_DURATION_SECONDS=8
VEO_RESOLUTION=1080p
VEO_ASPECT_RATIO=9:16

# Optional
RESEND_API_KEY=                    # For email sharing
NEXT_PUBLIC_BOOKING_URL=           # CTA link
```

## Design System

**Colors**: Electric Violet `#6D00FF` (primary), Deep Purple `#5B21B6` (accent), Background `#0A0A0A`

**Video Style**: Nike advertisement meets documentary meets music video
- Dramatic lighting (golden hour, volumetric)
- Slow motion on key moments
- Violet (#6D00FF) accent lighting in environments
- Photorealistic, no CGI/cartoon effects

**Components**: shadcn/ui in `src/components/ui/` and `src/components/shadcn/ui/`

## File Conventions

- Components: `PascalCase.tsx` in `src/components/`
- Lib/utils: `camelCase.ts` in `src/lib/`
- API routes: `route.ts` following Next.js App Router patterns
- Path alias: `@/*` maps to `./src/*`

## Cost Considerations

| Item | Cost | Notes |
|------|------|-------|
| VEO 3.1 (8s) | ~$3-4 | Per video generation |
| Gemini Analysis | ~$0.02 | Very cheap |
| Firebase Storage | ~$0.01 | Per video stored |
| **Total per lead** | **~$3-5** | Higher than Transform but 10x emotional impact |

## Key Differences from NGX Transform

| Aspect | Transform | Vision |
|--------|-----------|--------|
| Output | 4 images | 1 video (8s) |
| AI | Gemini Image | VEO 3.1 |
| Duration | Instant display | 8 seconds video |
| Cost | ~$0.50-1 | ~$3-5 |
| Generation time | 30-60s | 60-180s |
| Shareability | Images | Video (Stories ready) |
| Emotional impact | Visual | Deep emotional |
