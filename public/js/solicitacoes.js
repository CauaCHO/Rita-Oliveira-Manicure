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
  <section id="requests" class="table-list"></section>
`);

function render(){
  const box = $('#requests');
  const requests = Store.listAppointments().filter(a => a.statusAgenda === 'aguardando_confirmacao');
  box.innerHTML = requests.length ? '' : '<div class="empty">Nenhuma solicitação pendente.</div>';

  requests.forEach(ap => {
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

window.addEventListener('db:update', render);
render();
