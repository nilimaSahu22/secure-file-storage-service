import { Search, Upload } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

interface ToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onUploadClick: () => void;
}

export function Toolbar({ search, onSearchChange, onUploadClick }: ToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <Input
          id="search"
          placeholder="Search files"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Button onClick={onUploadClick} className="gap-2">
        <Upload size={16} />
        Upload
      </Button>
    </div>
  );
}
