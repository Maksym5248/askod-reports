import type { DocumentRepository } from '../../interfaces/document-repository';
export class GetWorkspaceStatus {
  constructor(private readonly documents: DocumentRepository) {}
  async execute(): Promise<{ documentCount: number }> {
    return { documentCount: await this.documents.count() };
  }
}
