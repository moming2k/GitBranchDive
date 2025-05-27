export interface Repository {
  id: number;
  name: string;
  path: string;
  lastAccessed: Date;
}

export interface GitFile {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

export interface DiffResult {
  files: GitFile[];
  totalAdditions: number;
  totalDeletions: number;
  comparisonId?: number;
}

export interface FileContent {
  content: string;
  exists: boolean;
}

export interface BrowseResult {
  currentPath: string;
  parent: string;
  directories: {
    name: string;
    path: string;
    isGitRepo: boolean;
  }[];
}

export interface FileDiff {
  diff: string;
}
