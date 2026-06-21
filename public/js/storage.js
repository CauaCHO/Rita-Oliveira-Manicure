import { uid, todayISO } from './utils.js';
import { db as firebaseDb, ref, set, onValue } from './firebase.js';

const KEY = 'agenda_manicure_db_v1';
const FIREBASE_PATH = 'app';

const PACKAGE_SERVICE = { id: 'srv_pacote_mensal', nome: 'Pacote mensal', preco: 210, duracaoMinutos: 0, descricao: 'Pacote com 4 mãos e 2 pés', categoria: 'pacote_mensal', ativo: true, publico: false };

const seed = {
  settings: {
    businessName: 'Studio Nails',
    subtitle: 'Agende seu horário de forma simples',
    ownerWhatsapp: '',
    adminPassword: '1234'
  },
  services: [
    { id: 'srv_mao', nome: 'Mão', preco: 25, duracaoMinutos: 60, descricao: 'Esmaltação simples', categoria: 'servico', ativo: true, publico: true },
    { id: 'srv_pe', nome: 'Pé', preco: 30, duracaoMinutos: 60, descricao: 'Cuidado e esmaltação dos pés', categoria: 'servico', ativo: true, publico: true },
    { id: 'srv_pe_mao', nome: 'Pé e mão', preco: 50, duracaoMinutos: 60, descricao: 'Combo completo', categoria: 'combo', ativo: true, publico: true },
    { id: 'srv_alongamento', nome: 'Alongamento', preco: 120, duracaoMinutos: 120, descricao: 'Alongamento de unhas', categoria: 'servico', ativo: true, publico: true },
    PACKAGE_SERVICE
  ],
  appointments: [],
  blocks: [],
  clients: []
};

let cache = null;
let syncingFromFirebase = false;

function clone(data) { return JSON.parse(JSON.stringify(data)); }
function phone(value) { return String(value || '').replace(/\D/g, ''); }
function isBlockStatus(status) { return ['folga','ocupado','bloqueado'].includes(status); }
function isRealAppointment(a) { return !isBlockStatus(a?.statusAgenda); }
function isMoneyAppointment(a) { return isRealAppointment(a) && a?.statusPagamento !== 'nao_cobrado' && a?.valorCobravel !== false && a?.statusAgenda !== 'cancelado'; }
function clientKey(nome, telefone) { const tel = phone(telefone); return tel || `nome:${String(nome || '').trim().toLowerCase()}`; }
function isPackageService(s) { return s?.id === PACKAGE_SERVICE.id || s?.categoria === 'pacote_mensal' || String(s?.nome || '').toLowerCase().includes('pacote mensal'); }

function normalizeServices(services) {
  const list = Array.isArray(services) ? services : clone(seed.services);
  const hasPackage = list.some(isPackageService);
  return hasPackage ? list : [...list, clone(PACKAGE_SERVICE)];
}

function normalizeBlock(b) {
  return {
    id: b.id || uid('blk'),
    data: b.data,
    hora: b.hora,
    tipo: b.tipo || b.statusAgenda || 'folga',
    statusAgenda: b.statusAgenda || b.tipo || 'folga',
    servicoNome: b.servicoNome || 'Bloqueio',
    observacao: b.observacao || '',
    origem: b.origem || 'admin',
    criadoEm: b.criadoEm || new Date().toISOString(),
    valor: 0,
    statusPagamento: 'nao_cobrado',
    valorCobravel: false
  };
}

function normalize(db) {
  const rawAppointments = Array.isArray(db?.appointments) ? db.appointments : [];
  const rawBlocks = Array.isArray(db?.blocks) ? db.blocks : [];
  const appointments = [];
  const blocks = rawBlocks.map(normalizeBlock);

  rawAppointments.forEach(item => {
    const a = { ...item, clienteTelefone: phone(item?.clienteTelefone || '') };
    if (isBlockStatus(a.statusAgenda)) {
      blocks.push(normalizeBlock({
        id: String(a.id || uid('legacy')).startsWith('blk_') ? a.id : `blk_${a.id || uid('legacy')}`,
        data: a.data,
        hora: a.hora,
        tipo: a.statusAgenda,
        statusAgenda: a.statusAgenda,
        servicoNome: a.servicoNome || (a.statusAgenda === 'folga' ? 'Folga' : 'Bloqueio'),
        observacao: a.observacao || '',
        origem: a.origem || 'admin',
        criadoEm: a.criadoEm
      }));
    } else {
      appointments.push(a);
    }
  });

  return {
    settings: { ...seed.settings, ...(db?.settings || {}) },
    services: normalizeServices(db?.services),
    appointments,
    blocks,
    clients: Array.isArray(db?.clients) ? db.clients.map(c => ({ ...c, telefone: phone(c.telefone || '') })) : []
  };
}

