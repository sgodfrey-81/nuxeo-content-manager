import type { Express } from "express";
import { createServer, type Server } from "http";
import { log } from "./index";
import multer from "multer";

const NUXEO_URL = process.env.NUXEO_URL || "http://localhost:8080/nuxeo";
const NUXEO_AUTH = process.env.NUXEO_AUTH || "Basic " + Buffer.from("Administrator:Administrator").toString("base64");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

async function nuxeoFetch(path: string, options: RequestInit = {}) {
  const url = `${NUXEO_URL}/api/v1${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": NUXEO_AUTH,
      "X-NXproperties": "*",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Nuxeo API error ${response.status}: ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/config", (_req, res) => {
    res.json({
      nuxeoUrl: NUXEO_URL,
      connected: !!NUXEO_URL,
    });
  });

  app.get("/api/documents", async (req, res) => {
    try {
      const query = (req.query.query as string) ||
        "SELECT * FROM Document WHERE ecm:isTrashed = 0 AND ecm:mixinType != 'HiddenInNavigation' AND ecm:isVersion = 0 ORDER BY dc:modified DESC";
      const pageSize = req.query.pageSize || "20";
      const currentPageIndex = req.query.currentPageIndex || "0";

      const data = await nuxeoFetch(
        `/search/lang/NXQL/execute?query=${encodeURIComponent(query)}&pageSize=${pageSize}&currentPageIndex=${currentPageIndex}`
      );
      res.json(data);
    } catch (error: any) {
      log(`Error fetching documents: ${error.message}`, "nuxeo");
      res.status(502).json({ error: "Failed to fetch documents from Nuxeo", details: error.message });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const data = await nuxeoFetch(`/id/${req.params.id}`);
      res.json(data);
    } catch (error: any) {
      log(`Error fetching document ${req.params.id}: ${error.message}`, "nuxeo");
      res.status(502).json({ error: "Failed to fetch document", details: error.message });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const { parentPath, type, name, properties } = req.body;
      const data = await nuxeoFetch(`/path${parentPath || "/default-domain/workspaces"}`, {
        method: "POST",
        body: JSON.stringify({
          "entity-type": "document",
          name,
          type,
          properties: {
            "dc:title": name,
            ...properties,
          },
        }),
      });
      res.json(data);
    } catch (error: any) {
      log(`Error creating document: ${error.message}`, "nuxeo");
      res.status(502).json({ error: "Failed to create document", details: error.message });
    }
  });

  app.put("/api/documents/:id", async (req, res) => {
    try {
      const { properties } = req.body;
      const data = await nuxeoFetch(`/id/${req.params.id}`, {
        method: "PUT",
        body: JSON.stringify({
          "entity-type": "document",
          properties,
        }),
      });
      res.json(data);
    } catch (error: any) {
      log(`Error updating document ${req.params.id}: ${error.message}`, "nuxeo");
      res.status(502).json({ error: "Failed to update document", details: error.message });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      await nuxeoFetch(`/id/${req.params.id}`, { method: "DELETE" });
      res.json({ success: true });
    } catch (error: any) {
      log(`Error deleting document ${req.params.id}: ${error.message}`, "nuxeo");
      res.status(502).json({ error: "Failed to delete document", details: error.message });
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const term = req.query.term as string || "";
      const query = `SELECT * FROM Document WHERE ecm:fulltext = '${term.replace(/'/g, "''")}' AND ecm:isTrashed = 0 AND ecm:mixinType != 'HiddenInNavigation' AND ecm:isVersion = 0 ORDER BY dc:modified DESC`;
      const data = await nuxeoFetch(
        `/search/lang/NXQL/execute?query=${encodeURIComponent(query)}&pageSize=20`
      );
      res.json(data);
    } catch (error: any) {
      log(`Error searching documents: ${error.message}`, "nuxeo");
      res.status(502).json({ error: "Failed to search documents", details: error.message });
    }
  });

  app.post("/api/upload", (req, res, next) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "File too large. Maximum size is 100 MB." });
        }
        return res.status(400).json({ error: "File upload error", details: err.message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const parentPath = (req.body.parentPath as string) || "/default-domain/workspaces";
      const description = (req.body.description as string) || "";
      const fileName = req.file.originalname;
      const mimeType = req.file.mimetype;
      const fileBuffer = req.file.buffer;

      log(`Uploading file: ${fileName} (${mimeType}, ${fileBuffer.length} bytes)`, "nuxeo");

      // Step 1: Create a batch upload
      const batchUrl = `${NUXEO_URL}/api/v1/upload/`;
      const batchResponse = await fetch(batchUrl, {
        method: "POST",
        headers: {
          "Authorization": NUXEO_AUTH,
        },
      });

      if (!batchResponse.ok) {
        const text = await batchResponse.text();
        throw new Error(`Failed to create batch: ${batchResponse.status} ${text}`);
      }

      const batch = await batchResponse.json();
      const batchId = batch.batchId;
      log(`Batch created: ${batchId}`, "nuxeo");

      // Step 2: Upload the file blob to the batch
      const uploadUrl = `${NUXEO_URL}/api/v1/upload/${batchId}/0`;
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Authorization": NUXEO_AUTH,
          "Content-Type": "application/octet-stream",
          "X-File-Name": fileName,
          "X-File-Size": String(fileBuffer.length),
          "X-File-Type": mimeType,
        },
        body: fileBuffer,
      });

      if (!uploadResponse.ok) {
        const text = await uploadResponse.text();
        throw new Error(`Failed to upload blob: ${uploadResponse.status} ${text}`);
      }

      log(`Blob uploaded to batch ${batchId}`, "nuxeo");

      // Step 3: Create the document with the attached blob
      const docName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const docData = await nuxeoFetch(`/path${parentPath}`, {
        method: "POST",
        body: JSON.stringify({
          "entity-type": "document",
          name: docName,
          type: "File",
          properties: {
            "dc:title": fileName.replace(/\.[^/.]+$/, ""),
            "dc:description": description,
            "file:content": {
              "upload-batch": batchId,
              "upload-fileId": "0",
            },
          },
        }),
      });

      log(`Document created: ${docData.uid} - ${docData.title}`, "nuxeo");
      res.json(docData);
    } catch (error: any) {
      log(`Error uploading file: ${error.message}`, "nuxeo");
      res.status(502).json({ error: "Failed to upload file to Nuxeo", details: error.message });
    }
  });

  app.get("/api/documents/:id/blob", async (req, res) => {
    try {
      const url = `${NUXEO_URL}/api/v1/id/${req.params.id}/@blob/file:content`;
      const headers: Record<string, string> = {
        "Authorization": NUXEO_AUTH,
      };
      if (req.headers.range) {
        headers["Range"] = req.headers.range;
      }

      const response = await fetch(url, { headers });

      if (!response.ok && response.status !== 206) {
        const text = await response.text();
        throw new Error(`Nuxeo blob error ${response.status}: ${text}`);
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const contentDisposition = response.headers.get("content-disposition");
      const contentLength = response.headers.get("content-length");
      const contentRange = response.headers.get("content-range");
      const acceptRanges = response.headers.get("accept-ranges");

      res.status(response.status === 206 ? 206 : 200);
      res.setHeader("Content-Type", contentType);
      if (contentDisposition) res.setHeader("Content-Disposition", contentDisposition);
      if (contentLength) res.setHeader("Content-Length", contentLength);
      if (contentRange) res.setHeader("Content-Range", contentRange);
      if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
      else res.setHeader("Accept-Ranges", "bytes");

      if (response.body) {
        const reader = (response.body as any).getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { res.end(); break; }
            if (!res.write(value)) {
              await new Promise(resolve => res.once('drain', resolve));
            }
          }
        };
        pump().catch(() => res.end());
      } else {
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      }
    } catch (error: any) {
      log(`Error fetching blob for ${req.params.id}: ${error.message}`, "nuxeo");
      if (!res.headersSent) {
        res.status(502).json({ error: "Failed to fetch blob", details: error.message });
      }
    }
  });

  app.get("/api/documents/:id/rendition/:name", async (req, res) => {
    try {
      const url = `${NUXEO_URL}/api/v1/id/${req.params.id}/@rendition/${req.params.name}`;
      const response = await fetch(url, {
        headers: {
          "Authorization": NUXEO_AUTH,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Nuxeo rendition error ${response.status}: ${text}`);
      }

      const contentType = response.headers.get("content-type") || "application/pdf";
      res.setHeader("Content-Type", contentType);

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      log(`Error fetching rendition for ${req.params.id}: ${error.message}`, "nuxeo");
      res.status(502).json({ error: "Failed to fetch rendition", details: error.message });
    }
  });

  return httpServer;
}