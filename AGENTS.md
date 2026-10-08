<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GISJATENG - Project Rules

## Project Overview

GISJATENG is an internal WebGIS dashboard for managing and visualizing
regional data in Central Java.

The system is NOT a public-facing application.

Main regional hierarchy:

Jawa Tengah
→ Kabupaten/Kota
→ Kecamatan
→ Desa/Kelurahan


## Technology Stack

### Frontend
- Next.js
- TypeScript
- React
- React Leaflet
- Leaflet
- OpenStreetMap
- Tailwind CSS / existing project styling

### Backend
- FastAPI
- Python

### Database
- PostgreSQL
- PostGIS

### GIS Data
- GeoJSON
- PostGIS spatial data
- QGIS-generated regional boundaries


## Frontend Architecture

The frontend is responsible for:

- Dashboard UI
- Map visualization
- User interaction
- Search
- Filtering
- Statistics visualization
- Tables
- Authentication UI
- Calling FastAPI endpoints

Static GeoJSON files are stored under:

`public/geojson/`

Example:

`public/geojson/kota.geojson`

Do not move or duplicate GeoJSON files unless explicitly requested.


## Backend Architecture

Backend uses FastAPI.

Keep the existing separation between:

- routers
- services
- schemas
- models
- core

Do not introduce a completely different architecture unless explicitly requested.

Prefer:

Router
→ Service
→ Database / Model

Business logic should not be unnecessarily placed inside routers.


## Database Rules

Database:

PostgreSQL + PostGIS.

Do not modify:

- tables
- columns
- relationships
- constraints
- indexes

unless explicitly requested.

Before creating a new table or column, inspect the existing models/schema first.

Do not create duplicate data structures when an existing structure can be reused.


## GIS Rules

The application focuses on Jawa Tengah.

Do not display unrelated provinces unless explicitly requested.

Regional hierarchy:

- Provinsi
- Kabupaten/Kota
- Kecamatan
- Desa/Kelurahan

Use existing GeoJSON boundaries where available.

Do not replace GeoJSON with mock geometry.

For spatial calculations or large datasets, prefer PostGIS/backend processing instead of performing heavy spatial operations in the browser.


## Map Rules

Map library:

React Leaflet + Leaflet.

Important behavior:

- Province-level view focuses on Jawa Tengah.
- Kabupaten/Kota boundaries should be visually distinguishable.
- Hover should provide basic regional information.
- Click should provide detailed regional information.
- Selected regions should have a clear visual state.
- Map colors should represent data meaningfully.

Do not introduce another map library unless explicitly requested.


## Data Visualization

When displaying regional statistics, prefer choropleth visualization.

Use sequential color scales for values such as:

- total anggota
- total suara
- total penduduk
- number of pengurus

Use diverging color scales only when the data has a meaningful positive/negative midpoint.

Do not assign random colors to regions when color represents quantitative data.


## Roles and Permissions

The system has two main roles:

### Super Admin

Can:

- access all regions
- manage all data
- manage all dapil

### Admin

Can:

- access assigned dapil
- manage data within assigned dapil

Do not bypass authorization rules on the frontend or backend.

Backend authorization is authoritative.


## API Rules

Frontend communicates with FastAPI through API endpoints.

Before creating a new endpoint:

1. Inspect existing routers.
2. Inspect existing schemas.
3. Inspect existing services.
4. Reuse an existing endpoint if possible.

Do not create duplicate endpoints for the same functionality.


## Coding Rules

Use TypeScript for frontend code.

Avoid:

- unnecessary `any`
- duplicated components
- duplicated API calls
- unnecessary dependencies
- large monolithic components
- hardcoded production data

Prefer:

- reusable components
- clear naming
- typed API responses
- small focused functions
- existing project utilities
- existing components before creating new ones


## Existing Code First

Before implementing a feature:

1. Inspect the existing project structure.
2. Search for related components/functions.
3. Inspect existing API endpoints.
4. Inspect existing database models.
5. Reuse existing functionality where possible.

Do not rewrite working code unnecessarily.


## AI Agent Rules

Before making significant changes:

- Explain what files need to change.
- Understand the existing implementation first.
- Make the smallest reasonable change.
- Do not refactor unrelated code.

Never assume that a missing feature means the entire module needs to be rewritten.

When encountering an error:

1. Identify the root cause.
2. Fix the root cause.
3. Avoid unrelated changes.
4. Verify the result.


## Testing

After implementing a feature:

- Check TypeScript errors.
- Check lint errors when available.
- Check API errors.
- Check browser console errors.
- Verify map interactions.
- Verify loading and error states.

Do not claim a feature is complete without verification.


## Important Constraints

Do NOT:

- replace the existing stack
- migrate Next.js versions
- replace React Leaflet
- replace FastAPI
- replace PostgreSQL/PostGIS
- introduce microservices
- remove existing functionality
- create mock production data
- modify database schema without instruction

unless explicitly requested.


## Development Philosophy

The developer understands the architecture and requirements of this project.

AI agents are used to accelerate implementation, debugging, and repetitive work.

Do not make architectural decisions silently.

When a task requires an architectural decision, explain the options and recommend the least disruptive approach.