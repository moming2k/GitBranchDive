import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch } from "lucide-react";
import { RepositoryBrowser } from "@/components/repository-browser";
import { FileTree } from "@/components/file-tree";
import { DiffHeader } from "@/components/diff-header";
import { ThreeWayDiff } from "@/components/three-way-diff";
import { apiRequest } from "@/lib/queryClient";
import type { Repository, GitFile, DiffResult } from "@/lib/git-types";

export default function Home() {
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [sourceBranch, setSourceBranch] = useState("main");
  const [targetBranch, setTargetBranch] = useState("");
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<GitFile | null>(null);

  const queryClient = useQueryClient();

  const compareBranchesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRepository) throw new Error("No repository selected");
      
      const response = await apiRequest("POST", `/api/repositories/${selectedRepository.id}/compare`, {
        sourceBranch,
        targetBranch
      });
      return response.json();
    },
    onSuccess: (result: DiffResult) => {
      setDiffResult(result);
      if (result.files.length > 0) {
        setSelectedFile(result.files[0]);
      }
    },
  });

  const handleCompare = () => {
    if (selectedRepository && sourceBranch && targetBranch) {
      compareBranchesMutation.mutate();
    }
  };

  const handleFileSelect = (file: GitFile) => {
    setSelectedFile(file);
  };

  const getCurrentFileIndex = () => {
    if (!selectedFile || !diffResult) return 0;
    return diffResult.files.findIndex(f => f.path === selectedFile.path);
  };

  const handlePreviousFile = () => {
    if (!diffResult || !selectedFile) return;
    const currentIndex = getCurrentFileIndex();
    if (currentIndex > 0) {
      setSelectedFile(diffResult.files[currentIndex - 1]);
    }
  };

  const handleNextFile = () => {
    if (!diffResult || !selectedFile) return;
    const currentIndex = getCurrentFileIndex();
    if (currentIndex < diffResult.files.length - 1) {
      setSelectedFile(diffResult.files[currentIndex + 1]);
    }
  };

  return (
    <div className="h-screen overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <GitBranch className="h-6 w-6 text-blue-500" />
              <h1 className="text-xl font-semibold text-gray-900">GitDiff Pro</h1>
              <span className="text-sm text-gray-500">Three-Way Branch Comparison</span>
            </div>
            {selectedRepository && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="font-medium">{selectedRepository.name}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-500">{selectedRepository.path}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex h-full pt-16">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Branch Comparison</h3>
            <RepositoryBrowser
              selectedRepository={selectedRepository}
              onRepositorySelect={setSelectedRepository}
              sourceBranch={sourceBranch}
              targetBranch={targetBranch}
              onSourceBranchChange={setSourceBranch}
              onTargetBranchChange={setTargetBranch}
              onCompare={handleCompare}
              isComparing={compareBranchesMutation.isPending}
            />
          </div>

          {diffResult && (
            <div className="flex-1 overflow-y-auto p-4">
              <FileTree
                files={diffResult.files}
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
                totalAdditions={diffResult.totalAdditions}
                totalDeletions={diffResult.totalDeletions}
              />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <DiffHeader
            selectedFile={selectedFile}
            currentFileIndex={getCurrentFileIndex()}
            totalFiles={diffResult?.files.length || 0}
            onPreviousFile={handlePreviousFile}
            onNextFile={handleNextFile}
          />

          {selectedRepository && sourceBranch && targetBranch ? (
            <ThreeWayDiff
              repository={selectedRepository}
              sourceBranch={sourceBranch}
              targetBranch={targetBranch}
              selectedFile={selectedFile}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select a repository and branches to start comparing</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
