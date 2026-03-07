import {
  FileText,
  File,
  Folder,
  Image as ImageIcon,
  MoreVertical,
  Download,
  Trash,
  Edit2,
  StickyNote,
  LayoutGrid
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NuxeoDocument } from "@/lib/nuxeo";

interface DocumentTableProps {
  documents: NuxeoDocument[];
  selectedDocId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const getFileIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'file': return <FileText className="h-5 w-5 text-blue-500" />;
    case 'folder': return <Folder className="h-5 w-5 text-yellow-500 fill-yellow-500/20" />;
    case 'note': return <StickyNote className="h-5 w-5 text-amber-500" />;
    case 'workspace': return <LayoutGrid className="h-5 w-5 text-indigo-500" />;
    case 'picture': return <ImageIcon className="h-5 w-5 text-purple-500" />;
    default: return <File className="h-5 w-5 text-slate-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'published': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
    case 'draft':
    case 'project': return 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400';
    case 'in review': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
    case 'archived':
    case 'obsolete': return 'bg-stone-100 text-stone-700 dark:bg-stone-500/20 dark:text-stone-400';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400';
  }
};

export default function DocumentTable({ documents, selectedDocId, onSelect, onDelete }: DocumentTableProps) {
  if (documents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <Folder className="h-12 w-12 mb-4 text-muted/50" />
        <h3 className="text-lg font-medium text-foreground mb-1" data-testid="text-empty-state">No documents found</h3>
        <p className="text-sm max-w-sm">Try adjusting your search or upload a new document to get started.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <table className="w-full text-left border-collapse">
        <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
          <tr>
            <th className="font-medium text-xs text-muted-foreground py-3 px-4 w-[40%]">Name</th>
            <th className="font-medium text-xs text-muted-foreground py-3 px-4">Status</th>
            <th className="font-medium text-xs text-muted-foreground py-3 px-4">Modified</th>
            <th className="font-medium text-xs text-muted-foreground py-3 px-4">Modified By</th>
            <th className="font-medium text-xs text-muted-foreground py-3 px-4 w-[60px]"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {documents.map((doc) => (
            <tr
              key={doc.id}
              onClick={() => onSelect(doc.id)}
              data-testid={`row-document-${doc.id}`}
              className={cn(
                "group hover:bg-muted/30 transition-colors cursor-pointer",
                selectedDocId === doc.id ? "bg-primary/5" : ""
              )}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {getFileIcon(doc.type)}
                  <span className={cn(
                    "font-medium text-sm transition-colors",
                    selectedDocId === doc.id ? "text-primary" : "text-foreground group-hover:text-primary"
                  )}>
                    {doc.name}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                  getStatusColor(doc.status)
                )}>
                  {doc.status}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {format(new Date(doc.modified), 'MMM d, yyyy')}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {doc.modifiedBy}
              </td>
              <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100" data-testid={`button-actions-${doc.id}`}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => onSelect(doc.id)}>
                      <Edit2 className="h-4 w-4" /> Edit Metadata
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer">
                      <Download className="h-4 w-4" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                      onClick={() => onDelete(doc.id)}
                      data-testid={`button-delete-${doc.id}`}
                    >
                      <Trash className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}