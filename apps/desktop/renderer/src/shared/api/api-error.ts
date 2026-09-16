export class ApiError extends Error {
  constructor(
    message: string,
    public issues: Array<{ row: number; field: string; message: string }> = [],
  ) {
    super(message);
  }
}
