# Nuxeo Content Manager

A modern React frontend for managing content in a Nuxeo repository. Built with React, TanStack Query, and shadcn/ui components, backed by an Express proxy server.

## Architecture

- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui
- **Backend**: Express server acting as a proxy to Nuxeo REST API
- **No local database**: All data lives in the connected Nuxeo instance
- **Fallback**: When Nuxeo is unreachable, the UI gracefully falls back to mock data

## Key Files

- `server/routes.ts` - Express API routes that proxy requests to Nuxeo REST API
- `client/src/lib/nuxeo.ts` - Frontend API service with Nuxeo document mapping and mock fallback
- `client/src/pages/Dashboard.tsx` - Main dashboard page with CRUD operations
- `client/src/components/documents/DocumentTable.tsx` - Document list table
- `client/src/components/documents/DocumentDetails.tsx` - Side panel for viewing/editing document metadata
- `client/src/components/layout/Sidebar.tsx` - Navigation sidebar
- `client/src/components/layout/Header.tsx` - Top header with search

## Environment Variables

- `NUXEO_URL` - Base URL of the Nuxeo server (default: `http://localhost:8080/nuxeo`)
- `NUXEO_AUTH` - Authorization header value (default: Basic auth for `Administrator:Administrator`)

## Local Deployment (Docker)

```bash
docker build -t nuxeo-frontend .
docker run -p 3000:3000 \
  -e NUXEO_URL=http://host.docker.internal:8080/nuxeo \
  -e NUXEO_AUTH="Basic QWRtaW5pc3RyYXRvcjpBZG1pbmlzdHJhdG9y" \
  nuxeo-frontend
```

Use `host.docker.internal` to reach a Nuxeo instance running on the Docker host machine.

## Features

- Browse documents from a Nuxeo repository
- Create new documents (File, Note, Folder, Workspace)
- Edit document metadata (name, type, description)
- Delete documents
- Search/filter documents
- Responsive side panel for document details