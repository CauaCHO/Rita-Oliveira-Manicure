import { Store } from './storage.js';
import { requireLogin, adminLayout } from './admin-common.js';
import { $, todayISO, formatDateBR, money, statusLabel, toast, HOURS, whatsappLink } from './utils.js';

requireLogin();

adminLayout('agenda', `
  <div class="card-title">
    <div><h2 style="margin:0">Agenda</h2><p class="muted">Confirme horários, bloqueie folgas e cadastre clientes na hora.</p></div>
    <div class="btn-row"><button id="folgaDiaBtn" class="btn btn-light">Folga do dia</button><button id="pacoteBtn" class="btn btn-info">Pacote mensal</button><button id="manualBtn" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Adicionar</button></div>
  </div>
  <section class="grid grid-3" id="stats"></section>
  <div class="section-title">Data</div><section class="card"><input id="dateInput" type="date"></section>
  <div class="section-title">Horários do dia</div><section id="agendaList" class="table-list"></section>

  <div id="modal" class="modal"><div class="modal-content"><div class="card-title"><h3 id="modalTitle">Adicionar horário</h3><button id="closeModal" class="btn btn-light"><i class="fa-solid fa-xmark"></i></button></div><div class="grid grid-2"><div class="field"><label>Data</label><input id="mData" type="date"></div><div class="field"><label>Hora</label><select id="mHora"></select></div></div><div class="grid grid-2"><div class="field"><label>Nome da cliente</label><input id="mNome" placeholder="Maria"></div><div class="field"><label>WhatsApp</label><input id="mTel" placeholder="17999999999"></div></div><div class="field"><label>Serviço</label><select id="mServico"></select></div><div class="grid grid-2"><div class="field"><label>Status da agenda</label><select id="mStatus"><option value="confirmado">Confirmado</option><option value="aguardando_confirmacao">Aguardando confirmação</option><option value="ocupado">Ocupado</option><option value="folga">Folga</option><option value="concluido">Concluído</option></select></div><div class="field"><label>Pagamento</label><select id="mPagamento"><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="nao_cobrado">Não cobrado</option></select></div></div><div class="field"><label>Observação</label><textarea id="mObs"></textarea></div><button id="saveManual" class="btn btn-primary btn-full">Salvar</button></div></div>

  <div id="pacoteModal" class="modal"><div class="modal-content"><div class="card-title"><h3>Pacote mensal</h3><button id="closePacote" class="btn btn-light"><i class="fa-solid fa-xmark"></i></button></div><p class="muted">Cria 4 mãos semanais e 2 pés no primeiro e terceiro atendimento.</p><div class="grid grid-2"><div class="field"><label>Nome da cliente</label><input id="pNome" placeholder="Maria"></div><div class="field"><label>WhatsApp</label><input id="pTel" placeholder="17999999999"></div></div><div class="grid grid-2"><div class="field"><label>Data inicial</label><input id="pData" type="date"></div><div class="field"><label>Horário</label><select id="pHora"></select></div></div><div class="grid grid-2"><div class="field"><label>Serviço mão</label><select id="pMao"></select></div><div class="field"><label>Serviço pé</label><select id="pPe"></select></div></div><div class="grid grid-2"><div class="field"><label>Valor do pacote</label><input id="pValor" type="number" step="0.01" placeholder="0"></div><div class="field"><label>Pagamento</label><select id="pPagamento"><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="nao_cobrado">Não cobrado</option></select></div></div><button id="savePacote" class="btn btn-primary btn-full">Criar pacote</button></div></div>
`);

let selectedDate = todayISO();
let editId = null;
$('#dateInput').value = selectedDate;

function addDaysISO(dateISO, days){ const d = new Date(`${dateISO}T12:00:00`); d.setDate(d.getDate() + days); return d.toISOString().slice(0,10); }
function digits(v){ return String(v || '').replace(/\D/g,''); }

