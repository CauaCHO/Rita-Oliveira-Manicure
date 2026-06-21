import { uid } from './utils.js';

export const PACKAGE_ITEMS = [
  { key: 'mao_1', label: '1ª Mão', kind: 'mao' },
  { key: 'mao_2', label: '2ª Mão', kind: 'mao' },
  { key: 'mao_3', label: '3ª Mão', kind: 'mao' },
  { key: 'mao_4', label: '4ª Mão', kind: 'mao' },
  { key: 'pe_1', label: '1º Pé', kind: 'pe' },
  { key: 'pe_2', label: '2º Pé', kind: 'pe' }
];

function cleanText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isPackageService(service) {
  const name = cleanText(service?.nome);
  return service?.id === 'srv_pacote_mensal' || service?.categoria === 'pacote_mensal' || name.includes('pacote mensal');
}

function weekKey(dateISO) {
  const date = new Date(`${dateISO}T12:00:00`);
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  return start.toISOString().slice(0, 10);
}

export function findPackageService(Store, kind) {
  const services = Store.listServices({ onlyPublic: false }).filter(s => s.ativo !== false && !isPackageService(s));
  const scored = services.map(service => {
    const name = cleanText(service.nome);
    let score = 0;
    if (kind === 'mao') {
      if (name === 'mao') score += 10;
      if (name.includes('mao')) score += 5;
      if (name.includes('pe')) score -= 4;
    }
    if (kind === 'pe') {
      if (name === 'pe') score += 10;
      if (name.includes('pe')) score += 5;
      if (name.includes('mao')) score -= 4;
    }
    return { service, score };
  }).sort((a, b) => b.score - a.score);

  return scored[0]?.score > 0 ? scored[0].service : services[0];
}

export function getPackageSelections(root = document) {
  return PACKAGE_ITEMS.map(item => ({
    ...item,
    data: root.querySelector(`[data-package-date="${item.key}"]`)?.value || '',
    hora: root.querySelector(`[data-package-hour="${item.key}"]`)?.value || ''
  }));
}

export function getPackageValueService(Store) {
  return typeof Store.getPackageService === 'function'
    ? Store.getPackageService()
    : Store.listServices({ onlyPublic: false }).find(isPackageService);
}

export function calculatePackageValue(Store) {
  const packageService = getPackageValueService(Store);
  if (packageService) return Number(packageService.preco || 0);
  const mao = findPackageService(Store, 'mao');
  const pe = findPackageService(Store, 'pe');
  return Number(mao?.preco || 0) * 4 + Number(pe?.preco || 0) * 2;
}

export function validatePackageSelections(Store, selections) {
  const usedDateHour = new Set();
  const usedKindWeek = new Map();

  for (const item of selections) {
    if (!item.data || !item.hora) {
      throw new Error(`Preencha data e horário de ${item.label}.`);
    }

    const slotKey = `${item.data}_${item.hora}`;
    if (usedDateHour.has(slotKey)) {
      throw new Error('Dois itens do pacote não podem ficar no mesmo dia e horário.');
    }
    usedDateHour.add(slotKey);

    if (Store.hasTimeConflict(item.data, item.hora)) {
      throw new Error(`${item.label}: esse horário já foi preenchido.`);
    }

    const typeWeekKey = `${item.kind}_${weekKey(item.data)}`;
    if (usedKindWeek.has(typeWeekKey)) {
      const tipo = item.kind === 'mao' ? 'mãos' : 'pés';
      throw new Error(`Não é permitido marcar 2 ${tipo} na mesma semana.`);
    }
    usedKindWeek.set(typeWeekKey, true);
  }
}

export function savePackageAppointments(Store, {
  clienteNome,
  clienteTelefone,
  observacao = '',
  selections,
  valorPacote = null,
  statusAgenda = 'aguardando_confirmacao',
  statusPagamento = 'pendente',
  origem = 'cliente'
}) {
  validatePackageSelections(Store, selections);

  const pacoteId = uid('pac');
  const total = valorPacote === null || valorPacote === undefined || valorPacote === ''
    ? calculatePackageValue(Store)
    : Number(valorPacote || 0);

  selections.forEach((item, index) => {
    const service = findPackageService(Store, item.kind);
    const first = index === 0;
    const valor = first ? total : 0;
    const pagamento = first ? statusPagamento : 'nao_cobrado';

    Store.saveAppointment({
      data: item.data,
      hora: item.hora,
      clienteNome,
      clienteTelefone,
      servicoId: service?.id || item.kind,
      servicoNome: `${item.label} - ${service?.nome || (item.kind === 'mao' ? 'Mão' : 'Pé')}`,
      valor,
      duracaoMinutos: Number(service?.duracaoMinutos || 60),
      statusAgenda,
      statusPagamento: pagamento,
      valorCobravel: first && pagamento !== 'nao_cobrado',
      observacao: [observacao, 'Pacote mensal: 4 mãos + 2 pés', item.label].filter(Boolean).join(' • '),
      origem,
      pacoteId,
      pacoteGrupo: 'mensal',
      pacoteTipo: item.kind,
      pacoteItem: item.key,
      pacoteLabel: item.label
    });
  });

  return pacoteId;
}
