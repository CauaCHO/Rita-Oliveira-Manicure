import { Store } from './storage.js';
import { stylishConfirm } from './utils.js';

export function requireLogin(){
  if(sessionStorage.getItem('agenda_admin_logged') !== '1') location.href='login.html';
}

export function logout(){
  sessionStorage.removeItem('agenda_admin_logged');
  location.href='login.html';
}

let confirmInterceptorInstalled = false;

function installStyledConfirmInterceptor(){
  if(confirmInterceptorInstalled) return;
  confirmInterceptorInstalled = true;

  document.addEventListener('click', async event => {
    const target = event.target.closest('button, a');
    if(!target || typeof target.onclick !== 'function') return;

    const handlerText = String(target.onclick);
    if(!handlerText.includes('confirm(')) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const isDelete = target.classList.contains('btn-danger') || /excluir|apagar|remover/i.test(target.textContent || '');
    const accepted = await stylishConfirm({
      title: isDelete ? 'Confirmar exclusão' : 'Confirmar ação',
      message: isDelete ? 'Tem certeza de que deseja excluir este registro?' : 'Deseja continuar com esta ação?',
      confirmText: isDelete ? 'Excluir' : 'Confirmar',
      danger: isDelete
    });

    if(!accepted) return;

    const nativeConfirm = window.confirm;
    try {
      window.confirm = () => true;
      target.onclick.call(target, event);
    } finally {
      window.confirm = nativeConfirm;
    }
  }, true);
}

export function adminLayout(active, content){
  const nav = [
    ['agenda.html','calendar-days','Agenda','agenda'],
    ['solicitacoes.html','bell','Solicitações','solicitacoes'],
    ['servicos.html','spa','Serviços','servicos'],
    ['clientes.html','users','Clientes','clientes'],
    ['relatorios.html','chart-line','Relatórios','relatorios'],
    ['config.html','gear','Config.','config']
  ];

  const settings = Store.getSettings();
  document.body.classList.add('admin-body');
  document.body.innerHTML = `
  <div id="toast" class="toast"></div>
  <div class="admin-shell">
    <aside class="sidebar">
      <div class="brand"><div class="logo"><i class="fa-solid fa-hand-sparkles"></i></div><div><h1>${settings.businessName}</h1><p>Painel admin</p></div></div>
      <nav class="side-nav">${nav.map(n=>`<a class="${active===n[3]?'active':''}" href="${n[0]}"><i class="fa-solid fa-${n[1]}"></i> ${n[2]}</a>`).join('')}<a id="logoutBtn" href="#"><i class="fa-solid fa-door-open"></i> Sair</a></nav>
    </aside>
    <main class="admin-main">${content}</main>
  </div>
  <nav class="bottom-nav mobile-admin-nav">${nav.slice(0,5).map(n=>`<a class="${active===n[3]?'active':''}" href="${n[0]}"><i class="fa-solid fa-${n[1]}"></i>${n[2]}</a>`).join('')}</nav>`;

  const btn = document.getElementById('logoutBtn');
  if(btn) btn.onclick = logout;

  installStyledConfirmInterceptor();
}
