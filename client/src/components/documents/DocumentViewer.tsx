import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { FileText, Image, Film, Music, FileSpreadsheet, ChevronLeft, ChevronRight, Loader2, AlertCircle, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBlobUrl, getRenditionUrl, type NuxeoDocument } from "@/lib/nuxeo";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  document: NuxeoDocument;
}

type ContentCategory = "image" | "pdf" | "video" | "audio" | "text" | "office" | "none";

function getContentCategory(doc: NuxeoDocument): ContentCategory {
  if (!doc.hasBlob || !doc.mimeType) return "none";
  const mime = doc.mimeType.toLowerCase();

  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("text/")) return "text";

  const officeMimes = [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.presentation",
  ];
  if (officeMimes.includes(mime)) return "office";

  return "none";
}

function getCategoryIcon(category: ContentCategory) {
  switch (category) {
    case "image": return Image;
    case "video": return Film;
    case "audio": return Music;
    case "office": return FileSpreadsheet;
    default: return FileText;
  }
}

function ImageViewer({ document: doc }: DocumentViewerProps) {
  const [error, setError] = useState(false);

  if (error) return <ViewerError message="Failed to load image" />;

  return (
    <div className="flex items-center justify-center p-2" data-testid="viewer-image">
      <img
        src={getBlobUrl(doc.id)}
        alt={doc.name}
        className="max-w-full max-h-64 object-contain rounded-lg shadow-sm"
        onError={() => setError(true)}
      />
    </div>
  );
}

function PdfViewer({ document: doc, url }: DocumentViewerProps & { url?: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fileUrl = url || getBlobUrl(doc.id);

  if (error) return <ViewerError message="Failed to load PDF" />;

  return (
    <div className={cn("flex flex-col items-center", expanded ? "fixed inset-0 z-50 bg-background p-4" : "")} data-testid="viewer-pdf">
      {expanded && (
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-sm font-medium truncate">{doc.name}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(false)}>
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className={cn(
        "border rounded-lg overflow-hidden bg-muted/20 relative",
        expanded ? "flex-1 w-full overflow-auto" : "max-h-64 overflow-auto"
      )}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: n }) => { setNumPages(n); setLoading(false); }}
          onLoadError={() => { setError(true); setLoading(false); }}
          loading=""
        >
          <Page
            pageNumber={pageNumber}
            width={expanded ? undefined : 340}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {numPages > 0 && (
        <div className="flex items-center gap-2 mt-2">
          {!expanded && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(true)} data-testid="button-expand-pdf">
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber(p => p - 1)}
            data-testid="button-pdf-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground" data-testid="text-pdf-page">
            {pageNumber} / {numPages}
          </span>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber(p => p + 1)}
            data-testid="button-pdf-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function VideoViewer({ document: doc }: DocumentViewerProps) {
  return (
    <div className="p-2" data-testid="viewer-video">
      <video
        src={getBlobUrl(doc.id)}
        controls
        className="max-w-full max-h-64 rounded-lg shadow-sm mx-auto"
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

function AudioViewer({ document: doc }: DocumentViewerProps) {
  return (
    <div className="p-4 flex flex-col items-center gap-3" data-testid="viewer-audio">
      <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
        <Music className="h-8 w-8" />
      </div>
      <audio src={getBlobUrl(doc.id)} controls className="w-full" preload="metadata">
        Your browser does not support the audio tag.
      </audio>
    </div>
  );
}

function TextViewer({ document: doc }: DocumentViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(getBlobUrl(doc.id))
      .then(res => {
        if (!res.ok) throw new Error("Failed");
        return res.text();
      })
      .then(text => { setContent(text); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [doc.id]);

  if (loading) return <ViewerLoading />;
  if (error || content === null) return <ViewerError message="Failed to load text content" />;

  return (
    <div className="p-2" data-testid="viewer-text">
      <pre className="text-xs bg-muted/30 rounded-lg p-3 border max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono">
        {content.slice(0, 10000)}
        {content.length > 10000 && "\n\n... (truncated)"}
      </pre>
    </div>
  );
}

function OfficeViewer({ document: doc }: DocumentViewerProps) {
  const [hasPdfRendition, setHasPdfRendition] = useState<boolean | null>(null);
  const renditionUrl = getRenditionUrl(doc.id, "pdf");

  useEffect(() => {
    fetch(renditionUrl, { method: "HEAD" })
      .then(res => setHasPdfRendition(res.ok))
      .catch(() => setHasPdfRendition(false));
  }, [doc.id, renditionUrl]);

  if (hasPdfRendition === null) return <ViewerLoading />;
  if (hasPdfRendition) return <PdfViewer document={doc} url={renditionUrl} />;

  const Icon = getCategoryIcon("office");
  return (
    <div className="flex flex-col items-center text-center p-4 gap-3" data-testid="viewer-office-fallback">
      <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
        <Icon className="h-8 w-8" />
      </div>
      <p className="text-sm text-muted-foreground">
        Office document preview not available.
      </p>
      <Button variant="outline" size="sm" asChild>
        <a href={getBlobUrl(doc.id)} download={doc.name} data-testid="button-download-office">
          Download to view
        </a>
      </Button>
    </div>
  );
}

function NoPreview({ document: doc }: DocumentViewerProps) {
  const Icon = getCategoryIcon("none");
  return (
    <div className="flex flex-col items-center text-center p-6" data-testid="viewer-none">
      <div className="h-20 w-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 text-primary shadow-sm border border-primary/20">
        <Icon className="h-10 w-10" />
      </div>
    </div>
  );
}

function ViewerLoading() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function ViewerError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center text-center p-4 gap-2" data-testid="viewer-error">
      <AlertCircle className="h-8 w-8 text-destructive/60" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function DocumentViewer({ document: doc }: DocumentViewerProps) {
  const category = getContentCategory(doc);

  switch (category) {
    case "image": return <ImageViewer document={doc} />;
    case "pdf": return <PdfViewer document={doc} />;
    case "video": return <VideoViewer document={doc} />;
    case "audio": return <AudioViewer document={doc} />;
    case "text": return <TextViewer document={doc} />;
    case "office": return <OfficeViewer document={doc} />;
    default: return <NoPreview document={doc} />;
  }
}