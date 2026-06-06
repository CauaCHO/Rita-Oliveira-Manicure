import { uid, todayISO } from './utils.js';
import { db as firebaseDb, ref, set, onValue } from './firebase.js';

const KEY = 'agenda_manicure_db_v1';
const FIREBASE_PATH = 'app';

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
    { id: 'srv_alongamento', nome: 'Alongamento', preco: 120, duracaoMinutos: 120, descricao: 'Alongamento de unhas', categoria: 'servico', ativo: true, publico: true }
  ],
  appointments: [],
  clients: []
};

let cache = null;
let syncingFromFirebase = false;

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function normalize(db) {
  return {
    settings: { ...seed.settings, ...(db?.settings || {}) },
    services: Array.isArray(db?.services) ? db.services : clone(seed.services),
    appointments: Array.isArray(db?.appointments) ? db.appointments : [],
    clients: Array.isArray(db?.clients) ? db.clients : []
  };
}

function loadLocal() {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const initial = clone(seed);
    localStorage.setItem(KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return clone(seed);
  }
}

function persistLocal(db) {
  cache = normalize(db);
  localStorage.setItem(KEY, JSON.stringify(cache));
  window.dispatchEvent(new CustomEvent('db:update'));
}

async function persistFirebase(db) {
  if (syncingFromFirebase) return;
  try {
    await set(ref(firebaseDb, FIREBASE_PATH), normalize(db));
  } catch (error) {
    console.error('Erro ao salvar no Firebase:', error);
  }
}

function load() {
  if (!cache) cache = loadLocal();
  return clone(cache);
}

function save(nextDb) {
  const normalized = normalize(nextDb);
  persistLocal(normalized);
  persistFirebase(normalized);
}

function startFirebaseSync() {
  const appRef = ref(firebaseDb, FIREBASE_PATH);
  onValue(appRef, (snapshot) => {
    syncingFromFirebase = true;
    if (snapshot.exists()) {
      persistLocal(snapshot.val());
    } else {
      const local = loadLocal();
      set(appRef, normalize(local)).catch((error) => console.error('Erro ao criar base no Firebase:', error));
    }
    syncingFromFirebase = false;
  }, (error) => {
    console.error('Erro ao ler Firebase:', error);
  });
}

startFirebaseSync();

export const Store = {
  all() { return load(); },
  resetDemo() { save(clone(seed)); },
  getSettings() { return load().settings; },
  updateSettings(settings) {
    const db = load();
    db.settings = { ...db.settings, ...settings };
    save(db);
  },
  listServices({ onlyPublic = false } = {}) {
    let services = load().services || [];
    if (onlyPublic) services = services.filter(s => s.ativo && s.publico);
    return services.sort((a,b) => String(a.nome).localeCompare(String(b.nome)));
  },
  getService(id) { return (load().services || []).find(s => s.id === id); },
  saveService(data) {
    const db = load();
    if (data.id) {
      db.services = db.services.map(s => s.id === data.id ? { ...s, ...data } : s);
    } else {
      db.services.push({ ...data, id: uid('srv'), ativo: true, publico: true });
    }
    save(db);
  },
  deleteService(id) {
    const db = load();
    db.services = db.services.filter(s => s.id !== id);
    save(db);
  },
  listAppointments(filters = {}) {
    let items = load().appointments || [];
    if (filters.date) items = items.filter(a => a.data === filters.date);
    if (filters.month) items = items.filter(a => a.data?.startsWith(filters.month));
    return items.sort((a,b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`));
  },
  getAppointment(id) { return (load().appointments || []).find(a => a.id === id); },
  hasTimeConflict(date, time, ignoreId = null) {
    return (load().appointments || []).some(a => (
      a.id !== ignoreId &&
      a.data === date &&
      a.hora === time &&
      ['aguardando_confirmacao','confirmado','ocupado','folga'].includes(a.statusAgenda)
    ));
  },
  saveAppointment(data) {
    const db = load();
    const current = data.id ? db.appointments.find(a => a.id === data.id) : null;
    const next = { ...current, ...data };
    if (!next.id) next.id = uid('ag');
    if (!next.criadoEm) next.criadoEm = new Date().toISOString();

    if (this.hasTimeConflict(next.data, next.hora, next.id)) {
      throw new Error('Horário indisponível');
    }

    if (current) db.appointments = db.appointments.map(a => a.id === next.id ? next : a);
    else db.appointments.push(next);

    if (next.clienteTelefone || next.clienteNome) {
      const tel = String(next.clienteTelefone || '').replace(/\D/g, '');
      const existing = db.clients.find(c => c.telefone === tel && tel);
      if (existing) {
        existing.nome = next.clienteNome || existing.nome;
        existing.ultimoAtendimento = next.data;
      } else {
        db.clients.push({ id: uid('cli'), nome: next.clienteNome, telefone: tel, criadoEm: new Date().toISOString(), ultimoAtendimento: next.data });
      }
    }
    save(db);
    return next;
  },
  updateAppointment(id, patch) {
    const ap = this.getAppointment(id);
    if (!ap) return;
    return this.saveAppointment({ ...ap, ...patch, id });
  },
  deleteAppointment(id) {
    const db = load();
    db.appointments = db.appointments.filter(a => a.id !== id);
    save(db);
  },
  listClients() {
    const db = load();
    return (db.clients || []).map(c => {
      const ags = (db.appointments || []).filter(a => String(a.clienteTelefone || '').replace(/\D/g,'') === c.telefone || a.clienteNome === c.nome);
      return { ...c, totalAgendamentos: ags.length, totalGasto: ags.filter(a => ['concluido','confirmado'].includes(a.statusAgenda)).reduce((s,a)=>s+Number(a.valor||0),0) };
    }).sort((a,b)=>b.totalAgendamentos-a.totalAgendamentos);
  },
  listClientAppointments(client) {
    const tel = String(client.telefone || '').replace(/\D/g,'');
    return (load().appointments || []).filter(a => String(a.clienteTelefone || '').replace(/\D/g,'') === tel || a.clienteNome === client.nome);
  },
  monthlyReport(month = todayISO().slice(0,7)) {
    const appointments = this.listAppointments({ month });
    const valid = appointments.filter(a => !['cancelado','folga','ocupado'].includes(a.statusAgenda));
    const received = appointments.filter(a => a.statusPagamento === 'pago').reduce((s,a)=>s+Number(a.valor||0),0);
    const pending = appointments.filter(a => a.statusPagamento === 'pendente' && !['cancelado','folga','ocupado'].includes(a.statusAgenda)).reduce((s,a)=>s+Number(a.valor||0),0);
    const concluded = appointments.filter(a => a.statusAgenda === 'concluido');
    const byService = {};
    const byClient = {};
    valid.forEach(a => {
      if (a.servicoNome) byService[a.servicoNome] = (byService[a.servicoNome] || 0) + 1;
      if (a.clienteNome) byClient[a.clienteNome] = (byClient[a.clienteNome] || 0) + 1;
    });
    return {
      month,
      totalAppointments: valid.length,
      concluded: concluded.length,
      received,
      pending,
      byService: Object.entries(byService).sort((a,b)=>b[1]-a[1]),
      byClient: Object.entries(byClient).sort((a,b)=>b[1]-a[1]),
      appointments
    };
  }
};
