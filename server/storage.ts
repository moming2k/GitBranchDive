import { repositories, comparisons, type Repository, type InsertRepository, type Comparison, type InsertComparison } from "@shared/schema";

export interface IStorage {
  getRepositories(): Promise<Repository[]>;
  getRepository(id: number): Promise<Repository | undefined>;
  getRepositoryByPath(path: string): Promise<Repository | undefined>;
  createRepository(repository: InsertRepository): Promise<Repository>;
  updateRepositoryAccess(id: number): Promise<void>;
  createComparison(comparison: InsertComparison): Promise<Comparison>;
  getComparison(id: number): Promise<Comparison | undefined>;
}

export class MemStorage implements IStorage {
  private repositories: Map<number, Repository>;
  private comparisons: Map<number, Comparison>;
  private currentRepoId: number;
  private currentComparisonId: number;

  constructor() {
    this.repositories = new Map();
    this.comparisons = new Map();
    this.currentRepoId = 1;
    this.currentComparisonId = 1;
  }

  async getRepositories(): Promise<Repository[]> {
    return Array.from(this.repositories.values());
  }

  async getRepository(id: number): Promise<Repository | undefined> {
    return this.repositories.get(id);
  }

  async getRepositoryByPath(path: string): Promise<Repository | undefined> {
    return Array.from(this.repositories.values()).find(
      (repo) => repo.path === path,
    );
  }

  async createRepository(insertRepository: InsertRepository): Promise<Repository> {
    const id = this.currentRepoId++;
    const repository: Repository = {
      ...insertRepository,
      id,
      lastAccessed: new Date(),
    };
    this.repositories.set(id, repository);
    return repository;
  }

  async updateRepositoryAccess(id: number): Promise<void> {
    const repository = this.repositories.get(id);
    if (repository) {
      repository.lastAccessed = new Date();
      this.repositories.set(id, repository);
    }
  }

  async createComparison(insertComparison: InsertComparison): Promise<Comparison> {
    const id = this.currentComparisonId++;
    const comparison: Comparison = {
      id,
      repositoryId: insertComparison.repositoryId || null,
      sourceBranch: insertComparison.sourceBranch,
      targetBranch: insertComparison.targetBranch,
      changedFiles: insertComparison.changedFiles,
      createdAt: new Date(),
    };
    this.comparisons.set(id, comparison);
    return comparison;
  }

  async getComparison(id: number): Promise<Comparison | undefined> {
    return this.comparisons.get(id);
  }
}

export const storage = new MemStorage();
