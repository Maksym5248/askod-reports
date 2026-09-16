import type { JournalRepository } from '../../interfaces/journal-repository';
export class ListImports {
  constructor(
    private readonly repository: Pick<JournalRepository, 'recentImports'>,
  ) {}
  execute() {
    return this.repository.recentImports();
  }
}
