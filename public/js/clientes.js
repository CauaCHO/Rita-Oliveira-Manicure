import { Store } from './storage.js';
import { requireLogin, adminLayout } from './admin-common.js';
import { $, formatDateBR, money, whatsappLink } from './utils.js';

requireLogin();

adminLayout('clientes', `<div class="card-title"><div><h2 style="margin:0">Clientes</h2><p class="muted">Clientes separados pelo WhatsApp, mesmo quando possuem nomes iguais.</p></div></div><section id="clientList" class="table-list"></section><div id="modal" class="modal"><div class="modal-content"><div class="card-title"><h3 id="title">Histórico</h3><button id="close" class="btn btn-light"><i class="fa-solid fa-xmark"></i></button></div><div id="history"></div></div></div>`);

function digits(value){ return String(value || '').replace(/\D/g,''); }
function clientKey(nome, telefone){ const tel = digits(telefone); return tel || `nome:${String(nome || '').trim().toLowerCase()}`; }
function isFinancial(a){ return a.statusPagamento !== 'nao_cobrado' && !['cancelado','folga','ocupado'].includes(a.statusAgenda); }

function getClients(){
  const db = Store.all();
  const map = new Map();
  (db.appointments || []).forEach(a => {
    if(!a.clienteNome && !a.clienteTelefone) return;
    const key = clientKey(a.clienteNome, a.clienteTelefone);
    if(!map.has(key)) map.set(key, { nome:a.clienteNome || 'Sem nome', telefone:digits(a.clienteTelefone), appointments:[] });
    const c = map.get(key);
    c.nome = a.clienteNome || c.nome;
    c.telefone = digits(a.clienteTelefone) || c.telefone;
    c.appointments.push(a);
  });
  return Array.from(map.values()).map(c => ({
    ...c,
    totalAgendamentos: c.appointments.length,
    totalGasto: c.appointments.filter(a => ['concluido','confirmado'].includes(a.statusAgenda) && isFinancial(a) && a.statusPagamento === 'pago').reduce((s,a)=>s+Number(a.valor||0),0)
  })).sort((a,b)=>b.totalAgendamentos-a.totalAgendamentos);
}

function render(){
  const box=$('#clientList');
  const clients=getClients();
  box.innerHTML=clients.length?'':'<div class="empty">Nenhuma cliente registrada ainda.</div>';
  clients.forEach((c,i)=>{
    const item=document.createElement('div');
    item.className='list-item';
    const msg=`Olá, ${c.nome}! Tudo bem? 😊`;
    item.innerHTML=`<div><h4>${i+1}. ${c.nome||'Sem nome'}</h4><p>${c.telefone||'Sem WhatsApp'} • ${c.totalAgendamentos} agendamento(s) • ${money(c.totalGasto)}</p></div><div class="btn-row"><button class="btn btn-light">Histórico</button>${c.telefone?`<a class="btn btn-info" target="_blank" href="${whatsappLink(c.telefone,msg)}"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`:''}</div>`;
    item.querySelector('button').onclick=()=>openHistory(c);
    box.appendChild(item);
  });
}

function openHistory(c){
  $('#title').textContent=`Histórico de ${c.nome}${c.telefone ? ' - ' + c.telefone : ''}`;
  const aps=[...c.appointments].sort((a,b)=>`${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`));
  $('#history').innerHTML=aps.length?'':'<div class="empty">Sem histórico.</div>';
  aps.forEach(a=>{$('#history').innerHTML += `<div class="list-item"><div><h4>${formatDateBR(a.data)} às ${a.hora}</h4><p>${a.servicoNome||'Sem serviço'} • ${money(a.valor)} • ${a.statusAgenda} • pagamento: ${a.statusPagamento}</p></div></div>`;});
  $('#modal').classList.add('open');
}

$('#close').onclick=()=>$('#modal').classList.remove('open');
window.addEventListener('db:update', render);
render();
