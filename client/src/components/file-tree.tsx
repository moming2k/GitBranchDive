import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileCode, FilePlus, FileX, FileEdit } from "lucide-react";
import type { GitFile } from "@/lib/git-types";

interface FileTreeProps {
  files: GitFile[];
  selectedFile: GitFile | null;
  onFileSelect: (file: GitFile) => void;
  totalAdditions: number;
  totalDeletions: number;
}

export function FileTree({ files, selectedFile, onFileSelect, totalAdditions, totalDeletions }: FileTreeProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFiles = files.filter(file =>
    file.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (status: GitFile['status']) => {
    switch (status) {
      case 'added':
        return <FilePlus className="h-4 w-4 text-green-600" />;
      case 'deleted':
        return <FileX className="h-4 w-4 text-red-600" />;
      case 'modified':
        return <FileEdit className="h-4 w-4 text-yellow-600" />;
      default:
        return <FileCode className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: GitFile['status']) => {
    switch (status) {
      case 'added':
        return 'bg-green-500';
      case 'deleted':
        return 'bg-red-500';
      case 'modified':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getChangesSummary = (file: GitFile) => {
    if (file.status === 'added') return `+${file.additions}`;
    if (file.status === 'deleted') return `-${file.deletions}`;
    return `+${file.additions} -${file.deletions}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Changed Files</h3>
        <Badge variant="secondary">{files.length} files</Badge>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Filter files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex items-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">Added</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span className="text-gray-600">Modified</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-gray-600">Deleted</span>
        </div>
      </div>

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {filteredFiles.map((file) => (
          <div
            key={file.path}
            className={`flex items-center justify-between space-x-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer group ${
              selectedFile?.path === file.path ? 'bg-blue-50 border border-blue-200' : ''
            }`}
            onClick={() => onFileSelect(file)}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div className={`w-2 h-2 ${getStatusColor(file.status)} rounded-full flex-shrink-0`}></div>
              {getFileIcon(file.status)}
              <span className="text-sm text-gray-700 truncate">{file.path}</span>
            </div>
            <span className="text-xs text-gray-500 ml-auto">
              {getChangesSummary(file)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Comparison Summary</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-green-600 font-semibold">+{totalAdditions}</div>
            <div className="text-gray-500">Added</div>
          </div>
          <div className="text-center">
            <div className="text-red-600 font-semibold">-{totalDeletions}</div>
            <div className="text-gray-500">Deleted</div>
          </div>
          <div className="text-center">
            <div className="text-gray-700 font-semibold">{files.length}</div>
            <div className="text-gray-500">Files</div>
          </div>
        </div>
      </div>
    </div>
  );
}
