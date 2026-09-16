import type { JournalRepository } from '../../interfaces/journal-repository';
export class ListDocuments {
  constructor(private readonly repository: Pick<JournalRepository, 'list'>) {}
  execute(input: { page: number; pageSize: number }) {
    return this.repository.list(input);
  }
}
