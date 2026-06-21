import { Store } from './storage.js';
import { requireLogin, adminLayout } from './admin-common.js';
import { $, todayISO, formatDateBR, money, toast, whatsappLink } from './utils.js';

requireLogin();

adminLayout('whatsapp', `
  <div class="card-title">
    <div>
      <h2 style="margin:0">WhatsApp Business</h2>
      <p class="muted">Mensagens prontas para vender, confirmar, lembrar e recuperar clientes.</p>
    </div>
  </div>

  <section class="grid grid-3">
    <div class="card stat"><div class="stat-icon"><i class="fa-brands fa-whatsapp"></i></div><div><span class="muted small">Clientes</span><br><b id="wTotalClients">0</b></div></div>
    <div class="card stat"><div class="stat-icon"><i class="fa-solid fa-clock"></i></div><div><span class="muted small">Próximos 7 dias</span><br><b id="wNextCount">0</b></div></div>
    <div class="card stat"><div class="stat-icon"><i class="fa-solid fa-hourglass-half"></i></div><div><span class="muted small">Pendentes</span><br><b id="wPendingCount">0</b></div></div>
  </section>

  <section class="card">
    <h3>Configuração rápida</h3>
    <div class="grid grid-2">
      <div class="field"><label>Link do catálogo do WhatsApp</label><input id="catalogUrl" placeholder="Cole aqui o link do catálogo"></div>
      <div class="field"><label>Instagram</label><input id="instagramUrl" placeholder="Link do Instagram"></div>
    </div>
    <button id="saveWhatsappSettings" class="btn btn-primary">Salvar links</button>
  </section>

  <section class="grid grid-2">
    <div class="card">
      <h3>Mensagens prontas</h3>
      <div class="field"><label>Modelo</label><select id="templateType"></select></div>
      <div class="field"><label>Cliente</label><select id="clientSelect"></select></div>
      <div class="field"><label>Agendamento</label><select id="appointmentSelect"></select></div>
      <div class="field"><label>Mensagem</label><textarea id="messageText" rows="8"></textarea></div>
      <div class="btn-row">
        <button id="copyMessage" class="btn btn-light"><i class="fa-solid fa-copy"></i> Copiar</button>
        <a id="openWhatsapp" class="btn btn-success" target="_blank"><i class="fa-brands fa-whatsapp"></i> Abrir WhatsApp</a>
      </div>
    </div>

    <div class="card">
      <h3>Texto para Status</h3>
      <p class="muted">Gera uma chamada com horários livres de uma data para postar no Status do WhatsApp.</p>
      <div class="field"><label>Data</label><input id="statusDate" type="date"></div>
      <div class="field"><label>Texto</label><textarea id="statusText" rows="8"></textarea></div>
      <button id="copyStatus" class="btn btn-primary btn-full"><i class="fa-solid fa-copy"></i> Copiar texto do status</button>
    </div>
  </section>

  <div class="section-title">Ações rápidas</div>
  <section id="quickActions" class="table-list"></section>
`);

const templates = {
  confirmar: {
    label: 'Confirmar horário',
    build: ({ client, ap }) => `Olá, ${client.nome || ap?.clienteNome || 'cliente'}! 💅\n\nSeu horário foi confirmado:\n\n📅 Data: ${formatDateBR(ap?.data)}\n⏰ Horário: ${ap?.hora || ''}\n✨ Serviço: ${ap?.servicoNome || 'Atendimento'}\n💰 Valor: ${money(ap?.valor || 0)}\n\nQualquer imprevisto, me avise com antecedência. Obrigada! 💖`
  },
  lembrete: {
    label: 'Lembrete de horário',
    build: ({ client, ap }) => `Oi, ${client.nome || ap?.clienteNome || 'cliente'}! Passando para lembrar do seu horário em ${formatDateBR(ap?.data)} às ${ap?.hora || ''} para ${ap?.servicoNome || 'atendimento'} 💅\n\nTe espero! 💖`
  },
  pacote: {
    label: 'Confirmar pacote mensal',
    build: ({ client, ap }) => `Olá, ${client.nome || ap?.clienteNome || 'cliente'}! 💅\n\nSeu pacote mensal foi confirmado!\n\nInclui:\n✅ 4 mãos\n✅ 2 pés\n\nSeus horários ficarão organizados na agenda. Obrigada pela preferência! 💖`
  },
  cobranca: {
    label: 'Cobrança pendente',
    build: ({ client, ap }) => `Oi, ${client.nome || ap?.clienteNome || 'cliente'}! Tudo bem? 💖\n\nPassando para lembrar que ficou pendente o pagamento de ${money(ap?.valor || 0)} referente ao atendimento de ${formatDateBR(ap?.data)} às ${ap?.hora || ''}.\n\nQuando conseguir, pode me enviar por aqui. Obrigada! 💅`
  },
  avaliacao: {
    label: 'Pedir avaliação',
    build: ({ client }) => `Oi, ${client.nome || 'cliente'}! 💖\n\nObrigada por fazer as unhas comigo. Se puder, me manda um feedback ou posta uma foto me marcando. Isso ajuda muito meu trabalho 💅✨`
  },
  sumida: {
    label: 'Chamar cliente sumida',
    build: ({ client }) => `Oi, ${client.nome || 'cliente'}! Tudo bem? 💖\n\nFaz um tempinho que você não agenda seu horário. Essa semana ainda tenho alguns horários disponíveis. Quer que eu veja um para você? 💅`
  },
  catalogo: {
    label: 'Enviar catálogo',
    build: ({ client, settings }) => `Oi, ${client.nome || 'cliente'}! 💖\n\nAqui está meu catálogo de serviços/produtos:\n${settings.catalogUrl || 'cole o link do catálogo nas configurações da aba WhatsApp'}\n\nQualquer dúvida me chama por aqui 💅`
  }
};

