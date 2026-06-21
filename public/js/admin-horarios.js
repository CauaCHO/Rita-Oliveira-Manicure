import { Store } from './storage.js';
import { $, todayISO, toast, HOURS } from './utils.js';
import { getAgendaHours, addDateSlot, addWeeklySlot, removeDateSlot, removeWeeklySlot, WEEKDAYS, getWeekday, weekdayLabel } from './horarios-utils.js';

function optionHours(hours){
  return hours.map(h => `<option value="${h}">${h}</option>`).join('');
}

function weekdayOptions(selected){
  return WEEKDAYS.map(day => `<option value="${day.value}" ${Number(selected) === Number(day.value) ? 'selected' : ''}>${day.label}</option>`).join('');
}

function createModal(){
  if(document.getElementById('horariosModal')) return;
  const modal = document.createElement('div');
  modal.id = 'horariosModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="card-title">
        <div>
          <h3 style="margin:0">Gerenciar horários</h3>
          <p class="muted">Crie ou remova horários da agenda.</p>
        </div>
        <button id="closeHorarios" class="btn btn-light"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="field"><label>Data de referência</label><input id="hData" type="date"></div>

      <div class="grid grid-2">
        <div class="field"><label>Ação</label><select id="hAction"><option value="add">Adicionar horário</option><option value="remove">Remover horário</option></select></div>
        <div class="field"><label>Aplicar em</label><select id="hScope"><option value="date">Somente nessa data</option><option value="weekday">Todo esse dia da semana</option></select></div>
      </div>

      <div id="weekdayBox" class="field" style="display:none"><label>Dia da semana</label><select id="hWeekday"></select></div>

      <div id="addHourBox" class="field"><label>Novo horário</label><input id="hNewHour" type="time" step="1800"></div>
      <div id="removeHourBox" class="field" style="display:none"><label>Horário para remover</label><select id="hRemoveHour"></select></div>

      <section class="card" style="background:rgba(255,255,255,.42)">
        <b>Horários visíveis nessa data</b>
        <div id="hCurrentList" class="muted" style="margin-top:8px"></div>
      </section>

      <button id="saveHorario" class="btn btn-primary btn-full">Salvar alteração</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function refresh(){
  const date = $('#hData').value || todayISO();
  const hours = getAgendaHours(Store, date);
  const weekday = getWeekday(date);
  $('#hWeekday').innerHTML = weekdayOptions(weekday);
  $('#hRemoveHour').innerHTML = optionHours(hours);
  $('#hCurrentList').textContent = hours.length ? hours.join(' • ') : 'Nenhum horário criado.';
  $('#weekdayBox').style.display = $('#hScope').value === 'weekday' ? 'block' : 'none';
  $('#addHourBox').style.display = $('#hAction').value === 'add' ? 'block' : 'none';
  $('#removeHourBox').style.display = $('#hAction').value === 'remove' ? 'block' : 'none';
}

function openModal(){
  createModal();
  $('#hData').value = $('#dateInput')?.value || todayISO();
  $('#hAction').value = 'add';
  $('#hScope').value = 'date';
  $('#hNewHour').value = '15:30';
  refresh();
  $('#horariosModal').classList.add('open');
}

function closeModal(){
  $('#horariosModal').classList.remove('open');
}

function save(){
  const date = $('#hData').value;
  const action = $('#hAction').value;
  const scope = $('#hScope').value;
  const weekday = Number($('#hWeekday').value);
  const hora = action === 'add' ? $('#hNewHour').value : $('#hRemoveHour').value;

  if(!date) return toast('Escolha a data de referência.');
  if(!hora) return toast('Informe um horário.');

  if(action === 'remove' && scope === 'date' && Store.hasTimeConflict(date, hora)){
    return toast('Esse horário possui atendimento ou bloqueio. Remova o registro antes.');
  }

  if(action === 'add' && scope === 'date') addDateSlot(Store, date, hora);
  if(action === 'add' && scope === 'weekday') addWeeklySlot(Store, weekday, hora);
  if(action === 'remove' && scope === 'date') removeDateSlot(Store, date, hora);
  if(action === 'remove' && scope === 'weekday') removeWeeklySlot(Store, weekday, hora);

  toast(scope === 'weekday' ? `Horário atualizado para ${weekdayLabel(weekday)}.` : 'Horário atualizado para a data.');
  if($('#dateInput')) $('#dateInput').value = date;
  window.dispatchEvent(new CustomEvent('db:update'));
  refresh();
}

function addActionButton(){
  const list = document.querySelector('#actionModal .table-list');
  if(!list || document.getElementById('actionSlots')) return false;
  const btn = document.createElement('button');
  btn.id = 'actionSlots';
  btn.className = 'list-item';
  btn.type = 'button';
  btn.style.cssText = 'width:100%;text-align:left;border:0;cursor:pointer';
  btn.innerHTML = `<div><h4>Gerenciar horários</h4><p>Criar ou remover horário para uma data ou dia da semana.</p></div><i class="fa-solid fa-clock"></i>`;
  list.appendChild(btn);
  btn.onclick = () => {
    document.getElementById('actionModal')?.classList.remove('open');
    openModal();
  };
  return true;
}

function setup(){
  createModal();
  $('#closeHorarios').onclick = closeModal;
  $('#horariosModal').onclick = event => { if(event.target.id === 'horariosModal') closeModal(); };
  $('#hData').onchange = refresh;
  $('#hAction').onchange = refresh;
  $('#hScope').onchange = refresh;
  $('#saveHorario').onclick = save;

  if(!addActionButton()) setTimeout(addActionButton, 300);
}

setup();
