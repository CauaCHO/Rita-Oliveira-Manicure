import { Store } from './storage.js';
import { requireLogin, adminLayout } from './admin-common.js';
import { $, formatDateBR, money, toast, whatsappLink, stylishConfirm } from './utils.js';

requireLogin();

adminLayout('solicitacoes', `
  <div class="card-title">
    <div>
      <h2 style="margin:0">Solicitações</h2>
      <p class="muted">Pedidos enviados pelas clientes aguardando aprovação.</p>
    </div>
  </div>
  <div class="section-title">Pacotes mensais</div>
  <section id="packageRequests" class="table-list"></section>
  <div class="section-title">Solicitações avulsas</div>
  <section id="singleRequests" class="table-list"></section>
`);

function groupPackages(requests){
  const groups = new Map();
  requests.filter(a => a.pacoteId).forEach(ap => {
    if(!groups.has(ap.pacoteId)) groups.set(ap.pacoteId, []);
    groups.get(ap.pacoteId).push(ap);
  });
  return Array.from(groups.entries()).map(([pacoteId, items]) => ({
    pacoteId,
    items: items.sort((a,b)=>`${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`)),
    first: items[0],
    value: items.reduce((sum, item) => sum + Number(item.valor || 0), 0)
  }));
}

function approveItems(items){
  items.forEach(item => Store.updateAppointment(item.id, { statusAgenda: 'confirmado' }));
}

function denyItems(items){
  items.forEach(item => Store.updateAppointment(item.id, { statusAgenda: 'cancelado' }));
}

function renderPackages(packages){
  const box = $('#packageRequests');
  box.innerHTML = packages.length ? '' : '<div class="empty">Nenhum pacote mensal pendente.</div>';

  packages.forEach(group => {
    const ap = group.first;
    const item = document.createElement('div');
    item.className = 'list-item';
    const details = group.items.map(i => `${i.pacoteLabel || i.servicoNome}: ${formatDateBR(i.data)} às ${i.hora}`).join('<br>');
    const confirmMsg = `Olá, ${ap.clienteNome || ''}! Seu pacote mensal foi confirmado. São 4 mãos e 2 pés. 😊`;
    const denyMsg = `Olá, ${ap.clienteNome || ''}! Infelizmente não consegui confirmar o pacote mensal solicitado. Podemos ajustar os horários? 😊`;

    item.innerHTML = `
      <div>
        <h4>Pacote mensal - ${ap.clienteNome || 'Cliente'}</h4>
        <p>${ap.clienteTelefone || 'Sem WhatsApp'} • 4 mãos + 2 pés • ${money(group.value)}</p>
        <p class="muted small">${details}</p>
      </div>
      <div class="btn-row">
        <button data-act="ok" class="btn btn-success">Aprovar pacote</button>
        <button data-act="no" class="btn btn-danger">Negar pacote</button>
        ${ap.clienteTelefone ? `<a class="btn btn-info" target="_blank" href="${whatsappLink(ap.clienteTelefone, confirmMsg)}"><i class="fa-brands fa-whatsapp"></i> Confirmar</a><a class="btn btn-light" target="_blank" href="${whatsappLink(ap.clienteTelefone, denyMsg)}">Avisar negativa</a>` : ''}
      </div>
    `;

    item.querySelector('[data-act="ok"]').onclick = () => {
      approveItems(group.items);
      toast('Pacote mensal aprovado.');
      render();
    };

    item.querySelector('[data-act="no"]').onclick = async () => {
      const accepted = await stylishConfirm({
        title: 'Negar pacote mensal',
        message: `Deseja negar o pacote mensal de ${ap.clienteNome || 'cliente'}?`,
        confirmText: 'Negar pacote',
        danger: true
      });
      if(!accepted) return;
      denyItems(group.items);
      toast('Pacote mensal negado.');
      render();
    };

    box.appendChild(item);
  });
}

function renderSingles(requests){
  const box = $('#singleRequests');
  const singles = requests.filter(a => !a.pacoteId);
  box.innerHTML = singles.length ? '' : '<div class="empty">Nenhuma solicitação avulsa pendente.</div>';

  singles.forEach(ap => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const confirmMsg = `Olá, ${ap.clienteNome || ''}! Seu horário para ${ap.servicoNome || 'atendimento'} no dia ${formatDateBR(ap.data)} às ${ap.hora} foi confirmado. Valor: ${money(ap.valor)} 😊`;
    const denyMsg = `Olá, ${ap.clienteNome || ''}! Infelizmente não consegui confirmar o horário do dia ${formatDateBR(ap.data)} às ${ap.hora}. Podemos ver outro horário? 😊`;

    item.innerHTML = `
      <div>
        <h4>${ap.clienteNome || 'Cliente'} - ${formatDateBR(ap.data)} às ${ap.hora}</h4>
        <p>${ap.clienteTelefone || 'Sem WhatsApp'} • ${ap.servicoNome || 'Sem serviço'} • ${money(ap.valor)}${ap.observacao ? ' • ' + ap.observacao : ''}</p>
      </div>
      <div class="btn-row">
        <button data-act="ok" class="btn btn-success">Aprovar</button>
        <button data-act="no" class="btn btn-danger">Negar</button>
        ${ap.clienteTelefone ? `<a class="btn btn-info" target="_blank" href="${whatsappLink(ap.clienteTelefone, confirmMsg)}"><i class="fa-brands fa-whatsapp"></i> Confirmar</a><a class="btn btn-light" target="_blank" href="${whatsappLink(ap.clienteTelefone, denyMsg)}">Avisar negativa</a>` : ''}
      </div>
    `;

    item.querySelector('[data-act="ok"]').onclick = () => {
      Store.updateAppointment(ap.id, { statusAgenda: 'confirmado' });
      toast('Solicitação aprovada.');
      render();
    };

    item.querySelector('[data-act="no"]').onclick = async () => {
      const accepted = await stylishConfirm({
        title: 'Negar solicitação',
        message: `Deseja negar o horário de ${ap.clienteNome || 'cliente'} em ${formatDateBR(ap.data)} às ${ap.hora}?`,
        confirmText: 'Negar solicitação',
        danger: true
      });
      if(!accepted) return;
      Store.updateAppointment(ap.id, { statusAgenda: 'cancelado' });
      toast('Solicitação negada.');
      render();
    };

    box.appendChild(item);
  });
}

function render(){
  const requests = Store.listAppointments().filter(a => a.statusAgenda === 'aguardando_confirmacao');
  renderPackages(groupPackages(requests));
  renderSingles(requests);
}

window.addEventListener('db:update', render);
render();
