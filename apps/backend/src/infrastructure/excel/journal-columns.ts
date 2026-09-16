// Headers are ASKOD Excel infrastructure, not domain field names.
export const journalColumns = [
  {
    header: '№ з/п',
    field: 'sourceOrdinal',
    type: 'integer',
  },
  {
    header: '№ документа',
    field: 'registrationNumber',
    type: 'required',
  },
  {
    header: 'Дата реєстрації',
    field: 'registeredAt',
    type: 'requiredDate',
  },
  {
    header: 'Короткий зміст',
    field: 'title',
    type: 'required',
  },
  {
    header: 'Арк.',
    field: 'pageCount',
    type: 'integer',
  },
  {
    header: 'Дод.',
    field: 'attachments',
    type: 'text',
  },
  {
    header: 'Додатки (к-ть арк.)',
    field: 'attachmentPageCount',
    type: 'integer',
  },
  {
    header: 'Дата зняття з контролю',
    field: 'controlRemovedAt',
    type: 'date',
  },
  {
    header: 'Контрольний термін',
    field: 'controlDeadline',
    type: 'date',
  },
  {
    header: 'Термін продовжено',
    field: 'extendedDeadline',
    type: 'text',
  },
  {
    header: 'Примітка',
    field: 'note',
    type: 'text',
  },
  {
    header: 'Том',
    field: 'volume',
    type: 'text',
  },
  {
    header: 'Заявник',
    field: 'applicant',
    type: 'text',
  },
  {
    header: 'Кількість',
    field: 'applicantCount',
    type: 'integer',
  },
  {
    header: 'Адреса заявника',
    field: 'applicantAddress',
    type: 'text',
  },
  {
    header: 'Відділення',
    field: 'branch',
    type: 'text',
  },
  {
    header: 'Вид документа',
    field: 'documentType',
    type: 'text',
  },
  {
    header: 'Номенклатура',
    field: 'nomenclature',
    type: 'text',
  },
  {
    header: 'Контроль',
    field: 'control',
    type: 'text',
  },
  {
    header: 'Головний виконавець',
    field: 'chiefExecutor',
    type: 'text',
  },
  {
    header: 'Особа, яка контролює виконання документа',
    field: 'controller',
    type: 'text',
  },
  {
    header: 'Маршрут',
    field: 'route',
    type: 'text',
  },
  {
    header: 'Стан документа',
    field: 'status',
    type: 'text',
  },
  {
    header: 'Автор РК',
    field: 'cardAuthor',
    type: 'text',
  },
  {
    header: 'Кратність',
    field: 'multiplicity',
    type: 'text',
  },
  {
    header: 'Тип заявника',
    field: 'applicantType',
    type: 'text',
  },
  {
    header: "За суб'єктом",
    field: 'subjectType',
    type: 'text',
  },
  {
    header: 'Розглядає',
    field: 'reviewer',
    type: 'text',
  },
  {
    header: 'Результат розгляду',
    field: 'reviewResult',
    type: 'text',
  },
  {
    header: 'Текст результ. розгляду',
    field: 'reviewResultText',
    type: 'text',
  },
  {
    header: 'Код території',
    field: 'territoryCode',
    type: 'text',
  },
  {
    header: 'Територія',
    field: 'territory',
    type: 'text',
  },
  {
    header: 'Надходження',
    field: 'receivedVia',
    type: 'text',
  },
  {
    header: 'Підрозділ головного виконавця',
    field: 'executorDepartment',
    type: 'text',
  },
  {
    header: 'Підрозділ реєстрації',
    field: 'registrationDepartment',
    type: 'text',
  },
  {
    header: 'Тека',
    field: 'folder',
    type: 'required',
  },
  {
    header: 'Організація',
    field: 'organization',
    type: 'required',
  },
  {
    header: 'Моб. тел.',
    field: 'mobilePhone',
    type: 'text',
  },
  {
    header: 'E-mail',
    field: 'email',
    type: 'text',
  },
  {
    header: 'Назва кореспондента',
    field: 'correspondent',
    type: 'text',
  },
  {
    header: 'Вих. № кор.',
    field: 'correspondentNumber',
    type: 'text',
  },
  {
    header: 'Дата кореспондента',
    field: 'correspondentDate',
    type: 'date',
  },
  {
    header: 'Контр. термін  кореспондента',
    field: 'correspondentDeadline',
    type: 'date',
  },
] as const;
