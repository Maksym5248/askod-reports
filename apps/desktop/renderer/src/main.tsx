import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { DocumentsDto, ImportSummaryDto } from '@askod/shared';
import { ApiError, getDocuments, getImports, importJournal } from './api';
import './styles.css';

function App() {
  const [documents, setDocuments] = useState<DocumentsDto>();
  const [imports, setImports] = useState<ImportSummaryDto[]>([]);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportSummaryDto>();
  const [error, setError] = useState<ApiError>();
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoadError(false);
    setLoading(true);
    Promise.all([
      getDocuments(page, controller.signal),
      getImports(controller.signal),
    ])
      .then(([data, history]) => {
        if (!controller.signal.aborted) {
          setDocuments(data);
          setImports(history);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, revision]);
  async function upload() {
    if (!file || busy) return;
    setError(undefined);
    setResult(undefined);
    if (
      !/\.xlsx$/i.test(file.name) ||
      file.size === 0 ||
      file.size > 10 * 1024 * 1024
    ) {
      setError(
        new ApiError('Оберіть непорожній файл .xlsx розміром до 10 МБ.'),
      );
      return;
    }
    setBusy(true);
    try {
      const imported = await importJournal(file);
      setResult(imported);
      setFile(undefined);
      if (fileInput.current) fileInput.current.value = '';
      setPage(1);
      setRevision((value) => value + 1);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught
          : new ApiError('Не вдалося імпортувати файл.'),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          А<span>ASKOD Звіти</span>
        </div>
        <div className="section">РОБОЧИЙ ПРОСТІР</div>
        <nav aria-label="Головна навігація">
          <a href="#documents" aria-current="page">
            Документи
          </a>
          <a href="#imports">Історія імпортів</a>
        </nav>
        <p className="aside-note">
          Локальний робочий простір
          <br />
          Версія 0.2 · Імпорт журналу
        </p>
      </aside>
      <main>
        <header>
          <span>Робочий простір / Документи</span>
          <span className="badge">На цьому пристрої</span>
        </header>
        <div className="content">
          <p className="eyebrow">ЖУРНАЛ АСКОД</p>
          <h1>Документи у вашому сховищі</h1>
          <p className="lead">
            Імпортуйте журнал Excel, щоб зберегти дані для подальшої роботи та
            звітів.
          </p>
          <section className="import-panel" aria-labelledby="import-title">
            <div>
              <h2 id="import-title">Імпорт з Excel</h2>
              <p>
                Оберіть експорт журналу АСКОД (.xlsx, до 10 МБ). Повторний
                імпорт оновить документи зі збереженням історії.
              </p>
            </div>
            <div className="upload-controls">
              <input
                className="visually-hidden"
                aria-label="Файл журналу АСКОД"
                ref={fileInput}
                type="file"
                accept=".xlsx"
                disabled={busy}
                onChange={(event) => {
                  setFile(event.target.files?.[0]);
                  setError(undefined);
                  setResult(undefined);
                }}
              />
              <button
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                Обрати Excel-файл
              </button>
              <span className="file-name">
                {file?.name ?? 'Файл не обрано'}
              </span>
              <button
                className="primary"
                disabled={!file || busy}
                onClick={() => void upload()}
              >
                {busy ? 'Перевірка та збереження…' : 'Імпортувати в базу'}
              </button>
            </div>
            <div aria-live="polite">
              {result && (
                <p className="success">
                  Імпорт завершено: додано {result.created}, оновлено{' '}
                  {result.updated}, без змін {result.unchanged}. Усього рядків:{' '}
                  {result.totalRows}.
                </p>
              )}
            </div>
            {error && (
              <div role="alert" className="import-error">
                <p>{error.message}</p>
                {error.issues.length > 0 && (
                  <ul>
                    {error.issues.map((issue, index) => (
                      <li key={index}>
                        Рядок {issue.row}
                        {issue.field ? `, ${issue.field}` : ''}: {issue.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
          <section className="status" aria-live="polite">
            <span
              className={`dot ${loadError ? 'error' : loading ? 'pending' : ''}`}
            />
            <div>
              <h2>
                {loadError
                  ? 'Не вдалося оновити список'
                  : loading
                    ? 'Завантаження документів…'
                    : 'Робочий простір готовий'}
              </h2>
              <p>
                {loadError
                  ? 'Спробуйте завантажити дані повторно.'
                  : `Документів у сховищі: ${documents?.total ?? '…'}.`}
              </p>
            </div>
            {loadError && (
              <button onClick={() => setRevision((value) => value + 1)}>
                Спробувати ще раз
              </button>
            )}
          </section>
          <section id="documents">
            <div className="section-heading">
              <h2>Документи</h2>
              <span>Сторінка {page}</span>
            </div>
            {documents && !loading && !loadError && (
              <>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>№ документа</th>
                        <th>Дата</th>
                        <th>Зміст / вид</th>
                        <th>Заявник</th>
                        <th>Головний виконавець</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.items.map((document) => (
                        <tr key={document.id}>
                          <td className="nowrap">
                            {document.registrationNumber}
                          </td>
                          <td className="nowrap">
                            {document.registeredAt
                              .split('-')
                              .reverse()
                              .join('.')}
                          </td>
                          <td className="document-title">
                            <div>{document.title}</div>
                            <small>{document.documentType ?? '—'}</small>
                          </td>
                          <td>{document.applicant ?? '—'}</td>
                          <td>{document.chiefExecutor ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {documents.total === 0 && (
                    <p className="empty">
                      Документів ще немає. Імпортуйте перший журнал вище.
                    </p>
                  )}
                </div>
                <div className="pagination">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Назад
                  </button>
                  <span>
                    {documents.total === 0
                      ? '0'
                      : `${(page - 1) * 25 + 1}–${Math.min(page * 25, documents.total)}`}{' '}
                    з {documents.total}
                  </span>
                  <button
                    disabled={page * 25 >= documents.total}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Далі
                  </button>
                </div>
              </>
            )}
          </section>
          <section id="imports">
            <div className="section-heading">
              <h2>Історія імпортів</h2>
              <span>Останні 20 завантажень</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Файл / дата</th>
                    <th>Рядків</th>
                    <th>Додано</th>
                    <th>Оновлено</th>
                    <th>Без змін</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.fileName}
                        <small>
                          {new Date(item.importedAt).toLocaleString('uk-UA')}
                        </small>
                      </td>
                      <td>{item.totalRows}</td>
                      <td>{item.created}</td>
                      <td>{item.updated}</td>
                      <td>{item.unchanged}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {imports.length === 0 && (
                <p className="empty">
                  Історія з’явиться після першого успішного імпорту.
                </p>
              )}
            </div>
          </section>
          <footer>
            Збережено всі поля журналу. Формування та експорт звітів — наступний
            етап.
          </footer>
        </div>
      </main>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