function loadLocal() {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const initial = clone(seed);
    localStorage.setItem(KEY, JSON.stringify(initial));
    return initial;
  }
  try { return normalize(JSON.parse(raw)); } catch { return clone(seed); }
}

function persistLocal(db) {
  cache = normalize(db);
  localStorage.setItem(KEY, JSON.stringify(cache));
  window.dispatchEvent(new CustomEvent('db:update'));
}

async function persistFirebase(db) {
  if (syncingFromFirebase) return;
  try { await set(ref(firebaseDb, FIREBASE_PATH), normalize(db)); }
  catch (error) { console.error('Erro ao salvar no Firebase:', error); }
}

function load() { if (!cache) cache = loadLocal(); return clone(cache); }
function save(nextDb) { const normalized = normalize(nextDb); persistLocal(normalized); persistFirebase(normalized); }

function startFirebaseSync() {
  const appRef = ref(firebaseDb, FIREBASE_PATH);
  onValue(appRef, (snapshot) => {
    syncingFromFirebase = true;
    if (snapshot.exists()) persistLocal(snapshot.val());
    else set(appRef, normalize(loadLocal())).catch((error) => console.error('Erro ao criar base no Firebase:', error));
    syncingFromFirebase = false;
  }, (error) => console.error('Erro ao ler Firebase:', error));
}

startFirebaseSync();

