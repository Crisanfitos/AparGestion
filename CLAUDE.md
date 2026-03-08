# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AparGestion is a React Native mobile app for elderly property owners managing tourist/long-term rentals. Built with **Expo SDK 54** (New Architecture), **Expo Router 6**, **Zustand** for state, and **Supabase** as backend. The app is fully in Spanish and follows strict accessibility standards (WCAG 2.1 AAA: 18sp min fonts, 60x60dp touch targets, 7:1 contrast).

## Commands

```bash
npm install          # Install dependencies
npm run start        # Start Expo dev server
npm run android      # Run on Android
npm run ios          # Run on iOS
npm run web          # Run on web (Metro bundler)
```

No test runner or linter is currently configured.

## Architecture

### Routing (Expo Router - file-based)

- `app/_layout.tsx` — Root layout with auth guard (redirects unauthenticated users)
- `app/(auth)/` — Public auth screens (login)
- `app/(tabs)/` — Main tab navigation: Home, Calendar, Documents, Profile
- `app/checkin/[id].tsx` — Public guest check-in flow (no auth required)
- `app/reservation/[id].tsx` — Reservation details
- `app/template-editor.tsx`, `template-fill.tsx`, `template-variables.tsx`, `template-drafts.tsx` — Document template screens
- `app/property-form.tsx` — Create/edit property

### Source Structure (`src/`)

**`src/core/`** — Foundational infrastructure:
- `api/supabase.ts` — Supabase client (uses AsyncStorage for session persistence). Env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `stores/authStore.ts` — Auth state (Zustand): user, session, login/register/logout actions. Listens to Supabase auth state changes.
- `stores/calendarStore.ts` — In-memory booking state (Zustand): bookings array, sync status
- `services/authService.ts` — Wraps Supabase auth calls, translates errors to Spanish
- `theme/index.ts` — Design tokens (colors, spacing, typography)

**`src/features/`** — Domain modules, each with services/hooks/components:

- **`calendar/`** — iCal sync and reservations
  - `services/iCalParser.ts` — Parses ICS/iCal feeds (VEVENT extraction)
  - `services/icalService.ts` — Orchestrates sync from Booking.com, Airbnb, Google Calendar, VRBO
  - `services/reservationService.ts` — Reservation CRUD, upsert by external_id for sync, date range queries
  - `hooks/useReservations.ts` — React hook for reservation data

- **`documents/`** — Template-based document generation
  - `services/templateService.ts` — Core pipeline: upload .docx → PizZip/XML parse → HTML conversion → variable extraction → PDF generation via expo-print
  - `services/templateVariableService.ts` — Variable CRUD with typed validation (DNI/NIE check digits, email, phone, currency). Supports transforms (uppercase/lowercase/capitalize)
  - `services/templateDbService.ts` — Supabase CRUD for templates with version history
  - `services/templateDraftService.ts` — Draft management
  - `generators/pdfGenerator.ts`, `contractBuilder.ts` — PDF output utilities

- **`properties/`** — Property CRUD (`propertyService.ts`), photo management, OTA scraping
- **`checkin/`** — Guest verification service

**`src/components/accessible/`** — Reusable accessible UI components (HighContrastCard, LargeTextButton, PasswordInput)

### Key Patterns

- **Service layer returns** `{ success, data, error }` result objects consistently
- **Zustand stores** are minimal (one per domain). Auth persists via Supabase session in AsyncStorage; calendar store is in-memory
- **Template variable syntax**: `{variable_name}` for simple variables, `{{#Group Name}}...{{/Group Name}}` for repeatable sections
- **iCal sync flow**: fetch ICS URL → parse VEVENTs → upsert reservations by external_id → update sync status
- **Path alias**: `@/*` maps to project root (tsconfig paths)

### Database (Supabase)

SQL migrations in `supabase/` (01-11), applied manually. All tables use RLS scoped to the authenticated user. Key tables:

| Table | Purpose |
|-------|---------|
| `profiles` | Extends auth.users (auto-created via trigger) |
| `properties` | Rental properties with amenities, photos, pricing |
| `reservations` | Bookings with check_in/check_out dates, source tracking |
| `ical_syncs` | Per-property iCal feed URLs and sync status |
| `guests` | Guest identity docs (DNI/NIE/passport) and check-in data |
| `document_templates` | HTML templates with embedded variables |
| `template_variables` | Typed variable definitions per template |
| `template_variable_groups` | Repeatable section definitions |
| `template_versions` | Template version history |

Database types are defined inline in `src/core/api/supabase.ts` (Database interface).

### Build & Deploy

EAS Build is configured (`eas.json`) with development, preview (APK), and production profiles. EAS Project ID: `ea540075-80db-47f6-b216-2e22fde08510`.
