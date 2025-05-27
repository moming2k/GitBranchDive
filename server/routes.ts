import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRepositorySchema, insertComparisonSchema } from "@shared/schema";
import simpleGit from "simple-git";
import path from "path";
import fs from "fs/promises";
import { z } from "zod";

interface GitFile {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

interface DiffResult {
  files: GitFile[];
  totalAdditions: number;
  totalDeletions: number;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all repositories
  app.get("/api/repositories", async (req, res) => {
    try {
      const repositories = await storage.getRepositories();
      res.json(repositories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch repositories" });
    }
  });

  // Add a repository
  app.post("/api/repositories", async (req, res) => {
    try {
      const data = insertRepositorySchema.parse(req.body);
      
      // Verify it's a valid git repository
      const git = simpleGit(data.path);
      await git.status();
      
      // Check if repository already exists
      const existing = await storage.getRepositoryByPath(data.path);
      if (existing) {
        await storage.updateRepositoryAccess(existing.id);
        res.json(existing);
        return;
      }

      const repository = await storage.createRepository(data);
      res.json(repository);
    } catch (error) {
      console.error('Repository error:', error);
      res.status(400).json({ error: "Invalid repository path or not a git repository" });
    }
  });

  // Clone a remote repository
  app.post("/api/repositories/clone", async (req, res) => {
    try {
      const { url, localPath, name } = req.body;
      
      if (!url || !localPath) {
        res.status(400).json({ error: "URL and local path are required" });
        return;
      }

      // Check if directory already exists
      try {
        await fs.access(localPath);
        // Directory exists, check if it's already a git repo and in our storage
        const existing = await storage.getRepositoryByPath(localPath);
        if (existing) {
          await storage.updateRepositoryAccess(existing.id);
          res.json(existing);
          return;
        } else {
          // Directory exists but not in storage, try to verify it's a git repo
          try {
            const git = simpleGit(localPath);
            await git.status();
            // It's a valid git repo, add it to storage
            const repository = await storage.createRepository({
              name: name || path.basename(localPath),
              path: localPath
            });
            res.json(repository);
            return;
          } catch {
            res.status(400).json({ error: "Directory already exists and is not a valid git repository" });
            return;
          }
        }
      } catch {
        // Directory doesn't exist, proceed with clone
      }

      // Create parent directory if needed
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      
      // Clone the repository
      const git = simpleGit();
      await git.clone(url, localPath);
      
      // Create repository entry
      const repository = await storage.createRepository({
        name: name || path.basename(localPath),
        path: localPath
      });
      
      res.json(repository);
    } catch (error) {
      console.error('Clone error:', error);
      res.status(500).json({ error: "Failed to clone repository: " + (error as Error).message });
    }
  });

  // Browse local directories
  app.post("/api/browse", async (req, res) => {
    try {
      const { dirPath } = req.body;
      const targetPath = dirPath || process.cwd();
      
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const directories = entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => ({
          name: entry.name,
          path: path.join(targetPath, entry.name),
          isGitRepo: false
        }));

      // Check which directories are git repositories
      for (const dir of directories) {
        try {
          const git = simpleGit(dir.path);
          await git.status();
          dir.isGitRepo = true;
        } catch {
          // Not a git repo, keep isGitRepo as false
        }
      }

      res.json({
        currentPath: targetPath,
        parent: path.dirname(targetPath),
        directories
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to browse directory" });
    }
  });

  // Get branches for a repository
  app.get("/api/repositories/:id/branches", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const repository = await storage.getRepository(id);
      
      if (!repository) {
        res.status(404).json({ error: "Repository not found" });
        return;
      }

      const git = simpleGit(repository.path);
      const branches = await git.branch(['--all']);
      
      const branchList = branches.all
        .filter(branch => !branch.startsWith('remotes/'))
        .map(branch => branch.replace('origin/', ''));

      res.json(branchList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });

  // Compare branches
  app.post("/api/repositories/:id/compare", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { sourceBranch, targetBranch } = req.body;
      
      const repository = await storage.getRepository(id);
      if (!repository) {
        res.status(404).json({ error: "Repository not found" });
        return;
      }

      const git = simpleGit(repository.path);
      
      // Get diff summary between branches
      const diffSummary = await git.diffSummary([`${sourceBranch}...${targetBranch}`]);
      
      const files: GitFile[] = diffSummary.files.map(file => ({
        path: file.file,
        status: (file as any).insertions > 0 && (file as any).deletions > 0 ? 'modified' : 
               (file as any).insertions > 0 ? 'added' : 'deleted',
        additions: (file as any).insertions || 0,
        deletions: (file as any).deletions || 0
      }));

      const result: DiffResult = {
        files,
        totalAdditions: diffSummary.insertions,
        totalDeletions: diffSummary.deletions
      };

      // Save comparison
      const comparison = await storage.createComparison({
        repositoryId: id,
        sourceBranch,
        targetBranch,
        changedFiles: result
      });

      res.json({ ...result, comparisonId: comparison.id });
    } catch (error) {
      console.error('Compare error:', error);
      res.status(500).json({ error: "Failed to compare branches" });
    }
  });

  // Get file content from specific branch
  app.get("/api/repositories/:id/file", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { branch, filePath } = req.query;
      
      if (!branch || !filePath) {
        res.status(400).json({ error: "Branch and filePath are required" });
        return;
      }

      const repository = await storage.getRepository(id);
      if (!repository) {
        res.status(404).json({ error: "Repository not found" });
        return;
      }

      const git = simpleGit(repository.path);
      
      try {
        const content = await git.show([`${branch}:${filePath}`]);
        res.json({ content, exists: true });
      } catch (error) {
        // File doesn't exist in this branch
        res.json({ content: '', exists: false });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch file content" });
    }
  });

  // Get detailed diff for a specific file
  app.get("/api/repositories/:id/diff", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { sourceBranch, targetBranch, filePath } = req.query;
      
      if (!sourceBranch || !targetBranch || !filePath) {
        res.status(400).json({ error: "sourceBranch, targetBranch, and filePath are required" });
        return;
      }

      const repository = await storage.getRepository(id);
      if (!repository) {
        res.status(404).json({ error: "Repository not found" });
        return;
      }

      const git = simpleGit(repository.path);
      
      // Get the actual diff
      const diff = await git.diff([`${sourceBranch}...${targetBranch}`, '--', filePath as string]);
      
      res.json({ diff });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch file diff" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
