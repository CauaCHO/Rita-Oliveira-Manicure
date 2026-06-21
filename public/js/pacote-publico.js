import { Store } from './storage.js';
import { $, todayISO, money, toast } from './utils.js';
import { PACKAGE_ITEMS, getPackageSelections, calculatePackageValue, savePackageAppointments } from './pacote-utils.js';
import { getAgendaHours } from './horarios-utils.js';

function optionsForDate(date){
  const hours = getAgendaHours(Store, date || todayISO());
  return hours.map(h => `<option value="${h}">${h}</option>`).join('');
}

function refreshHourSelect(itemKey){
  const date = document.querySelector(`[data-package-date="${itemKey}"]`)?.value || todayISO();
  const hour = document.querySelector(`[data-package-hour="${itemKey}"]`);
  const old = hour?.value;
  const hours = getAgendaHours(Store, date);
  if(hour){
    hour.innerHTML = hours.length ? optionsForDate(date) : '<option value="">Sem horários</option>';
    if(old && hours.includes(old)) hour.value = old;
  }
}

function packageRows(){
  return PACKAGE_ITEMS.map(item => `
    <section class="card" style="margin-bottom:12px">
      <h3 style="margin:0 0 10px">${item.label}</h3>
      <div class="grid grid-2">
        <div class="field"><label>Data</label><input type="date" min="${todayISO()}" data-package-date="${item.key}"></div>
        <div class="field"><label>Horário</label><select data-package-hour="${item.key}">${optionsForDate(todayISO())}</select></div>
      </div>
    </section>
  `).join('');
}

function createPackageUI(){
  const hero = document.querySelector('.hero');
  if(hero && !document.getElementById('packagePublicCard')){
    const card = document.createElement('section');
    card.id = 'packagePublicCard';
    card.className = 'card';
    card.innerHTML = `
      <div class="card-title">
        <div>
          <h3 style="margin:0">Pacote mensal</h3>
          <p class="muted">Monte 4 mãos e 2 pés escolhendo data e horário de cada atendimento.</p>
        </div>
      </div>
      <button id="openPackagePublic" class="btn btn-primary btn-full"><i class="fa-solid fa-box"></i> Solicitar pacote mensal</button>
    `;
    hero.insertAdjacentElement('afterend', card);
  }

  if(!document.getElementById('packagePublicModal')){
    const modal = document.createElement('div');
    modal.id = 'packagePublicModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="card-title">
          <div>
            <h3 style="margin:0">Solicitar pacote mensal</h3>
            <p class="muted">Regra: no máximo 1 mão e 1 pé por semana.</p>
          </div>
          <button id="closePackagePublic" class="btn btn-light"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="grid grid-2">
          <div class="field"><label>Seu nome</label><input id="packageClientName" placeholder="Ex: Maria"></div>
          <div class="field"><label>WhatsApp</label><input id="packageClientPhone" placeholder="(17) 99999-9999" inputmode="tel"></div>
        </div>
        <div class="field"><label>Observação</label><textarea id="packageObs" placeholder="Ex: prefiro horários de manhã"></textarea></div>
        <div class="card" style="background:rgba(255,255,255,.45)"><b>Valor estimado:</b> <span id="packageValue">${money(calculatePackageValue(Store))}</span><br><span class="muted small">O valor final será confirmado pela manicure.</span></div>
        <div class="section-title">Escolha os horários do pacote</div>
        <div id="packageRows">${packageRows()}</div>
        <button id="sendPackagePublic" class="btn btn-primary btn-full"><i class="fa-solid fa-calendar-check"></i> Solicitar pacote</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

function openPackage(){
  $('#packageValue').textContent = money(calculatePackageValue(Store));
  PACKAGE_ITEMS.forEach(item => {
    const date = document.querySelector(`[data-package-date="${item.key}"]`);
    if(date && !date.value) date.value = todayISO();
    refreshHourSelect(item.key);
  });
  $('#packagePublicModal').classList.add('open');
}

function closePackage(){ $('#packagePublicModal').classList.remove('open'); }

function setup(){
  createPackageUI();
  PACKAGE_ITEMS.forEach(item => {
    document.querySelector(`[data-package-date="${item.key}"]`)?.addEventListener('change', () => refreshHourSelect(item.key));
  });
  $('#openPackagePublic').onclick = openPackage;
  $('#closePackagePublic').onclick = closePackage;
  $('#packagePublicModal').onclick = event => { if(event.target.id === 'packagePublicModal') closePackage(); };

  $('#sendPackagePublic').onclick = () => {
    const clienteNome = $('#packageClientName').value.trim();
    const clienteTelefone = $('#packageClientPhone').value.trim();
    if(!clienteNome || !clienteTelefone) return toast('Informe seu nome e WhatsApp.');

    try{
      savePackageAppointments(Store, {
        clienteNome,
        clienteTelefone,
        observacao: $('#packageObs').value.trim(),
        selections: getPackageSelections(document),
        valorPacote: calculatePackageValue(Store),
        statusAgenda: 'aguardando_confirmacao',
        statusPagamento: 'pendente',
        origem: 'cliente_pacote'
      });
      closePackage();
      toast('Solicitação do pacote enviada! Aguarde confirmação pelo WhatsApp.');
      window.dispatchEvent(new CustomEvent('db:update'));
    }catch(error){
      toast(error.message || 'Não foi possível solicitar o pacote.');
    }
  };

  window.addEventListener('db:update', () => {
    if($('#packagePublicModal')?.classList.contains('open')){
      $('#packageValue').textContent = money(calculatePackageValue(Store));
      PACKAGE_ITEMS.forEach(item => refreshHourSelect(item.key));
    }
  });
}

setup();
