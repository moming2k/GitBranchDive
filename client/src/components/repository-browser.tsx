import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, GitBranch, Folder, HardDrive } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Repository, BrowseResult } from "@/lib/git-types";

interface RepositoryBrowserProps {
  selectedRepository: Repository | null;
  onRepositorySelect: (repository: Repository) => void;
  sourceBranch: string;
  targetBranch: string;
  onSourceBranchChange: (branch: string) => void;
  onTargetBranchChange: (branch: string) => void;
  onCompare: () => void;
  isComparing: boolean;
}

export function RepositoryBrowser({
  selectedRepository,
  onRepositorySelect,
  sourceBranch,
  targetBranch,
  onSourceBranchChange,
  onTargetBranchChange,
  onCompare,
  isComparing
}: RepositoryBrowserProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("/");
  const [newRepoPath, setNewRepoPath] = useState("");

  const queryClient = useQueryClient();

  const { data: repositories } = useQuery<Repository[]>({
    queryKey: ["/api/repositories"],
  });

  const { data: branches } = useQuery<string[]>({
    queryKey: ["/api/repositories", selectedRepository?.id, "branches"],
    enabled: !!selectedRepository,
  });

  const { data: browseData } = useQuery<BrowseResult>({
    queryKey: ["/api/browse", currentPath],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/browse", { dirPath: currentPath });
      return response.json();
    },
    enabled: isDialogOpen,
  });

  const addRepositoryMutation = useMutation({
    mutationFn: async (path: string) => {
      const response = await apiRequest("POST", "/api/repositories", { 
        name: path.split('/').pop() || 'Unknown',
        path 
      });
      return response.json();
    },
    onSuccess: (repository) => {
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
      onRepositorySelect(repository);
      setIsDialogOpen(false);
      setNewRepoPath("");
    },
  });

  const handleAddRepository = () => {
    if (newRepoPath.trim()) {
      addRepositoryMutation.mutate(newRepoPath.trim());
    }
  };

  const handleDirectorySelect = (path: string) => {
    addRepositoryMutation.mutate(path);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Repository</label>
        <div className="flex space-x-2">
          <Select 
            value={selectedRepository?.id.toString() || ""} 
            onValueChange={(value) => {
              const repo = repositories?.find(r => r.id.toString() === value);
              if (repo) onRepositorySelect(repo);
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a repository" />
            </SelectTrigger>
            <SelectContent>
              {repositories?.map((repo) => (
                <SelectItem key={repo.id} value={repo.id.toString()}>
                  <div className="flex items-center space-x-2">
                    <Folder className="h-4 w-4 text-gray-500" />
                    <span>{repo.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <FolderOpen className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Browse Local Repositories</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter repository path..."
                    value={newRepoPath}
                    onChange={(e) => setNewRepoPath(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleAddRepository}
                    disabled={addRepositoryMutation.isPending || !newRepoPath.trim()}
                  >
                    Add
                  </Button>
                </div>
                
                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="flex items-center space-x-2 mb-3">
                    <HardDrive className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{browseData?.currentPath}</span>
                  </div>
                  
                  {browseData && browseData.parent !== browseData.currentPath && (
                    <div 
                      className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={() => setCurrentPath(browseData?.parent || "/")}
                    >
                      <Folder className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">..</span>
                    </div>
                  )}
                  
                  {browseData?.directories.map((dir) => (
                    <div 
                      key={dir.path}
                      className={`flex items-center justify-between space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer ${
                        dir.isGitRepo ? 'bg-green-50 border border-green-200' : ''
                      }`}
                      onClick={() => {
                        if (dir.isGitRepo) {
                          handleDirectorySelect(dir.path);
                        } else {
                          setCurrentPath(dir.path);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <Folder className={`h-4 w-4 ${dir.isGitRepo ? 'text-green-600' : 'text-gray-500'}`} />
                        <span className="text-sm">{dir.name}</span>
                      </div>
                      {dir.isGitRepo && (
                        <GitBranch className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectedRepository && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source Branch</label>
            <Select value={sourceBranch} onValueChange={onSourceBranchChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select source branch" />
              </SelectTrigger>
              <SelectContent>
                {branches?.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    <div className="flex items-center space-x-2">
                      <GitBranch className="h-4 w-4 text-blue-500" />
                      <span>{branch}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Branch</label>
            <Select value={targetBranch} onValueChange={onTargetBranchChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select target branch" />
              </SelectTrigger>
              <SelectContent>
                {branches?.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    <div className="flex items-center space-x-2">
                      <GitBranch className="h-4 w-4 text-orange-500" />
                      <span>{branch}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={onCompare}
            disabled={!sourceBranch || !targetBranch || sourceBranch === targetBranch || isComparing}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {isComparing ? "Comparing..." : "Compare Branches"}
          </Button>
        </>
      )}
    </div>
  );
}
