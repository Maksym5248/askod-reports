import type { JournalRepository } from '../../interfaces/journal-repository';
export class ListDocuments {
  constructor(private readonly repository: Pick<JournalRepository, 'list'>) {}
  execute(input: Parameters<JournalRepository['list']>[0]) {
    return this.repository.list(input);
  }
}