function digits(value){ return String(value || '').replace(/\D/g, ''); }
function clientId(client){ return client.id || `${client.nome}_${client.telefone}`; }
function getSettings(){ return Store.getSettings().whatsappBusiness || {}; }
function saveSettings(next){ Store.updateSettings({ whatsappBusiness: { ...getSettings(), ...next } }); }
function todayDate(){ return todayISO(); }
function parseDate(date){ return new Date(`${date}T12:00:00`); }
function daysFromToday(date){ return Math.round((parseDate(date) - parseDate(todayDate())) / 86400000); }
function isActive(a){ return ['aguardando_confirmacao','confirmado'].includes(a.statusAgenda); }

function getClients(){ return Store.listClients().filter(c => c.telefone); }
function getAppointments(){ return Store.listAppointments().filter(a => a.clienteTelefone); }
function getSelectedClient(){
  const id = $('#clientSelect').value;
  return getClients().find(c => clientId(c) === id) || {};
}
function getSelectedAppointment(){
  const id = $('#appointmentSelect').value;
  return getAppointments().find(a => a.id === id) || null;
}

function fillSelects(){
  const settings = getSettings();
  $('#catalogUrl').value = settings.catalogUrl || '';
  $('#instagramUrl').value = settings.instagramUrl || '';
  $('#templateType').innerHTML = Object.entries(templates).map(([key, tpl]) => `<option value="${key}">${tpl.label}</option>`).join('');

  const clients = getClients();
  $('#clientSelect').innerHTML = clients.length
    ? clients.map(c => `<option value="${clientId(c)}">${c.nome || 'Sem nome'} - ${c.telefone}</option>`).join('')
    : '<option value="">Nenhum cliente com WhatsApp</option>';

  fillAppointmentSelect();
}

function fillAppointmentSelect(){
  const client = getSelectedClient();
  const phone = digits(client.telefone);
  const appointments = getAppointments().filter(a => digits(a.clienteTelefone) === phone).sort((a,b)=>`${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`));
  $('#appointmentSelect').innerHTML = appointments.length
    ? appointments.map(a => `<option value="${a.id}">${formatDateBR(a.data)} ${a.hora} - ${a.servicoNome || 'Atendimento'} - ${money(a.valor || 0)}</option>`).join('')
    : '<option value="">Sem agendamento</option>';
}

function buildMessage(){
  const type = $('#templateType').value;
  const client = getSelectedClient();
  const ap = getSelectedAppointment();
  const text = templates[type]?.build({ client, ap, settings: getSettings() }) || '';
  $('#messageText').value = text;
  const phone = client.telefone || ap?.clienteTelefone || '';
  $('#openWhatsapp').href = phone ? whatsappLink(phone, text) : '#';
}

function renderStatusText(){
  const date = $('#statusDate').value || todayISO();
  const entries = Store.listDayEntries(date);
  const used = new Set(entries.filter(e => ['aguardando_confirmacao','confirmado','ocupado','folga','bloqueado','concluido'].includes(e.statusAgenda)).map(e => e.hora));
  const settings = Store.getSettings();
  const defaultHours = settings.defaultHours || ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00'];
  const free = defaultHours.filter(h => !used.has(h));
  $('#statusText').value = free.length
    ? `Horários disponíveis para ${formatDateBR(date)} 💅\n\n${free.join('\n')}\n\nChama no WhatsApp para garantir seu horário 💖`
    : `Agenda cheia para ${formatDateBR(date)} 💅\n\nQuer entrar na lista de encaixe? Me chama no WhatsApp 💖`;
}

