# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A desktop GST invoice management app for Indian businesses, built with Electron + React + SQLite. The app targets offline/standalone usage — no server required.

## Dev Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev mode (Electron + Vite HMR)
npm run build        # Compile TypeScript/React
npm run dist         # Build distributable installer (build + electron-builder)
```

No test suite configured.

## Architecture

```
Renderer (React/Vite) ←──IPC──→ Main Process (Node.js) ←──→ SQLite (better-sqlite3)
                                        ↑
                               Preload context bridge
```

**Three Electron contexts:**
- `src/main/` — Main process: database, services, IPC handlers, PDF generation, menu
- `src/preload/index.ts` — Context bridge: exposes a safe `window.api` object to the renderer
- `src/renderer/` — React SPA: UI, routing, state, tax calculations

The renderer has no direct Node.js access. All data operations go through `window.api` (IPC).

## IPC Pattern

Every renderer-to-main call goes through:
1. `src/preload/index.ts` — declares the method via `contextBridge.exposeInMainWorld('api', {...})`
2. `src/main/ipc/*.ts` — registers the handler with `ipcMain.handle(channel, handler)`
3. `src/main/services/*.ts` — business logic called from the handler

IPC handlers return `{ data, error }` (`IpcResult<T>`). The renderer checks `.error` before using `.data`.

## Database

**better-sqlite3** with WAL mode and foreign keys enabled. Schema defined in `src/main/db/schema.ts`.

| Table | Purpose |
|-------|---------|
| `business_profile` | Single-row company config (GSTIN, bank info, invoice prefix) |
| `customers` | Customer master (name, address, GSTIN, PAN, state code) |
| `invoices` | Invoice headers (buyer details, totals, status: DRAFT/FINAL/CANCELLED) |
| `invoice_items` | Line items (HSN/SAC, qty, rate, CGST/SGST amounts) |
| `payments` | Customer payment records |

Invoices are never hard-deleted — status is set to CANCELLED.

## PDF Generation

Handled in `src/main/ipc/pdf.ts` via a **hidden Electron window**:
1. Main creates a hidden 794×6000px window and loads the `PrintPage` route
2. `PrintPage` renders the invoice template, measures its height, and sends it back via IPC
3. Main injects a `@page` CSS rule with the exact height, then calls `webContents.printToPDF()`
4. PDF saved to user-selected path

This produces single-page PDFs regardless of item count.

## Tax Calculation

`src/renderer/src/utils/taxCalculator.ts` handles all GST math:
- Per-item: `amount = qty × rate`, then CGST/SGST applied as percentages
- Invoice totals: sums of taxable value, CGST, SGST, grand total
- HSN summary: groups items by HSN/SAC code (required for GST compliance)

Default rates: 9% CGST + 9% SGST (intra-state). Rates are editable per line item.

## State Management

Zustand store (`src/renderer/src/store/`) holds only:
- `business: BusinessProfile | null` — loaded from DB on app start
- `toast` — transient notification state

All other data is fetched on-demand via `window.api` calls.

## Key Files

| File | Role |
|------|------|
| `src/main/index.ts` | App bootstrap, BrowserWindow, menu, IPC registration |
| `src/main/db/schema.ts` | SQLite schema (all 5 tables) |
| `src/preload/index.ts` | Full IPC API surface exposed to renderer |
| `src/renderer/src/App.tsx` | React Router setup and business-profile guard |
| `src/renderer/src/pages/CreateInvoicePage.tsx` | Main invoice form (largest file) |
| `src/renderer/src/components/invoice/InvoiceTemplate.tsx` | A4 print layout |
| `src/renderer/src/utils/taxCalculator.ts` | CGST/SGST calculation and HSN grouping |

## Build & Distribution

`electron-builder.yml` targets:
- Windows: NSIS installer (x64)
- macOS: DMG (x64 + arm64)
- Linux: AppImage (x64)

App ID: `com.siddhnath.invoice`
