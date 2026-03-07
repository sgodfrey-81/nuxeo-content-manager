import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import DocumentTable from "@/components/documents/DocumentTable";
import DocumentDetails from "@/components/documents/DocumentDetails";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDocuments, createDocument, updateDocument, deleteDocument, type NuxeoDocument } from "@/lib/nuxeo";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState("File");
  const [newDocDesc, setNewDocDesc] = useState("");

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
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-upload">
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
    </div>
  );
}