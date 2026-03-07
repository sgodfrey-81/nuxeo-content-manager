import React, { useState, useRef, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import DocumentTable from "@/components/documents/DocumentTable";
import DocumentDetails from "@/components/documents/DocumentDetails";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Loader2, FileUp, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDocuments, createDocument, updateDocument, deleteDocument, uploadFile, type NuxeoDocument } from "@/lib/nuxeo";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState("File");
  const [newDocDesc, setNewDocDesc] = useState("");

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadDesc, setUploadDesc] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: fetchDocuments,
  });

  const createMutation = useMutation({
    mutationFn: () => createDocument(newDocName, newDocType, newDocDesc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsCreateOpen(false);
      setNewDocName("");
      setNewDocType("File");
      setNewDocDesc("");
      toast({ title: "Document created", description: `"${newDocName}" has been created.` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const file of uploadFiles) {
        const result = await uploadFile(file, uploadDesc);
        results.push(result);
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsUploadOpen(false);
      setUploadFiles([]);
      setUploadDesc("");
      const count = results.length;
      toast({
        title: `${count} file${count > 1 ? "s" : ""} uploaded`,
        description: results.map(r => r.name).join(", "),
      });
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, properties }: { id: string; properties: Record<string, any> }) =>
      updateDocument(id, properties),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredDocs = documents.filter((doc: NuxeoDocument) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedDoc = documents.find((d: NuxeoDocument) => d.id === selectedDocId);

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
    if (selectedDocId === id) setSelectedDocId(null);
  };

  const handleUpdate = (updatedDoc: NuxeoDocument) => {
    updateMutation.mutate({
      id: updatedDoc.id,
      properties: {
        "dc:title": updatedDoc.name,
        "dc:description": updatedDoc.description || "",
      },
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) {
      setUploadFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <main className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto px-6 py-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-page-title">All Documents</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage and organize your enterprise content.</p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-upload" onClick={() => setIsUploadOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2 shadow-sm" data-testid="button-new-document">
                      <Plus className="h-4 w-4" />
                      New Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New Document</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Document Name</Label>
                        <Input
                          id="name"
                          data-testid="input-doc-name"
                          value={newDocName}
                          onChange={(e) => setNewDocName(e.target.value)}
                          placeholder="e.g. Q4 Strategy Plan"
                          autoFocus
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="type">Document Type</Label>
                        <Select value={newDocType} onValueChange={setNewDocType}>
                          <SelectTrigger id="type" data-testid="select-doc-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="File">File</SelectItem>
                            <SelectItem value="Note">Note</SelectItem>
                            <SelectItem value="Folder">Folder</SelectItem>
                            <SelectItem value="Workspace">Workspace</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                          id="description"
                          data-testid="input-doc-description"
                          value={newDocDesc}
                          onChange={(e) => setNewDocDesc(e.target.value)}
                          placeholder="Brief description of the document..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                      <Button
                        onClick={() => createMutation.mutate()}
                        disabled={!newDocName.trim() || createMutation.isPending}
                        data-testid="button-create-submit"
                      >
                        {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm flex-1 overflow-hidden flex flex-col">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <DocumentTable
                  documents={filteredDocs}
                  selectedDocId={selectedDocId}
                  onSelect={setSelectedDocId}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </div>

          {selectedDoc && (
            <div className="w-96 border-l bg-card flex-shrink-0 flex flex-col">
              <DocumentDetails
                document={selectedDoc}
                onClose={() => setSelectedDocId(null)}
                onUpdate={handleUpdate}
              />
            </div>
          )}
        </main>
      </div>

      <Dialog open={isUploadOpen} onOpenChange={(open) => { setIsUploadOpen(open); if (!open) { setUploadFiles([]); setUploadDesc(""); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>Select files from your computer to upload to Nuxeo.</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
              data-testid="dropzone-upload"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file"
              />
              <FileUp className={cn(
                "h-10 w-10 mx-auto mb-3 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
              <p className="text-sm font-medium text-foreground">
                {isDragging ? "Drop files here" : "Click to browse or drag files here"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Up to 100 MB per file</p>
            </div>

            {uploadFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Selected Files ({uploadFiles.length})
                </Label>
                <div className="bg-muted/30 rounded-lg border divide-y max-h-40 overflow-y-auto">
                  {uploadFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate font-medium">{file.name}</span>
                        <span className="text-muted-foreground text-xs flex-shrink-0">{formatFileSize(file.size)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => removeFile(i)}
                        data-testid={`button-remove-file-${i}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="upload-desc">Description (Optional)</Label>
              <Textarea
                id="upload-desc"
                data-testid="input-upload-description"
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                placeholder="Brief description for the uploaded files..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={uploadFiles.length === 0 || uploadMutation.isPending}
              data-testid="button-upload-submit"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>Upload {uploadFiles.length > 0 ? `(${uploadFiles.length})` : ""}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}