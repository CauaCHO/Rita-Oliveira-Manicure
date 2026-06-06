export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

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
