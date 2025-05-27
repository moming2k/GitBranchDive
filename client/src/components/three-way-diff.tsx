import { useQuery } from "@tanstack/react-query";
import { GitBranch, SquareSlash, CheckCircle } from "lucide-react";
import type { Repository, GitFile, FileContent } from "@/lib/git-types";

interface ThreeWayDiffProps {
  repository: Repository;
  sourceBranch: string;
  targetBranch: string;
  selectedFile: GitFile | null;
}

export function ThreeWayDiff({ repository, sourceBranch, targetBranch, selectedFile }: ThreeWayDiffProps) {
  const { data: sourceContent } = useQuery<FileContent>({
    queryKey: ["/api/repositories", repository.id, "file", sourceBranch, selectedFile?.path],
    enabled: !!selectedFile,
  });

  const { data: targetContent } = useQuery<FileContent>({
    queryKey: ["/api/repositories", repository.id, "file", targetBranch, selectedFile?.path],
    enabled: !!selectedFile,
  });

  if (!selectedFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <SquareSlash className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Select a file to view the three-way diff</p>
        </div>
      </div>
    );
  }

  const renderCodeColumn = (content: string | undefined, exists: boolean, title: string, icon: React.ReactNode, bgColor: string) => {
    const lines = content ? content.split('\n') : [];
    
    return (
      <div className="flex-1 border-r border-gray-200 bg-white">
        <div className={`${bgColor} px-4 py-2 border-b border-gray-200`}>
          <div className="flex items-center space-x-2">
            {icon}
            <span className="text-sm font-medium text-gray-700">{title}</span>
          </div>
        </div>
        
        <div className="h-full overflow-auto font-mono text-sm">
          {!exists ? (
            <div className="p-4">
              <div className="text-gray-500 text-center py-8">
                <SquareSlash className="h-8 w-8 mx-auto mb-2" />
                <div>File does not exist in this branch</div>
              </div>
            </div>
          ) : (
            <div className="flex">
              <div className="bg-gray-50 text-gray-400 text-right px-3 py-2 border-r border-gray-200 select-none min-w-[3rem]">
                {lines.map((_, index) => (
                  <div key={index} className="leading-5">{index + 1}</div>
                ))}
              </div>
              <div className="flex-1 p-2">
                {lines.map((line, index) => (
                  <div key={index} className="leading-5 whitespace-pre-wrap break-all">
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Create merged content (simplified - in reality this would need proper merge logic)
  const createMergedContent = () => {
    if (selectedFile.status === 'added') {
      return targetContent?.content || '';
    }
    if (selectedFile.status === 'deleted') {
      return '';
    }
    // For modified files, show the target content as the "merged" result
    return targetContent?.content || '';
  };

  const mergedContent = createMergedContent();
  const mergedExists = selectedFile.status !== 'deleted';

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full flex">
        {renderCodeColumn(
          sourceContent?.content,
          sourceContent?.exists || false,
          `${sourceBranch} (source)`,
          <GitBranch className="h-4 w-4 text-blue-500" />,
          "bg-gray-50"
        )}
        
        {renderCodeColumn(
          targetContent?.content,
          targetContent?.exists || false,
          `${targetBranch} (target)`,
          <GitBranch className="h-4 w-4 text-orange-500" />,
          "bg-gray-50"
        )}
        
        {renderCodeColumn(
          mergedContent,
          mergedExists,
          "Merge Result (preview)",
          <CheckCircle className="h-4 w-4 text-green-600" />,
          "bg-green-50"
        )}
      </div>
    </div>
  );
}
