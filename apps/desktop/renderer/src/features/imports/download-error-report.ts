import type { ImportErrorResponse } from '@askod/shared';
export function downloadErrorReport(
  report: NonNullable<ImportErrorResponse['report']>,
) {
  const bytes = Uint8Array.from(atob(report.base64), (char) =>
    char.charCodeAt(0),
  );
  const url = URL.createObjectURL(
    new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = report.fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
