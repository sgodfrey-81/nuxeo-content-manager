import { useState, useEffect } from "react";
import { X, FileText, Download, Share2, Edit, Info, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NuxeoDocument } from "@/lib/nuxeo";

interface DocumentDetailsProps {
  document: NuxeoDocument;
  onClose: () => void;
  onUpdate: (doc: NuxeoDocument) => void;
}

export default function DocumentDetails({ document, onClose, onUpdate }: DocumentDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDoc, setEditedDoc] = useState(document);

  useEffect(() => {
    setEditedDoc(document);
    setIsEditing(false);
  }, [document]);

  const handleSave = () => {
    onUpdate({
      ...editedDoc,
      modified: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between bg-muted/20">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          Properties
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8" data-testid="button-close-details">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-5">
        <div className="flex flex-col items-center text-center mb-8 mt-4">
          <div className="h-20 w-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 text-primary shadow-sm border border-primary/20">
            <FileText className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-heading font-semibold text-foreground mb-1" data-testid="text-detail-name">{document.name}</h2>
          <p className="text-sm text-muted-foreground">{document.type} • {document.size}</p>
        </div>

        <div className="flex gap-2 mb-8 px-2">
          <Button className="flex-1 gap-2" variant="default" data-testid="button-download">
            <Download className="h-4 w-4" /> Download
          </Button>
          <Button className="flex-1 gap-2" variant="outline" data-testid="button-share">
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between px-2 mb-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Metadata</h4>
              {!isEditing ? (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-7 px-2 text-xs" data-testid="button-edit-metadata">
                  <Edit className="h-3 w-3 mr-1.5" /> Edit
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={handleSave} className="h-7 px-2 text-xs" data-testid="button-save-metadata">
                  <Check className="h-3 w-3 mr-1.5" /> Save
                </Button>
              )}
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-4 border shadow-sm transition-all duration-200">
              {isEditing ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Document Name</Label>
                    <Input
                      value={editedDoc.name}
                      onChange={e => setEditedDoc({...editedDoc, name: e.target.value})}
                      className="h-8 text-sm"
                      data-testid="input-edit-name"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <Select value={editedDoc.type} onValueChange={v => setEditedDoc({...editedDoc, type: v})}>
                      <SelectTrigger className="h-8 text-sm" data-testid="select-edit-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="File">File</SelectItem>
                        <SelectItem value="Note">Note</SelectItem>
                        <SelectItem value="Folder">Folder</SelectItem>
                        <SelectItem value="Workspace">Workspace</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Input
                      value={editedDoc.description || ""}
                      onChange={e => setEditedDoc({...editedDoc, description: e.target.value})}
                      className="h-8 text-sm"
                      data-testid="input-edit-description"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className="text-sm font-medium" data-testid="text-detail-status">{document.status}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Modified By</span>
                    <span className="text-sm font-medium">{document.modifiedBy}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Modified</span>
                    <span className="text-sm font-medium text-right">
                      {format(new Date(document.modified), 'PPp')}
                    </span>
                  </div>
                  {document.path && (
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">Path</span>
                      <span className="text-sm font-medium text-right truncate max-w-[200px]" title={document.path}>{document.path}</span>
                    </div>
                  )}
                  {document.description && (
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">Description</span>
                      <span className="text-sm font-medium text-right max-w-[200px]">{document.description}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between px-2 mb-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h4>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs">View All</Button>
            </div>
            <div className="space-y-4 px-2">
              <div className="flex gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Document created</p>
                  <p className="text-xs text-muted-foreground mt-0.5">by {document.modifiedBy} • {format(new Date(document.modified), 'MMM d')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}