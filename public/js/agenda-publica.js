import { Store } from './storage.js';
import { $, $$, todayISO, formatDateBR, money, statusLabel, toast, HOURS } from './utils.js';

let selectedDate = todayISO();
let selectedHour = '';
let selectedService = null;

const settings = Store.getSettings();
$('#businessName').textContent = settings.businessName || 'Studio Nails';
$('#subtitle').textContent = settings.subtitle || 'Agende seu horário de forma simples';
$('#dateInput').value = selectedDate;
$('#dateInput').min = todayISO();

function renderTimes(){
  selectedDate = $('#dateInput').value;
  const appointments = Store.listAppointments({ date:selectedDate });
  const container = $('#timeList');
  container.innerHTML = '';
  HOURS.forEach(hour => {
    const ap = appointments.find(a => a.hora === hour && ['aguardando_confirmacao','confirmado','ocupado','folga'].includes(a.statusAgenda));
    const status = ap?.statusAgenda || 'disponivel';
    const item = document.createElement('div');
    item.className = 'time-item';
    item.innerHTML = `
      <div class="time-main"><b>${hour}</b><span>${status === 'disponivel' ? 'Horário livre para solicitar' : 'Horário indisponível'}</span></div>
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

$('#closeModal').onclick = () => $('#bookingModal').classList.remove('open');
$('#bookingModal').onclick = (e) => { if(e.target.id === 'bookingModal') $('#bookingModal').classList.remove('open'); };
$('#dateInput').onchange = renderTimes;

$('#requestBooking').onclick = () => {
  const nome = $('#clientName').value.trim();
  const telefone = $('#clientPhone').value.trim();
  if(!selectedService) return toast('Escolha um serviço.');
  if(!nome || !telefone) return toast('Informe seu nome e WhatsApp.');
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
    $('#bookingModal').classList.remove('open');
    renderTimes();
    toast('Solicitação enviada! Aguarde confirmação pelo WhatsApp.');
  }catch(err){
    toast(err.message || 'Não foi possível agendar.');
    renderTimes();
  }
};

renderTimes();
