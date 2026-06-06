import { Store } from './storage.js';
import { requireLogin, adminLayout } from './admin-common.js';
import { $, todayISO, formatDateBR, money, statusLabel, toast, HOURS, whatsappLink } from './utils.js';

requireLogin();
adminLayout('agenda', `
  <div class="card-title"><div><h2 style="margin:0">Agenda</h2><p class="muted">Confirme horários, bloqueie folgas e cadastre clientes na hora.</p></div><button id="manualBtn" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Adicionar</button></div>
  <section class="grid grid-3" id="stats"></section>
  <div class="section-title">Data</div><section class="card"><input id="dateInput" type="date"></section>
  <div class="section-title">Horários do dia</div><section id="agendaList" class="table-list"></section>
  <div id="modal" class="modal"><div class="modal-content"><div class="card-title"><h3 id="modalTitle">Adicionar horário</h3><button id="closeModal" class="btn btn-light"><i class="fa-solid fa-xmark"></i></button></div><div class="grid grid-2"><div class="field"><label>Data</label><input id="mData" type="date"></div><div class="field"><label>Hora</label><select id="mHora"></select></div></div><div class="grid grid-2"><div class="field"><label>Nome da cliente</label><input id="mNome" placeholder="Maria"></div><div class="field"><label>WhatsApp</label><input id="mTel" placeholder="17999999999"></div></div><div class="field"><label>Serviço</label><select id="mServico"></select></div><div class="grid grid-2"><div class="field"><label>Status da agenda</label><select id="mStatus"><option value="confirmado">Confirmado</option><option value="aguardando_confirmacao">Aguardando confirmação</option><option value="ocupado">Ocupado</option><option value="folga">Folga</option><option value="concluido">Concluído</option></select></div><div class="field"><label>Pagamento</label><select id="mPagamento"><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="nao_cobrado">Não cobrado</option></select></div></div><div class="field"><label>Observação</label><textarea id="mObs"></textarea></div><button id="saveManual" class="btn btn-primary btn-full">Salvar</button></div></div>
`);

let selectedDate = todayISO();
let editId = null;
$('#dateInput').value = selectedDate;

function fillSelects(){
  $('#mHora').innerHTML = HOURS.map(h=>`<option value="${h}">${h}</option>`).join('');
  const services = Store.listServices();
  $('#mServico').innerHTML = '<option value="">Sem serviço</option>' + services.map(s=>`<option value="${s.id}">${s.nome} - ${money(s.preco)}</option>`).join('');
}

function renderStats(){
  const aps = Store.listAppointments({date:selectedDate});
  const received = aps.filter(a=>a.statusPagamento==='pago').reduce((s,a)=>s+Number(a.valor||0),0);
  const pending = aps.filter(a=>a.statusPagamento==='pendente' && !['cancelado','folga','ocupado'].includes(a.statusAgenda)).reduce((s,a)=>s+Number(a.valor||0),0);
  $('#stats').innerHTML = `
  <div class="card stat"><div class="stat-icon"><i class="fa-solid fa-calendar-check"></i></div><div><span class="muted small">Atendimentos</span><br><b>${aps.filter(a=>!['folga','ocupado','cancelado'].includes(a.statusAgenda)).length}</b></div></div>
  <div class="card stat"><div class="stat-icon"><i class="fa-solid fa-money-bill-wave"></i></div><div><span class="muted small">Recebido</span><br><b>${money(received)}</b></div></div>
  <div class="card stat"><div class="stat-icon"><i class="fa-solid fa-clock"></i></div><div><span class="muted small">Pendente</span><br><b>${money(pending)}</b></div></div>`;
}

