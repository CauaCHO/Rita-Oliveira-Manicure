export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function installGlassSpacingFix(){
  if (document.getElementById('glassSpacingFix')) return;
  const style = document.createElement('style');
  style.id = 'glassSpacingFix';
  style.textContent = `
    .admin-main,
    .container{
      display:flex !important;
      flex-direction:column !important;
      gap:20px !important;
    }

    .admin-main > *,
    .container > *{
      margin-top:0 !important;
      margin-bottom:0 !important;
    }

    .grid,
    .table-list,
    .time-list,
    .service-list{
      gap:18px !important;
    }

    .card,
    .hero,
    .list-item,
    .time-item,
    .service-option,
    .empty{
      flex-shrink:0;
    }

    .card > .list-item + .list-item,
    .card > .card + .card,
    #services > .list-item + .list-item,
    #clients > .list-item + .list-item,
    #appointments > .list-item + .list-item,
    #clientList > .list-item + .list-item,
    #requests > .list-item + .list-item,
    #agendaList > .list-item + .list-item{
      margin-top:16px !important;
    }

    .section-title{
      margin-top:8px !important;
      margin-bottom:-4px !important;
      padding-left:4px;
    }

    .modal-content .field + .field,
    .modal-content .grid + .field,
    .modal-content .field + .grid,
    .modal-content .grid + .grid{
      margin-top:14px !important;
    }

    @media(max-width:760px){
      body{
        padding-bottom:138px !important;
      }

      .container,
      .admin-main{
        width:100% !important;
        max-width:100% !important;
        padding:22px 24px 142px !important;
        gap:22px !important;
      }

      .app-header{
        padding:22px 24px 0 !important;
      }

      .card,
      .hero,
      .list-item,
      .time-item,
      .service-option,
      .empty{
        width:100% !important;
        margin:0 !important;
      }

      .grid,
      .table-list,
      .time-list,
      .service-list{
        display:flex !important;
        flex-direction:column !important;
        gap:20px !important;
        width:100% !important;
      }

      .card .grid,
      .card .table-list,
      .card .service-list,
      .card .time-list{
        gap:16px !important;
      }

      .card > .list-item,
      #services > .list-item,
      #clients > .list-item,
      #appointments > .list-item,
      #clientList > .list-item,
      #requests > .list-item,
      #agendaList > .list-item{
        margin-top:0 !important;
        margin-bottom:0 !important;
      }

      .list-item + .list-item,
      .card + .card,
      .hero + .card,
      .grid + .card,
      .card + .grid,
      .table-list + .card,
      .card + .table-list{
        margin-top:0 !important;
      }

      .bottom-nav{
        left:20px !important;
        right:20px !important;
        bottom:22px !important;
        width:auto !important;
      }

      .modal{
        padding:20px !important;
      }

      .modal-content{
        margin:0 !important;
      }
    }
  `;
  document.head.appendChild(style);
}

installGlassSpacingFix();

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function formatDateBR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function toast(message) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.display = 'block';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => { el.style.display = 'none'; }, 2800);
}

export function stylishConfirm({
  title = 'Confirmar ação',
  message = 'Deseja continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false
} = {}) {
  return new Promise(resolve => {
    const old = document.getElementById('confirmModalGlobal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'confirmModalGlobal';
    modal.className = 'modal open';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:420px">
        <div class="card-title">
          <div>
            <h3 style="margin:0">${title}</h3>
            <p class="muted" style="margin:8px 0 0">${message}</p>
          </div>
          <button type="button" class="btn btn-light" data-cancel><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="btn-row" style="justify-content:flex-end;margin-top:18px">
          <button type="button" class="btn btn-light" data-cancel>${cancelText}</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${confirmText}</button>
        </div>
      </div>`;

    const close = result => {
      modal.remove();
      resolve(result);
    };

    modal.querySelectorAll('[data-cancel]').forEach(btn => btn.onclick = () => close(false));
    modal.querySelector('[data-confirm]').onclick = () => close(true);
    modal.onclick = event => { if (event.target === modal) close(false); };
    document.body.appendChild(modal);
  });
}

export function statusLabel(status) {
  const labels = {
    disponivel: 'Disponível',
    aguardando_confirmacao: 'Aguardando',
    confirmado: 'Confirmado',
    ocupado: 'Ocupado',
    folga: 'Folga',
    cancelado: 'Cancelado',
    concluido: 'Concluído'
  };
  return labels[status] || status;
}

export function whatsappLink(phone, text) {
  const digits = onlyDigits(phone);
  const number = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export const HOURS = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00'];
