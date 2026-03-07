import type { Express } from "express";
import { createServer, type Server } from "http";
import { log } from "./index";

const NUXEO_URL = process.env.NUXEO_URL || "http://localhost:8080/nuxeo";
const NUXEO_AUTH = process.env.NUXEO_AUTH || "Basic " + Buffer.from("Administrator:Administrator").toString("base64");

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

  return httpServer;
}