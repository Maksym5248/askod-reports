// Approved initial ASKOD vocabulary. Expand deliberately; never learn values during import.
export const documentEnums = {
  documentType: ['Скарга', 'Інше', 'Заява (клопотання)', 'Звернення громадян'],
  route: ['Звернення громадян', 'Попередній розгляд (Новий)'],
  status: ['Чернетка'],
  multiplicity: ['Первинне', 'Дублетне', 'Неодноразове', 'Повторне', 'Масове'],
  applicantType: ['Усне', 'Лист', 'Електронне'],
  subjectType: ['Індивідуальне', 'Колективне', 'Урядовий контактний центр'],
  receivedVia: [
    'За допомогою засобів телефонного звязку',
    'АСКОД',
    'Поштою/електронною поштою',
    'Нарочно',
    'Через органи влади',
    'Через уповноважену особу',
    'СЕВ ОВВ',
    'Від інших органів, установ, організацій',
  ],
  folder: ['Звернення громадян'],
} as const;
export type DocumentEnumField = keyof typeof documentEnums;
export type DocumentEnumValue<K extends DocumentEnumField> =
  (typeof documentEnums)[K][number];
export function readDocumentEnum<K extends DocumentEnumField>(
  field: K,
  value: string,
): DocumentEnumValue<K> {
  if (!(documentEnums[field] as readonly string[]).includes(value))
    throw new Error(`Unknown stored enum: ${field}`);
  return value as DocumentEnumValue<K>;
}
