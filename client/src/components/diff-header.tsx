import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, FileCode, Download } from "lucide-react";
import type { GitFile } from "@/lib/git-types";

interface DiffHeaderProps {
  selectedFile: GitFile | null;
  currentFileIndex: number;
  totalFiles: number;
  onPreviousFile: () => void;
  onNextFile: () => void;
}

export function DiffHeader({ 
  selectedFile, 
  currentFileIndex, 
  totalFiles, 
  onPreviousFile, 
  onNextFile 
}: DiffHeaderProps) {
  if (!selectedFile) {
    return (
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-center text-gray-500">
          <FileCode className="h-5 w-5 mr-2" />
          <span>Select a file to view diff</span>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: GitFile['status']) => {
    switch (status) {
      case 'added':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">New File</Badge>;
      case 'deleted':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Deleted</Badge>;
      case 'modified':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Modified</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <FileCode className="h-5 w-5 text-gray-400" />
          <span className="text-lg font-medium text-gray-900">{selectedFile.path}</span>
          {getStatusBadge(selectedFile.status)}
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            {selectedFile.status !== 'deleted' && (
              <span className="text-green-600 font-medium">+{selectedFile.additions} additions</span>
            )}
            {selectedFile.status !== 'added' && selectedFile.status !== 'deleted' && (
              <span className="text-gray-400">•</span>
            )}
            {selectedFile.status !== 'added' && (
              <span className="text-red-600 font-medium">-{selectedFile.deletions} deletions</span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPreviousFile}
              disabled={currentFileIndex === 0}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-500">
              {currentFileIndex + 1} of {totalFiles}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNextFile}
              disabled={currentFileIndex === totalFiles - 1}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Diff
          </Button>
        </div>
      </div>
    </div>
  );
}
