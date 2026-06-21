import { Store } from './storage.js';
import { $, $$, todayISO, formatDateBR, money, statusLabel, toast } from './utils.js';
import { getAgendaHours } from './horarios-utils.js';

let selectedDate = todayISO();
let selectedHour = '';
let selectedService = null;

const settings = Store.getSettings();
$('#businessName').textContent = settings.businessName || 'Studio Nails';
$('#subtitle').textContent = settings.subtitle || 'Agende seu horário de forma simples';
$('#dateInput').value = selectedDate;
$('#dateInput').min = todayISO();

function unavailableEntry(hour) {
  return Store.listDayEntries(selectedDate).find(a => a.hora === hour && ['aguardando_confirmacao','confirmado','ocupado','folga','bloqueado','concluido'].includes(a.statusAgenda));
}

function renderTimes(){
  selectedDate = $('#dateInput').value;
  const container = $('#timeList');
  const hours = getAgendaHours(Store, selectedDate);
  container.innerHTML = hours.length ? '' : '<div class="empty">Nenhum horário disponível nessa data.</div>';
  hours.forEach(hour => {
    const ap = unavailableEntry(hour);
    const status = ap?.statusAgenda || 'disponivel';
    const isBlock = ap?.itemKind === 'block';
    const item = document.createElement('div');
    item.className = 'time-item';
    item.innerHTML = `
      <div class="time-main"><b>${hour}</b><span>${status === 'disponivel' ? 'Horário livre para solicitar' : (isBlock ? 'Horário bloqueado pela manicure' : 'Horário indisponível')}</span></div>
      <div class="btn-row"><span class="status ${status}">${statusLabel(status)}</span>${status === 'disponivel' ? '<button class="btn btn-primary">Agendar</button>' : ''}</div>
    `;
    if(status === 'disponivel') item.querySelector('button').onclick = () => openBooking(hour);
    container.appendChild(item);
  });
}

function openBooking(hour){
  selectedHour = hour;
  selectedService = null;
  $('#selectedInfo').textContent = `Dia ${formatDateBR(selectedDate)} às ${hour}`;
  $('#clientName').value = '';
  $('#clientPhone').value = '';
  $('#obs').value = '';
  renderServices();
  updateSummary();
  $('#bookingModal').classList.add('open');
}

function renderServices(){
  const services = Store.listServices({ onlyPublic:true });
  const box = $('#serviceList');
  box.innerHTML = services.length ? '' : '<div class="empty">Nenhum serviço disponível no momento.</div>';
  services.forEach(service => {
    const div = document.createElement('label');
    div.className = 'service-option';
    div.innerHTML = `
      <div><b>${service.nome}</b><p class="muted small">${service.descricao || 'Atendimento'} • ${service.duracaoMinutos || 60} min</p></div>
      <div style="display:flex;align-items:center;gap:10px"><span class="price">${money(service.preco)}</span><input type="radio" name="service" /></div>
    `;
    div.onclick = () => {
      selectedService = service;
      $$('.service-option').forEach(e => e.classList.remove('active'));
      div.classList.add('active');
      div.querySelector('input').checked = true;
      updateSummary();
    };
    box.appendChild(div);
  });
}

function updateSummary(){
  $('#summaryBox').innerHTML = `
    <b>Resumo</b><br>
    <span class="muted">Data:</span> ${formatDateBR(selectedDate)}<br>
    <span class="muted">Horário:</span> ${selectedHour || '-'}<br>
    <span class="muted">Serviço:</span> ${selectedService ? selectedService.nome : 'Selecione um serviço'}<br>
    <span class="muted">Valor:</span> <b>${selectedService ? money(selectedService.preco) : '-'}</b>
  `;
}

function closeBooking(){ $('#bookingModal').classList.remove('open'); }

function syncOpenBooking(){
  renderTimes();
  if($('#bookingModal').classList.contains('open') && selectedHour && Store.hasTimeConflict(selectedDate, selectedHour)){
    closeBooking();
    toast('Esse horário acabou de ser preenchido. Escolha outro horário disponível.');
  }
}

$('#closeModal').onclick = closeBooking;
$('#bookingModal').onclick = (e) => { if(e.target.id === 'bookingModal') closeBooking(); };
$('#dateInput').onchange = renderTimes;

$('#requestBooking').onclick = () => {
  const nome = $('#clientName').value.trim();
  const telefone = $('#clientPhone').value.trim();
  if(!selectedService) return toast('Escolha um serviço.');
  if(!nome || !telefone) return toast('Informe seu nome e WhatsApp.');
  if(Store.hasTimeConflict(selectedDate, selectedHour)){
    closeBooking();
    renderTimes();
    return toast('Esse horário acabou de ser preenchido. Escolha outro horário.');
  }
  try{
    Store.saveAppointment({
      data:selectedDate,
      hora:selectedHour,
      clienteNome:nome,
      clienteTelefone:telefone,
      servicoId:selectedService.id,
      servicoNome:selectedService.nome,
      valor:Number(selectedService.preco || 0),
      duracaoMinutos:Number(selectedService.duracaoMinutos || 60),
      statusAgenda:'aguardando_confirmacao',
      statusPagamento:'pendente',
      observacao:$('#obs').value.trim(),
      origem:'cliente'
    });
    closeBooking();
    renderTimes();
    toast('Solicitação enviada! Aguarde confirmação pelo WhatsApp.');
  }catch(err){
    closeBooking();
    toast(err.message || 'Não foi possível agendar.');
    renderTimes();
  }
};

window.addEventListener('db:update', syncOpenBooking);
document.addEventListener('visibilitychange', () => { if(!document.hidden) syncOpenBooking(); });
window.addEventListener('focus', syncOpenBooking);

renderTimes();