function renderStats(){
  const appointments = getAppointments();
  const next = appointments.filter(a => isActive(a) && daysFromToday(a.data) >= 0 && daysFromToday(a.data) <= 7);
  const pending = appointments.filter(a => a.statusPagamento === 'pendente' && a.statusAgenda !== 'cancelado');
  $('#wTotalClients').textContent = getClients().length;
  $('#wNextCount').textContent = next.length;
  $('#wPendingCount').textContent = pending.length;
}

function quickCard({ title, description, phone, text, tag }){
  const div = document.createElement('div');
  div.className = 'list-item';
  div.innerHTML = `
    <div>
      <h4>${title}</h4>
      <p>${description}</p>
      ${tag ? `<p class="muted small">Sugestão de etiqueta: ${tag}</p>` : ''}
    </div>
    <div class="btn-row">
      <button class="btn btn-light" data-copy><i class="fa-solid fa-copy"></i> Copiar</button>
      ${phone ? `<a class="btn btn-success" target="_blank" href="${whatsappLink(phone, text)}"><i class="fa-brands fa-whatsapp"></i> Enviar</a>` : ''}
    </div>`;
  div.querySelector('[data-copy]').onclick = async () => {
    await navigator.clipboard.writeText(text);
    toast('Mensagem copiada.');
  };
  return div;
}

function renderQuickActions(){
  const box = $('#quickActions');
  box.innerHTML = '';
  const appointments = getAppointments();
  const next = appointments.filter(a => isActive(a) && daysFromToday(a.data) >= 0 && daysFromToday(a.data) <= 2).slice(0, 4);
  const pending = appointments.filter(a => a.statusPagamento === 'pendente' && a.statusAgenda !== 'cancelado').slice(0, 4);
  const clients = getClients();

  next.forEach(ap => box.appendChild(quickCard({
    title: `Lembrete - ${ap.clienteNome || 'Cliente'}`,
    description: `${formatDateBR(ap.data)} às ${ap.hora} • ${ap.servicoNome || 'Atendimento'}`,
    phone: ap.clienteTelefone,
    text: templates.lembrete.build({ client:{ nome: ap.clienteNome }, ap }),
    tag: 'Confirmado'
  })));

  pending.forEach(ap => box.appendChild(quickCard({
    title: `Cobrança - ${ap.clienteNome || 'Cliente'}`,
    description: `${money(ap.valor || 0)} pendente • ${formatDateBR(ap.data)} às ${ap.hora}`,
    phone: ap.clienteTelefone,
    text: templates.cobranca.build({ client:{ nome: ap.clienteNome }, ap }),
    tag: 'Pagamento pendente'
  })));

  clients.slice(0, 3).forEach(client => box.appendChild(quickCard({
    title: `Recuperar cliente - ${client.nome || 'Cliente'}`,
    description: `${client.telefone} • ${client.totalAgendamentos || 0} agendamento(s)`,
    phone: client.telefone,
    text: templates.sumida.build({ client }),
    tag: 'Cliente sumida'
  })));

  if(!box.children.length) box.innerHTML = '<div class="empty">Sem ações rápidas no momento.</div>';
}

function setup(){
  $('#statusDate').value = todayISO();
  fillSelects();
  renderStats();
  buildMessage();
  renderStatusText();
  renderQuickActions();

  $('#saveWhatsappSettings').onclick = () => {
    saveSettings({ catalogUrl: $('#catalogUrl').value.trim(), instagramUrl: $('#instagramUrl').value.trim() });
    toast('Links salvos.');
    buildMessage();
  };
  $('#templateType').onchange = buildMessage;
  $('#clientSelect').onchange = () => { fillAppointmentSelect(); buildMessage(); };
  $('#appointmentSelect').onchange = buildMessage;
  $('#statusDate').onchange = renderStatusText;
  $('#copyMessage').onclick = async () => { await navigator.clipboard.writeText($('#messageText').value); toast('Mensagem copiada.'); };
  $('#copyStatus').onclick = async () => { await navigator.clipboard.writeText($('#statusText').value); toast('Texto do status copiado.'); };
}

window.addEventListener('db:update', () => {
  fillSelects();
  renderStats();
  buildMessage();
  renderStatusText();
  renderQuickActions();
});

setup();