function fillSelects(){
  $('#mHora').innerHTML = HOURS.map(h=>`<option value="${h}">${h}</option>`).join('');
  const services = Store.listServices();
  $('#mServico').innerHTML = '<option value="">Sem serviço</option>' + services.map(s=>`<option value="${s.id}">${s.nome} - ${money(s.preco)}</option>`).join('');
  $('#pHora').innerHTML = HOURS.map(h=>`<option value="${h}">${h}</option>`).join('');
  $('#pMao').innerHTML = services.map(s=>`<option value="${s.id}">${s.nome}</option>`).join('');
  $('#pPe').innerHTML = services.map(s=>`<option value="${s.id}">${s.nome}</option>`).join('');
}

function renderStats(){
  const aps = Store.listAppointments({date:selectedDate});
  const received = aps.filter(a=>a.statusPagamento==='pago').reduce((s,a)=>s+Number(a.valor||0),0);
  const pending = aps.filter(a=>a.statusPagamento==='pendente' && !['cancelado','folga','ocupado'].includes(a.statusAgenda)).reduce((s,a)=>s+Number(a.valor||0),0);
  $('#stats').innerHTML = `<div class="card stat"><div class="stat-icon"><i class="fa-solid fa-calendar-check"></i></div><div><span class="muted small">Atendimentos</span><br><b>${aps.filter(a=>!['folga','ocupado','cancelado'].includes(a.statusAgenda)).length}</b></div></div><div class="card stat"><div class="stat-icon"><i class="fa-solid fa-money-bill-wave"></i></div><div><span class="muted small">Recebido</span><br><b>${money(received)}</b></div></div><div class="card stat"><div class="stat-icon"><i class="fa-solid fa-clock"></i></div><div><span class="muted small">Pendente</span><br><b>${money(pending)}</b></div></div>`;
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
      item.innerHTML = `<div><h4>${hour} - ${ap.clienteNome || statusLabel(ap.statusAgenda)}</h4><p>${ap.clienteTelefone ? ap.clienteTelefone + ' • ' : ''}${ap.servicoNome || ap.observacao || 'Sem serviço'} • ${money(ap.valor)} • pagamento: ${ap.statusPagamento || '-'} • <span class="status ${ap.statusAgenda}">${statusLabel(ap.statusAgenda)}</span></p></div><div class="btn-row">${ap.statusAgenda==='aguardando_confirmacao'?'<button data-act="confirm" class="btn btn-success">Confirmar</button>':''}${ap.clienteTelefone?`<a class="btn btn-info" target="_blank" href="${whatsappLink(ap.clienteTelefone, waConfirm)}"><i class="fa-brands fa-whatsapp"></i> Confirmar</a><a class="btn btn-light" target="_blank" href="${whatsappLink(ap.clienteTelefone, waReminder)}">Lembrete</a>`:''}<button data-act="edit" class="btn btn-light">Editar</button><button data-act="done" class="btn btn-success">Concluir</button><button data-act="del" class="btn btn-danger">Excluir</button></div>`;
      const c = item.querySelector('[data-act="confirm"]'); if(c)c.onclick=()=>{Store.updateAppointment(ap.id,{statusAgenda:'confirmado'}); toast('Agendamento confirmado.'); renderAgenda();};
      item.querySelector('[data-act="edit"]').onclick=()=>openModal(ap);
      item.querySelector('[data-act="done"]').onclick=()=>{Store.updateAppointment(ap.id,{statusAgenda:'concluido',statusPagamento: ap.statusPagamento === 'nao_cobrado' ? 'nao_cobrado' : 'pago'}); toast('Atendimento concluído.'); renderAgenda();};
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

function openPacote(){
  fillSelects();
  $('#pNome').value = ''; $('#pTel').value = ''; $('#pData').value = selectedDate; $('#pHora').value = HOURS[0]; $('#pValor').value = '';
  const services = Store.listServices();
  const mao = services.find(s=>String(s.nome).toLowerCase().includes('mão')) || services[0];
  const pe = services.find(s=>String(s.nome).toLowerCase().includes('pé')) || services[1] || services[0];
  if(mao) $('#pMao').value = mao.id; if(pe) $('#pPe').value = pe.id;
  $('#pacoteModal').classList.add('open');
}

$('#manualBtn').onclick=()=>openModal({data:selectedDate,statusAgenda:'confirmado'});
$('#folgaDiaBtn').onclick=()=>{
  if(!confirm('Marcar todos os horários livres desse dia como folga? Agendamentos existentes serão mantidos.')) return;
  let count = 0;
  HOURS.forEach(hora=>{
    if(!Store.hasTimeConflict(selectedDate, hora)){
      Store.saveAppointment({data:selectedDate,hora,clienteNome:'',clienteTelefone:'',servicoId:'',servicoNome:'Folga',valor:0,duracaoMinutos:60,statusAgenda:'folga',statusPagamento:'nao_cobrado',observacao:'Dia marcado como folga',origem:'admin'});
      count++;
    }
  });
  toast(`${count} horário(s) marcados como folga.`); renderAgenda();
};
$('#pacoteBtn').onclick=openPacote;
$('#closePacote').onclick=()=>$('#pacoteModal').classList.remove('open');
$('#closeModal').onclick=()=>$('#modal').classList.remove('open');
$('#dateInput').onchange=renderAgenda;
$('#saveManual').onclick=()=>{
  const service = Store.getService($('#mServico').value);
  try{Store.saveAppointment({id:editId,data:$('#mData').value,hora:$('#mHora').value,clienteNome:$('#mNome').value.trim(),clienteTelefone:digits($('#mTel').value),servicoId:service?.id||'',servicoNome:service?.nome||'',valor:Number(service?.preco||0),duracaoMinutos:Number(service?.duracaoMinutos||60),statusAgenda:$('#mStatus').value,statusPagamento:$('#mPagamento').value,observacao:$('#mObs').value.trim(),origem:'admin'});$('#modal').classList.remove('open');selectedDate=$('#mData').value;$('#dateInput').value=selectedDate;renderAgenda();toast('Registro salvo.');}catch(err){toast(err.message || 'Erro ao salvar.');}
};
$('#savePacote').onclick=()=>{
  const nome = $('#pNome').value.trim(); const tel = digits($('#pTel').value); const start = $('#pData').value; const hora = $('#pHora').value;
  if(!nome || !tel || !start || !hora) return toast('Informe cliente, WhatsApp, data e horário.');
  const mao = Store.getService($('#pMao').value); const pe = Store.getService($('#pPe').value);
  const valorPacote = Number($('#pValor').value || 0); const pagamento = $('#pPagamento').value;
  const datas = [0,7,14,21].map(d=>addDaysISO(start,d));
  if(datas.some(data=>Store.hasTimeConflict(data,hora))) return toast('Existe conflito em uma das semanas do pacote.');
  const pacoteId = `pac_${Date.now()}`;
  datas.forEach((data,i)=>{
    const comPe = i === 0 || i === 2;
    Store.saveAppointment({data,hora,clienteNome:nome,clienteTelefone:tel,servicoId:comPe?`${mao?.id}_${pe?.id}`:mao?.id,servicoNome:comPe?`${mao?.nome || 'Mão'} + ${pe?.nome || 'Pé'}`:(mao?.nome || 'Mão'),valor:i===0?valorPacote:0,duracaoMinutos:60,statusAgenda:'confirmado',statusPagamento:i===0?pagamento:'nao_cobrado',observacao:i===0?'Pacote mensal: 4 mãos + 2 pés':'Incluso no pacote mensal',origem:'pacote',pacoteId});
  });
  $('#pacoteModal').classList.remove('open'); selectedDate = start; $('#dateInput').value = start; renderAgenda(); toast('Pacote criado.');
};
window.addEventListener('db:update', renderAgenda);
renderAgenda();