export const Store = {
  all() { return load(); },
  resetDemo() { save(clone(seed)); },
  getSettings() { return load().settings; },
  updateSettings(settings) { const db = load(); db.settings = { ...db.settings, ...settings }; save(db); },
  listServices({ onlyPublic = false } = {}) {
    let services = load().services || [];
    if (onlyPublic) services = services.filter(s => s.ativo && s.publico && !isPackageService(s));
    return services.sort((a,b) => String(a.nome).localeCompare(String(b.nome)));
  },
  getService(id) { return (load().services || []).find(s => s.id === id); },
  getPackageService() { return (load().services || []).find(isPackageService) || PACKAGE_SERVICE; },
  saveService(data) {
    const db = load();
    const next = { ...data };
    const exists = next.id ? db.services.some(s => s.id === next.id) : false;
    if (next.id && exists) db.services = db.services.map(s => s.id === next.id ? { ...s, ...next } : s);
    else db.services.push({ ...next, id: next.id || uid('srv'), ativo: next.ativo !== false, publico: !!next.publico });
    save(db);
  },
  deleteService(id) { const db = load(); db.services = db.services.filter(s => s.id !== id && s.id !== PACKAGE_SERVICE.id); save(db); },
  listAppointments(filters = {}) {
    let items = (load().appointments || []).filter(isRealAppointment);
    if (filters.date) items = items.filter(a => a.data === filters.date);
    if (filters.month) items = items.filter(a => a.data?.startsWith(filters.month));
    if (filters.statusAgenda) items = items.filter(a => a.statusAgenda === filters.statusAgenda);
    return items.sort((a,b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`));
  },
  listRequests() { return this.listAppointments({ statusAgenda: 'aguardando_confirmacao' }); },
  listBlocks(filters = {}) {
    let items = load().blocks || [];
    if (filters.date) items = items.filter(b => b.data === filters.date);
    if (filters.month) items = items.filter(b => b.data?.startsWith(filters.month));
    return items.sort((a,b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`));
  },
  listDayEntries(date) {
    return [
      ...this.listAppointments({ date }).map(a => ({ ...a, itemKind: 'appointment' })),
      ...this.listBlocks({ date }).map(b => ({ ...b, itemKind: 'block' }))
    ].sort((a,b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`));
  },
  getAppointment(id) { return (load().appointments || []).find(a => a.id === id); },
  getBlock(id) { return (load().blocks || []).find(b => b.id === id); },
  hasTimeConflict(date, time, ignoreId = null) {
    const db = load();
    const ap = (db.appointments || []).some(a => a.id !== ignoreId && a.data === date && a.hora === time && ['aguardando_confirmacao','confirmado','concluido'].includes(a.statusAgenda));
    const bl = (db.blocks || []).some(b => b.id !== ignoreId && b.data === date && b.hora === time && isBlockStatus(b.statusAgenda || b.tipo));
    return ap || bl;
  },
  saveAppointment(data) {
    const db = load();
    const current = data.id ? db.appointments.find(a => a.id === data.id) : null;
    const next = { ...current, ...data, clienteTelefone: phone(data.clienteTelefone || current?.clienteTelefone || '') };
    if (!next.id) next.id = uid('ag');
    if (!next.criadoEm) next.criadoEm = new Date().toISOString();
    if (!isRealAppointment(next)) throw new Error('Use a função de bloqueio/folga para bloquear horários.');
    if (this.hasTimeConflict(next.data, next.hora, next.id)) throw new Error('Horário indisponível');
    if (current) db.appointments = db.appointments.map(a => a.id === next.id ? next : a);
    else db.appointments.push(next);
    if (next.clienteTelefone || next.clienteNome) {
      const key = clientKey(next.clienteNome, next.clienteTelefone);
      const existing = db.clients.find(c => clientKey(c.nome, c.telefone) === key);
      if (existing) { existing.nome = next.clienteNome || existing.nome; existing.telefone = next.clienteTelefone || existing.telefone; existing.ultimoAtendimento = next.data; }
      else db.clients.push({ id: uid('cli'), nome: next.clienteNome, telefone: next.clienteTelefone, criadoEm: new Date().toISOString(), ultimoAtendimento: next.data });
    }
    save(db);
    return next;
  },
  updateAppointment(id, patch) { const ap = this.getAppointment(id); if (!ap) return; return this.saveAppointment({ ...ap, ...patch, id }); },
  deleteAppointment(id) { const db = load(); db.appointments = db.appointments.filter(a => a.id !== id); save(db); },
  saveBlock(data) {
    const db = load();
    const current = data.id ? db.blocks.find(b => b.id === data.id) : null;
    const next = normalizeBlock({ ...current, ...data });
    if (this.hasTimeConflict(next.data, next.hora, next.id)) throw new Error('Horário indisponível');
    if (current) db.blocks = db.blocks.map(b => b.id === next.id ? next : b);
    else db.blocks.push(next);
    save(db);
    return next;
  },
  deleteBlock(id) { const db = load(); db.blocks = db.blocks.filter(b => b.id !== id); save(db); },
  listClients() {
    const db = load();
    return (db.clients || []).map(c => {
      const key = clientKey(c.nome, c.telefone);
      const ags = (db.appointments || []).filter(a => isRealAppointment(a) && clientKey(a.clienteNome, a.clienteTelefone) === key);
      return { ...c, totalAgendamentos: ags.length, totalGasto: ags.filter(a => ['concluido','confirmado'].includes(a.statusAgenda) && isMoneyAppointment(a) && a.statusPagamento === 'pago').reduce((s,a)=>s+Number(a.valor||0),0) };
    }).sort((a,b)=>b.totalAgendamentos-a.totalAgendamentos);
  },
  listClientAppointments(client) {
    const key = clientKey(client.nome, client.telefone);
    return (load().appointments || []).filter(a => isRealAppointment(a) && clientKey(a.clienteNome, a.clienteTelefone) === key);
  },
  monthlyReport(month = todayISO().slice(0,7)) {
    const appointments = this.listAppointments({ month });
    const valid = appointments.filter(a => a.statusAgenda !== 'cancelado');
    const received = valid.filter(a => isMoneyAppointment(a) && a.statusPagamento === 'pago').reduce((s,a)=>s+Number(a.valor||0),0);
    const pending = valid.filter(a => isMoneyAppointment(a) && a.statusPagamento === 'pendente').reduce((s,a)=>s+Number(a.valor||0),0);
    const notCharged = valid.filter(a => a.statusPagamento === 'nao_cobrado' || a.valorCobravel === false).length;
    const concluded = appointments.filter(a => a.statusAgenda === 'concluido');
    const byService = {};
    const byClient = {};
    valid.forEach(a => {
      if (a.servicoNome) byService[a.servicoNome] = (byService[a.servicoNome] || 0) + 1;
      const label = `${a.clienteNome || 'Sem nome'}${a.clienteTelefone ? ' - ' + a.clienteTelefone : ''}`;
      if (a.clienteNome || a.clienteTelefone) byClient[label] = (byClient[label] || 0) + 1;
    });
    return { month, totalAppointments: valid.length, concluded: concluded.length, received, pending, notCharged, byService: Object.entries(byService).sort((a,b)=>b[1]-a[1]), byClient: Object.entries(byClient).sort((a,b)=>b[1]-a[1]), appointments };
  }
};
