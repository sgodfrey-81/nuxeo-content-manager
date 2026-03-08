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
- Upload files with drag-and-drop or file picker (uses Nuxeo batch upload API)
- Edit document metadata (name, type, description)
- Delete documents
- Search/filter documents
- Responsive side panel for document details

## Document Viewer

The details panel includes a content viewer that automatically detects content type and renders:
- **Images** (image/*): Native `<img>` tag via blob proxy
- **PDFs** (application/pdf): `react-pdf` with page navigation and expand-to-fullscreen
- **Video** (video/*): HTML5 `<video>` with controls
- **Audio** (audio/*): HTML5 `<audio>` with controls
- **Text** (text/*): Fetched and displayed in a `<pre>` block
- **Office docs**: Attempts Nuxeo's PDF rendition, falls back to download prompt
- **Other/no blob**: Shows file type icon

Key files: `client/src/components/documents/DocumentViewer.tsx`, blob proxy routes in `server/routes.ts`

## Upload Flow

File upload uses Nuxeo's batch upload API via `POST /api/upload`:
1. Express receives the file via multer (max 100 MB)
2. Creates a batch upload on Nuxeo (`POST /api/v1/upload/`)
3. Uploads the file blob to the batch (`POST /api/v1/upload/{batchId}/0`)
4. Creates a File document with the blob attached via `file:content`

The frontend upload dialog supports multiple file selection, drag-and-drop, and optional descriptions.