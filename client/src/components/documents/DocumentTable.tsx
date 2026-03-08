import { useState, useMemo } from "react";
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
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NuxeoDocument } from "@/lib/nuxeo";

interface DocumentTableProps {
  documents: NuxeoDocument[];
  selectedDocId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  checkedIds: Set<string>;
  onToggleCheck: (id: string) => void;
  onToggleAll: () => void;
}

type SortKey = "name" | "status" | "modified" | "modifiedBy";
type SortDirection = "asc" | "desc";

const getFileIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'file': return <FileText className="h-5 w-5 text-cat-blue" />;
    case 'folder': return <Folder className="h-5 w-5 text-cat-orange fill-cat-orange/20" />;
    case 'note': return <StickyNote className="h-5 w-5 text-warning" />;
    case 'workspace': return <LayoutGrid className="h-5 w-5 text-cat-purple" />;
    case 'picture': return <ImageIcon className="h-5 w-5 text-cat-pink" />;
    default: return <File className="h-5 w-5 text-muted-foreground" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'published': return 'bg-success/10 text-success dark:bg-success/20 dark:text-success-foreground';
    case 'draft':
    case 'project': return 'bg-muted text-muted-foreground';
    case 'in review': return 'bg-info/10 text-info dark:bg-info/20 dark:text-info-foreground';
    case 'archived':
    case 'obsolete': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

function SortIcon({ column, sortKey, sortDirection }: { column: SortKey; sortKey: SortKey; sortDirection: SortDirection }) {
  if (column !== sortKey) {
    return <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/header:opacity-50 transition-opacity" />;
  }
  return sortDirection === "asc"
    ? <ArrowUp className="h-3 w-3 text-primary" />
    : <ArrowDown className="h-3 w-3 text-primary" />;
}

export default function DocumentTable({ documents, selectedDocId, onSelect, onDelete, checkedIds, onToggleCheck, onToggleAll }: DocumentTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("modified");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection(key === "modified" ? "desc" : "asc");
    }
  };

  const sortedDocuments = useMemo(() => {
    const sorted = [...documents].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "name":
          comparison = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          break;
        case "status":
          comparison = a.status.localeCompare(b.status, undefined, { sensitivity: "base" });
          break;
        case "modified":
          comparison = new Date(a.modified).getTime() - new Date(b.modified).getTime();
          break;
        case "modifiedBy":
          comparison = a.modifiedBy.localeCompare(b.modifiedBy, undefined, { sensitivity: "base" });
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [documents, sortKey, sortDirection]);

  if (documents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <Folder className="h-12 w-12 mb-4 text-muted/50" />
        <h3 className="text-lg font-medium text-foreground mb-1" data-testid="text-empty-state">No documents found</h3>
        <p className="text-sm max-w-sm">Try adjusting your search or upload a new document to get started.</p>
      </div>
    );
  }

  const allChecked = documents.length > 0 && documents.every(d => checkedIds.has(d.id));
  const someChecked = documents.some(d => checkedIds.has(d.id)) && !allChecked;

  const columns: { key: SortKey; label: string; widthClass?: string }[] = [
    { key: "name", label: "Name", widthClass: "w-[40%]" },
    { key: "status", label: "Status" },
    { key: "modified", label: "Modified" },
    { key: "modifiedBy", label: "Modified By" },
  ];

  return (
    <ScrollArea className="flex-1">
      <table className="w-full text-left border-collapse">
        <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
          <tr>
            <th className="py-3 px-4 w-[40px]">
              <Checkbox
                checked={allChecked ? true : someChecked ? "indeterminate" : false}
                onCheckedChange={onToggleAll}
                data-testid="checkbox-select-all"
                aria-label="Select all documents"
              />
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "py-3 px-4 group/header",
                  col.widthClass
                )}
              >
                <button
                  className={cn(
                    "inline-flex items-center gap-1.5 font-medium text-xs transition-colors select-none",
                    sortKey === col.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => handleSort(col.key)}
                  data-testid={`button-sort-${col.key}`}
                >
                  {col.label}
                  <SortIcon column={col.key} sortKey={sortKey} sortDirection={sortDirection} />
                </button>
              </th>
            ))}
            <th className="font-medium text-xs text-muted-foreground py-3 px-4 w-[60px]"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sortedDocuments.map((doc) => (
            <tr
              key={doc.id}
              onClick={() => onSelect(doc.id)}
              data-testid={`row-document-${doc.id}`}
              className={cn(
                "group hover:bg-muted/30 transition-colors cursor-pointer",
                selectedDocId === doc.id ? "bg-primary/5" : "",
                checkedIds.has(doc.id) ? "bg-primary/5" : ""
              )}
            >
              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={checkedIds.has(doc.id)}
                  onCheckedChange={() => onToggleCheck(doc.id)}
                  data-testid={`checkbox-doc-${doc.id}`}
                  aria-label={`Select ${doc.name}`}
                />
              </td>
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
