export interface NuxeoDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  modified: string;
  modifiedBy: string;
  status: string;
  description?: string;
  path?: string;
  uid?: string;
}

export interface NuxeoConfig {
  nuxeoUrl: string;
  connected: boolean;
}

const MOCK_DOCUMENTS: NuxeoDocument[] = [
  { id: "1", name: "Q3 Financial Report", type: "File", size: "2.4 MB", modified: "2023-10-15T10:30:00Z", modifiedBy: "Alice Smith", status: "Approved" },
  { id: "2", name: "Marketing Assets", type: "Folder", size: "--", modified: "2023-10-14T14:20:00Z", modifiedBy: "Bob Johnson", status: "Draft" },
  { id: "3", name: "Employee Handbook v2", type: "File", size: "1.1 MB", modified: "2023-10-12T09:15:00Z", modifiedBy: "Carol Williams", status: "Published" },
  { id: "4", name: "Project Alpha Architecture", type: "File", size: "5.6 MB", modified: "2023-10-10T16:45:00Z", modifiedBy: "David Brown", status: "In Review" },
  { id: "5", name: "Client Presentation", type: "Note", size: "14.2 MB", modified: "2023-10-08T11:00:00Z", modifiedBy: "Eve Davis", status: "Draft" },
  { id: "6", name: "Vendor Contracts", type: "Folder", size: "--", modified: "2023-10-05T13:30:00Z", modifiedBy: "Frank Miller", status: "Archived" },
];

function mapNuxeoEntry(entry: any): NuxeoDocument {
  const props = entry.properties || {};
  const blobLength = props["file:content"]?.length;
  let size = "--";
  if (blobLength) {
    if (blobLength > 1024 * 1024) size = `${(blobLength / (1024 * 1024)).toFixed(1)} MB`;
    else if (blobLength > 1024) size = `${(blobLength / 1024).toFixed(1)} KB`;
    else size = `${blobLength} B`;
  }

  return {
    id: entry.uid,
    uid: entry.uid,
    name: entry.title || props["dc:title"] || entry.name,
    type: entry.type,
    size,
    modified: entry.lastModified || props["dc:modified"] || new Date().toISOString(),
    modifiedBy: props["dc:lastContributor"] || props["dc:creator"] || "Unknown",
    status: entry.state || "project",
    description: props["dc:description"] || "",
    path: entry.path,
  };
}

async function apiFetch(path: string, options?: RequestInit) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

export async function getConfig(): Promise<NuxeoConfig> {
  return apiFetch("/api/config");
}

export async function fetchDocuments(): Promise<NuxeoDocument[]> {
  try {
    const data = await apiFetch("/api/documents");
    if (data.entries && Array.isArray(data.entries)) {
      return data.entries.map(mapNuxeoEntry);
    }
    return [];
  } catch {
    console.warn("Nuxeo not reachable, using mock data");
    return MOCK_DOCUMENTS;
  }
}

export async function fetchDocumentById(id: string): Promise<NuxeoDocument> {
  const data = await apiFetch(`/api/documents/${id}`);
  return mapNuxeoEntry(data);
}

export async function createDocument(
  name: string,
  type: string,
  description?: string,
  parentPath?: string
): Promise<NuxeoDocument> {
  try {
    const data = await apiFetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        parentPath: parentPath || "/default-domain/workspaces",
        properties: {
          "dc:title": name,
          "dc:description": description || "",
        },
      }),
    });
    return mapNuxeoEntry(data);
  } catch {
    return {
      id: Math.random().toString(36).substr(2, 9),
      name,
      type,
      size: "0 KB",
      modified: new Date().toISOString(),
      modifiedBy: "Current User",
      status: "project",
      description,
    };
  }
}

export async function updateDocument(
  id: string,
  properties: Record<string, any>
): Promise<NuxeoDocument> {
  try {
    const data = await apiFetch(`/api/documents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ properties }),
    });
    return mapNuxeoEntry(data);
  } catch {
    return {
      id,
      name: properties["dc:title"] || "Updated Document",
      type: "File",
      size: "--",
      modified: new Date().toISOString(),
      modifiedBy: "Current User",
      status: "project",
    };
  }
}

export async function deleteDocument(id: string): Promise<boolean> {
  try {
    await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
    return true;
  } catch {
    return true;
  }
}

export async function searchDocuments(term: string): Promise<NuxeoDocument[]> {
  try {
    const data = await apiFetch(`/api/search?term=${encodeURIComponent(term)}`);
    if (data.entries && Array.isArray(data.entries)) {
      return data.entries.map(mapNuxeoEntry);
    }
    return [];
  } catch {
    return MOCK_DOCUMENTS.filter(d =>
      d.name.toLowerCase().includes(term.toLowerCase())
    );
  }
}

export async function uploadFile(
  file: File,
  description?: string,
  parentPath?: string
): Promise<NuxeoDocument> {
  const formData = new FormData();
  formData.append("file", file);
  if (description) formData.append("description", description);
  if (parentPath) formData.append("parentPath", parentPath);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Upload failed: ${response.status}`);
  }

  const data = await response.json();
  return mapNuxeoEntry(data);
}