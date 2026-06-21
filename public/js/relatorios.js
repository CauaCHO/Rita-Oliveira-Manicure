import { Store } from './storage.js';
import { requireLogin, adminLayout } from './admin-common.js';
import { $, todayISO, money, formatDateBR } from './utils.js';

requireLogin();

const monthNow=todayISO().slice(0,7);

adminLayout('relatorios', `<div class="card-title"><div><h2 style="margin:0">Relatórios</h2><p class="muted">Faturamento, pendências, pacotes mensais e clientes separados pelo WhatsApp.</p></div></div><section class="card"><div class="field"><label>Mês</label><input id="month" type="month" value="${monthNow}"></div></section><section id="stats" class="grid grid-3" style="margin-top:14px"></section><section id="packageStats" class="grid grid-3"></section><div class="grid grid-2"><section class="card"><h3>Serviços mais feitos</h3><div id="services"></div></section><section class="card"><h3>Clientes que mais agendam</h3><div id="clients"></div></section></div><section class="card"><h3>Pacotes mensais</h3><div id="packages"></div></section><div class="section-title">Agendamentos do mês</div><section id="appointments" class="table-list"></section>`);

function isFinancial(a){ return a.statusPagamento !== 'nao_cobrado' && !['cancelado','folga','ocupado'].includes(a.statusAgenda); }
function digits(v){ return String(v || '').replace(/\D/g,''); }
function clientLabel(a){ return `${a.clienteNome || 'Sem nome'}${digits(a.clienteTelefone) ? ' - ' + digits(a.clienteTelefone) : ''}`; }
function validAppointment(a){ return !['cancelado','folga','ocupado'].includes(a.statusAgenda); }

function packageGroups(appointments){
  const map = new Map();
  appointments.filter(a => a.pacoteId && validAppointment(a)).forEach(item => {
    if(!map.has(item.pacoteId)) map.set(item.pacoteId, []);
    map.get(item.pacoteId).push(item);
  });
  return Array.from(map.entries()).map(([id, items]) => ({
    id,
    items: items.sort((a,b)=>`${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`)),
    first: items[0],
    total: items.reduce((s,a)=>s+Number(a.valor||0),0),
    paid: items.some(a=>a.statusPagamento === 'pago'),
    pending: items.some(a=>a.statusPagamento === 'pendente')
  }));
}

function render(){
  const month = $('#month').value;
  const appointments = Store.listAppointments({ month });
  const valid = appointments.filter(validAppointment);
  const financial = appointments.filter(isFinancial);
  const received = financial.filter(a => a.statusPagamento === 'pago').reduce((s,a)=>s+Number(a.valor||0),0);
  const pending = financial.filter(a => a.statusPagamento === 'pendente').reduce((s,a)=>s+Number(a.valor||0),0);
  const notCharged = appointments.filter(a => a.statusPagamento === 'nao_cobrado' && validAppointment(a)).length;
  const packages = packageGroups(appointments);
  const packageTotal = packages.reduce((s,p)=>s+p.total,0);
  const packagePaid = packages.filter(p=>p.paid).reduce((s,p)=>s+p.total,0);
  const packagePending = packages.filter(p=>p.pending).reduce((s,p)=>s+p.total,0);
  const packageIncludedItems = valid.filter(a=>a.pacoteId && (a.statusPagamento === 'nao_cobrado' || a.valor === 0)).length;
  const byService = {};
  const byClient = {};
  valid.forEach(a => {
    if (a.servicoNome) byService[a.servicoNome] = (byService[a.servicoNome] || 0) + 1;
    if (a.clienteNome || a.clienteTelefone) byClient[clientLabel(a)] = (byClient[clientLabel(a)] || 0) + 1;
  });
  const services = Object.entries(byService).sort((a,b)=>b[1]-a[1]);
  const clients = Object.entries(byClient).sort((a,b)=>b[1]-a[1]);

  $('#stats').innerHTML=`<div class="card stat"><div class="stat-icon"><i class="fa-solid fa-calendar"></i></div><div><span class="muted small">Agendamentos</span><br><b>${valid.length}</b></div></div><div class="card stat"><div class="stat-icon"><i class="fa-solid fa-sack-dollar"></i></div><div><span class="muted small">Recebido</span><br><b>${money(received)}</b></div></div><div class="card stat"><div class="stat-icon"><i class="fa-solid fa-hourglass-half"></i></div><div><span class="muted small">Pendente</span><br><b>${money(pending)}</b><br><small class="muted">Não cobrados: ${notCharged}</small></div></div>`;
  $('#packageStats').innerHTML=`<div class="card stat"><div class="stat-icon"><i class="fa-solid fa-box"></i></div><div><span class="muted small">Pacotes vendidos</span><br><b>${packages.length}</b></div></div><div class="card stat"><div class="stat-icon"><i class="fa-solid fa-money-check-dollar"></i></div><div><span class="muted small">Total em pacotes</span><br><b>${money(packageTotal)}</b><br><small class="muted">Pago: ${money(packagePaid)} • Pendente: ${money(packagePending)}</small></div></div><div class="card stat"><div class="stat-icon"><i class="fa-solid fa-hand-sparkles"></i></div><div><span class="muted small">Inclusos em pacote</span><br><b>${packageIncludedItems}</b></div></div>`;
  $('#services').innerHTML=services.length?'':'<p class="muted">Sem dados.</p>';
  services.forEach(([n,q])=>$('#services').innerHTML+=`<div class="list-item"><div><h4>${n}</h4><p>${q} vez(es)</p></div></div>`);
  $('#clients').innerHTML=clients.length?'':'<p class="muted">Sem dados.</p>';
  clients.forEach(([n,q])=>$('#clients').innerHTML+=`<div class="list-item"><div><h4>${n}</h4><p>${q} agendamento(s)</p></div></div>`);
  $('#packages').innerHTML=packages.length?'':'<p class="muted">Nenhum pacote neste mês.</p>';
  packages.forEach(pkg=>{
    const details = pkg.items.map(i=>`${i.pacoteLabel || i.servicoNome}: ${formatDateBR(i.data)} às ${i.hora}`).join('<br>');
    $('#packages').innerHTML+=`<div class="list-item"><div><h4>${clientLabel(pkg.first)} - ${money(pkg.total)}</h4><p>${pkg.items.length} item(ns) no pacote</p><p class="muted small">${details}</p></div></div>`;
  });
  $('#appointments').innerHTML=appointments.length?'':'<div class="empty">Nenhum agendamento neste mês.</div>';
  appointments.forEach(a=>$('#appointments').innerHTML+=`<div class="list-item"><div><h4>${formatDateBR(a.data)} às ${a.hora} - ${clientLabel(a)}</h4><p>${a.servicoNome||'Sem serviço'} • ${money(a.valor)} • ${a.statusAgenda} • pagamento: ${a.statusPagamento}${a.pacoteId ? ' • pacote mensal' : ''}</p></div></div>`);
}

$('#month').onchange=render;
window.addEventListener('db:update', render);
render();
