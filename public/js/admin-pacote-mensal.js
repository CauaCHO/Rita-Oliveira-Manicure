import { Store } from './storage.js';
import { $, todayISO, money, toast, HOURS } from './utils.js';
import { PACKAGE_ITEMS, getPackageSelections, calculatePackageValue, savePackageAppointments } from './pacote-utils.js';

function rows(){
  return PACKAGE_ITEMS.map((item, index) => `
    <section class="card" style="margin-bottom:12px">
      <h3 style="margin:0 0 10px">${item.label}</h3>
      <div class="grid grid-2">
        <div class="field"><label>Data</label><input type="date" min="${todayISO()}" data-package-date="${item.key}"></div>
        <div class="field"><label>Horário</label><select data-package-hour="${item.key}">${HOURS.map((h, i) => `<option value="${h}" ${i === index ? 'selected' : ''}>${h}</option>`).join('')}</select></div>
      </div>
    </section>
  `).join('');
}

function createModal(){
  if(document.getElementById('adminPackageModalNew')) return;

  const modal = document.createElement('div');
  modal.id = 'adminPackageModalNew';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="card-title">
        <div>
          <h3 style="margin:0">Pacote mensal</h3>
          <p class="muted">Cadastre 4 mãos e 2 pés escolhendo cada data e horário.</p>
        </div>
        <button id="closeAdminPackageNew" class="btn btn-light"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="grid grid-2">
        <div class="field"><label>Nome da cliente</label><input id="adminPackageName" placeholder="Maria"></div>
        <div class="field"><label>WhatsApp</label><input id="adminPackagePhone" placeholder="17999999999"></div>
      </div>
      <div class="grid grid-2">
        <div class="field"><label>Valor do pacote</label><input id="adminPackageValue" type="number" step="0.01" placeholder="0"></div>
        <div class="field"><label>Pagamento</label><select id="adminPackagePayment"><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="nao_cobrado">Não cobrado</option></select></div>
      </div>
      <div class="field"><label>Observação</label><textarea id="adminPackageObs" placeholder="Ex: pacote da cliente"></textarea></div>
      <div class="card" style="background:rgba(255,255,255,.45)"><b>Regra do pacote:</b><br><span class="muted">No máximo 1 mão e 1 pé por semana. Pode fazer mão e pé no mesmo dia, desde que sejam horários diferentes.</span></div>
      <div class="section-title">Horários do pacote</div>
      <div id="adminPackageRows">${rows()}</div>
      <button id="saveAdminPackageNew" class="btn btn-primary btn-full">Salvar pacote mensal</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function openModal(){
  createModal();
  $('#adminPackageName').value = '';
  $('#adminPackagePhone').value = '';
  $('#adminPackageValue').value = calculatePackageValue(Store);
  $('#adminPackagePayment').value = 'pago';
  $('#adminPackageObs').value = '';
  PACKAGE_ITEMS.forEach((item, index) => {
    const date = document.querySelector(`[data-package-date="${item.key}"]`);
    const hour = document.querySelector(`[data-package-hour="${item.key}"]`);
    if(date) date.value = todayISO();
    if(hour) hour.value = HOURS[index % HOURS.length];
  });
  $('#adminPackageModalNew').classList.add('open');
}

function closeModal(){
  $('#adminPackageModalNew').classList.remove('open');
}

function setup(){
  createModal();
  $('#closeAdminPackageNew').onclick = closeModal;
  $('#adminPackageModalNew').onclick = event => { if(event.target.id === 'adminPackageModalNew') closeModal(); };
  $('#saveAdminPackageNew').onclick = () => {
    const clienteNome = $('#adminPackageName').value.trim();
    const clienteTelefone = $('#adminPackagePhone').value.trim();
    if(!clienteNome || !clienteTelefone) return toast('Informe nome e WhatsApp da cliente.');

    try{
      savePackageAppointments(Store, {
        clienteNome,
        clienteTelefone,
        observacao: $('#adminPackageObs').value.trim(),
        selections: getPackageSelections(document),
        valorPacote: Number($('#adminPackageValue').value || 0),
        statusAgenda: 'confirmado',
        statusPagamento: $('#adminPackagePayment').value,
        origem: 'admin_pacote'
      });
      closeModal();
      toast('Pacote mensal criado.');
      window.dispatchEvent(new CustomEvent('db:update'));
    }catch(error){
      toast(error.message || 'Não foi possível criar o pacote.');
    }
  };

  const actionPackage = document.getElementById('actionPackage');
  if(actionPackage){
    actionPackage.onclick = () => {
      document.getElementById('actionModal')?.classList.remove('open');
      openModal();
    };
  }
}

setup();
