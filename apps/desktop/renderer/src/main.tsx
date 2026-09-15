import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getWorkspaceStatus } from './api';
import './styles.css';

function App() {
  const [count, setCount] = useState<number>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    setCount(undefined);
    getWorkspaceStatus(controller.signal)
      .then((data) => setCount(data.documentCount))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [attempt]);
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          А<span>ASKOD Звіти</span>
        </div>
        <div className="section">РОБОЧИЙ ПРОСТІР</div>
        <nav aria-label="Головна навігація">
          <a href="#" aria-current="page">
            Огляд
          </a>
        </nav>
        <p className="aside-note">
          Локальний робочий простір
          <br />
          Версія 0.1 · Початковий запуск
        </p>
      </aside>
      <main>
        <header>
          <span>Робочий простір / Огляд</span>
          <span className="badge">На цьому пристрої</span>
        </header>
        <div className="content">
          <p className="eyebrow">ОГЛЯД</p>
          <h1>Ваші дані. Зрозумілі звіти.</h1>
          <p className="lead">
            Робочий простір для документів, експортованих з АСКОД.
          </p>
          <section className="status" aria-live="polite">
            <span
              className={`dot ${failed ? 'error' : count === undefined ? 'pending' : ''}`}
            />
            <div>
              <h2>
                {failed
                  ? 'Немає з’єднання'
                  : count === undefined
                    ? 'Підключення до сховища…'
                    : 'Робочий простір готовий'}
              </h2>
              <p>
                {failed
                  ? 'Не вдалося отримати дані. Перевірте підключення та повторіть спробу.'
                  : count === undefined
                    ? 'Перевіряємо доступність ваших даних.'
                    : `Документів у сховищі: ${count}.`}
              </p>
            </div>
            {failed && (
              <button onClick={() => setAttempt((n) => n + 1)}>
                Спробувати ще раз
              </button>
            )}
          </section>
          <h2 className="next-title">Наступні можливості</h2>
          <div className="cards">
            {[
              [
                '01',
                'Імпорт з Excel',
                'Завантажуйте експорт АСКОД для перевірки й збереження документів.',
              ],
              [
                '02',
                'Перегляд документів',
                'Знаходьте потрібні документи за допомогою пошуку та фільтрів.',
              ],
              [
                '03',
                'Готові звіти',
                'Формуйте визначені звіти та експортуйте результати в Excel.',
              ],
            ].map(([number, title, description]) => (
              <article key={number}>
                <span className="number">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="soon">Заплановано</span>
              </article>
            ))}
          </div>
          <footer>
            Це базова версія застосунку. Імпорт і формування звітів будуть
            доступні в наступних оновленнях.
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
