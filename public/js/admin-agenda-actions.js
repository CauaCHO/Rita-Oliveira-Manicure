import { $ } from './utils.js';

function closeModal(id){
  const modal = document.getElementById(id);
  if(modal) modal.classList.remove('open');
}

function createActionModal(){
  const modal = document.createElement('div');
  modal.id = 'actionModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="card-title">
        <div>
          <h3 style="margin:0">O que deseja adicionar?</h3>
          <p class="muted">Escolha uma ação para continuar.</p>
        </div>
        <button id="closeActionModal" class="btn btn-light" type="button"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="table-list">
        <button id="actionAppointment" class="list-item" type="button" style="width:100%;text-align:left;border:0;cursor:pointer">
          <div><h4>Novo atendimento</h4><p>Cadastrar uma cliente manualmente em uma data e horário.</p></div>
          <i class="fa-solid fa-calendar-plus"></i>
        </button>
        <button id="actionBreak" class="list-item" type="button" style="width:100%;text-align:left;border:0;cursor:pointer">
          <div><h4>Adicionar folga ou bloqueio</h4><p>Bloqueia horários sem entrar no histórico, lucro ou total de atendimentos.</p></div>
          <i class="fa-solid fa-ban"></i>
        </button>
        <button id="actionPackage" class="list-item" type="button" style="width:100%;text-align:left;border:0;cursor:pointer">
          <div><h4>Pacote mensal</h4><p>Próxima etapa: selecionar 4 mãos e 2 pés separadamente.</p></div>
          <i class="fa-solid fa-box"></i>
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}

function setup(){
  const addBtn = $('#manualBtn');
  const breakBtn = $('#folgaBtn');
  const packageBtn = $('#pacoteBtn');
  if(!addBtn) return;

  const originalAdd = addBtn.onclick;
  const originalBreak = breakBtn?.onclick;
  const originalPackage = packageBtn?.onclick;

  if(breakBtn) breakBtn.style.display = 'none';
  if(packageBtn) packageBtn.style.display = 'none';

  addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar <i class="fa-solid fa-chevron-down"></i>';

  const actionModal = createActionModal();

  addBtn.onclick = () => actionModal.classList.add('open');
  $('#closeActionModal').onclick = () => closeModal('actionModal');
  actionModal.onclick = event => {
    if(event.target === actionModal) closeModal('actionModal');
  };

  $('#actionAppointment').onclick = () => {
    closeModal('actionModal');
    $('#modalTitle').textContent = 'Novo atendimento';
    $('#saveManual').textContent = 'Salvar atendimento';
    if(typeof originalAdd === 'function') originalAdd();
  };

  $('#actionBreak').onclick = () => {
    closeModal('actionModal');
    if(typeof originalBreak === 'function') originalBreak();
  };

  $('#actionPackage').onclick = () => {
    closeModal('actionModal');
    if(typeof originalPackage === 'function') originalPackage();
  };

  document.addEventListener('click', event => {
    const editButton = event.target.closest('[data-act="edit"]');
    if(editButton){
      $('#modalTitle').textContent = 'Editar agendamento';
      $('#saveManual').textContent = 'Salvar alterações';
    }

    const fillButton = event.target.closest('#agendaList .btn-light');
    if(fillButton && !editButton){
      $('#modalTitle').textContent = 'Novo atendimento';
      $('#saveManual').textContent = 'Salvar atendimento';
    }
  }, true);
}

setup();