function renderAgenda(){
  selectedDate = $('#dateInput').value;
  renderStats();
  const aps = Store.listAppointments({date:selectedDate});
  const box = $('#agendaList');
  box.innerHTML = '';
  HOURS.forEach(hour=>{
    const ap = aps.find(a=>a.hora===hour && ['aguardando_confirmacao','confirmado','ocupado','folga','concluido'].includes(a.statusAgenda));
    const item = document.createElement('div');
    item.className='list-item';
    if(!ap){
      item.innerHTML = `<div><h4>${hour} - Livre</h4><p>Sem agendamento nesse horário</p></div><button class="btn btn-light"><i class="fa-solid fa-plus"></i> Preencher</button>`;
      item.querySelector('button').onclick = () => openModal({data:selectedDate,hora:hour,statusAgenda:'confirmado'});
    } else {
      const waConfirm = `Olá, ${ap.clienteNome || ''}! Seu horário para ${ap.servicoNome || 'atendimento'} no dia ${formatDateBR(ap.data)} às ${ap.hora} foi confirmado. Valor: ${money(ap.valor)} 😊`;
      const waReminder = `Oi, ${ap.clienteNome || ''}! Passando para lembrar do seu horário no dia ${formatDateBR(ap.data)} às ${ap.hora} para ${ap.servicoNome || 'atendimento'}. 😊`;
      item.innerHTML = `<div><h4>${hour} - ${ap.clienteNome || statusLabel(ap.statusAgenda)}</h4><p>${ap.servicoNome || ap.observacao || 'Sem serviço'} • ${money(ap.valor)} • <span class="status ${ap.statusAgenda}">${statusLabel(ap.statusAgenda)}</span></p></div><div class="btn-row">
        ${ap.statusAgenda==='aguardando_confirmacao'?'<button data-act="confirm" class="btn btn-success">Confirmar</button>':''}
        ${ap.clienteTelefone?`<a class="btn btn-info" target="_blank" href="${whatsappLink(ap.clienteTelefone, waConfirm)}"><i class="fa-brands fa-whatsapp"></i> Confirmar</a><a class="btn btn-light" target="_blank" href="${whatsappLink(ap.clienteTelefone, waReminder)}">Lembrete</a>`:''}
        <button data-act="edit" class="btn btn-light">Editar</button><button data-act="done" class="btn btn-success">Concluir</button><button data-act="del" class="btn btn-danger">Excluir</button></div>`;
      const c = item.querySelector('[data-act="confirm"]'); if(c)c.onclick=()=>{Store.updateAppointment(ap.id,{statusAgenda:'confirmado'}); toast('Agendamento confirmado.'); renderAgenda();};
      item.querySelector('[data-act="edit"]').onclick=()=>openModal(ap);
      item.querySelector('[data-act="done"]').onclick=()=>{Store.updateAppointment(ap.id,{statusAgenda:'concluido',statusPagamento:'pago'}); toast('Atendimento concluído.'); renderAgenda();};
      item.querySelector('[data-act="del"]').onclick=()=>{if(confirm('Excluir esse registro?')){Store.deleteAppointment(ap.id); renderAgenda();}};
    }
    box.appendChild(item);
  });
}

function openModal(ap={}){
  fillSelects(); editId = ap.id || null;
  $('#mData').value = ap.data || selectedDate;
  $('#mHora').value = ap.hora || HOURS[0];
  $('#mNome').value = ap.clienteNome || '';
  $('#mTel').value = ap.clienteTelefone || '';
  $('#mServico').value = ap.servicoId || '';
  $('#mStatus').value = ap.statusAgenda || 'confirmado';
  $('#mPagamento').value = ap.statusPagamento || 'pendente';
  $('#mObs').value = ap.observacao || '';
  $('#modal').classList.add('open');
}

$('#manualBtn').onclick=()=>openModal({data:selectedDate,statusAgenda:'confirmado'});
$('#closeModal').onclick=()=>$('#modal').classList.remove('open');
$('#dateInput').onchange=renderAgenda;
$('#saveManual').onclick=()=>{
  const service = Store.getService($('#mServico').value);
  const status = $('#mStatus').value;
  try{Store.saveAppointment({id:editId,data:$('#mData').value,hora:$('#mHora').value,clienteNome:$('#mNome').value.trim(),clienteTelefone:$('#mTel').value.trim(),servicoId:service?.id||'',servicoNome:service?.nome||'',valor:Number(service?.preco||0),duracaoMinutos:Number(service?.duracaoMinutos||60),statusAgenda:status,statusPagamento:$('#mPagamento').value,observacao:$('#mObs').value.trim(),origem:'admin'});$('#modal').classList.remove('open');selectedDate=$('#mData').value;$('#dateInput').value=selectedDate;renderAgenda();toast('Registro salvo.');}catch(err){toast(err.message || 'Erro ao salvar.');}
};
renderAgenda();
