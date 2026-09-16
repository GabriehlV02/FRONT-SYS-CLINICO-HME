import { useEffect, useRef, useState } from 'react';
import Icon from './components/Icon';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import type { AuthSession, SystemConfig } from './types';

const sessionDurationMs = 6 * 60 * 60_000;
const memoryExpirations = new Map<SystemConfig['id'], number>();

type StoredSession = {
  user: string;
  role?: string;
  permissions?: string[];
  expiresAt: number;
};

function sessionKey(id: SystemConfig['id']) {
  return `clinica_${id}_session`;
}

function readStoredSession(id: SystemConfig['id']): AuthSession | null {
  try {
    localStorage.removeItem(sessionKey(id));
    const raw = sessionStorage.getItem(sessionKey(id));
    if (!raw) return null;
    const session = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof session.user !== 'string' || !session.user || typeof session.expiresAt !== 'number' || session.expiresAt <= Date.now()) {
      sessionStorage.removeItem(sessionKey(id));
      return null;
    }
    return { user: session.user, role: typeof session.role === 'string' ? session.role : undefined, permissions: Array.isArray(session.permissions) ? session.permissions.filter((value): value is string => typeof value === 'string') : [] };
  } catch {
    try {
      sessionStorage.removeItem(sessionKey(id));
      localStorage.removeItem(sessionKey(id));
    } catch { /* Almacenamiento opcional. */ }
    return null;
  }
}

function storeSession(id: SystemConfig['id'], session: AuthSession) {
  const expiresAt = Date.now() + sessionDurationMs;
  memoryExpirations.set(id, expiresAt);
  try {
    localStorage.removeItem(sessionKey(id));
    sessionStorage.setItem(sessionKey(id), JSON.stringify({ ...session, expiresAt }));
  } catch { /* La sesion funciona sin almacenamiento. */ }
}

function clearStoredSession(id: SystemConfig['id']) {
  memoryExpirations.delete(id);
  try {
    sessionStorage.removeItem(sessionKey(id));
    localStorage.removeItem(sessionKey(id));
  } catch { /* Almacenamiento opcional. */ }
}

function readStoredExpiration(id: SystemConfig['id']): number {
  const memoryExpiration = memoryExpirations.get(id);
  if (memoryExpiration !== undefined) return memoryExpiration;
  try {
    const raw = sessionStorage.getItem(sessionKey(id));
    if (!raw) return 0;
    const session = JSON.parse(raw) as Partial<StoredSession>;
    return typeof session.expiresAt === 'number' ? session.expiresAt : 0;
  } catch {
    clearStoredSession(id);
    return 0;
  }
}

export function SystemApp({ config }: { config: SystemConfig }) {
  const modules = config.modules;
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession(config.id));
  const [active, setActive] = useState(() => modules[0]?.id ?? 'resumen');
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const menuButton = useRef<HTMLButtonElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const selected = modules.find(item => item.id === active || active.startsWith(`${item.id}-`)) ?? modules[0];
  const results = modules.filter(item => item.name.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(query.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
  const notifications = [
    { id: 'stock', tone: 'alerta', title: 'Stock por revisar', detail: '3 insumos estan cerca del minimo definido.', time: 'Hace 12 min' },
    { id: 'caja', tone: 'exito', title: 'Caja actualizada', detail: 'El cierre parcial fue guardado correctamente.', time: 'Hace 28 min' },
    { id: 'facturacion', tone: 'info', title: 'Facturacion pendiente', detail: 'Hay comprobantes listos para validacion.', time: 'Hoy' },
  ];

  function closeMenu() { setOpen(false); requestAnimationFrame(() => menuButton.current?.focus()); }
  useEffect(() => {
    if (!open) return;
    const sidebar = document.getElementById('system-sidebar');
    const focusable = () => Array.from(sidebar?.querySelectorAll<HTMLButtonElement>('button') ?? []).filter(button => button.getClientRects().length > 0);
    focusable()[0]?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); requestAnimationFrame(() => menuButton.current?.focus()); }
      if (event.key === 'Tab') {
        const buttons = focusable();
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    const media = window.matchMedia('(min-width: 761px)');
    const resize = () => { if (media.matches) setOpen(false); };
    media.addEventListener('change', resize);
    window.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = originalOverflow; window.removeEventListener('keydown', handleKey); media.removeEventListener('change', resize); };
  }, [open]);

  useEffect(() => {
    if (!session) return;
    const remaining = readStoredExpiration(config.id) - Date.now();
    if (remaining <= 0) {
      clearStoredSession(config.id);
      setSession(null);
      return;
    }
    const timer = window.setTimeout(() => {
      clearStoredSession(config.id);
      setSession(null);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [config.id, session]);

  useEffect(() => {
    if (!notificationsOpen) return;
    function handlePointer(event: PointerEvent) {
      if (!notificationsRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setNotificationsOpen(false);
    }
    window.addEventListener('pointerdown', handlePointer);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [notificationsOpen]);

  function select(id: string) { setActive(id); setQuery(''); if (open) closeMenu(); }
  function login(nextSession: AuthSession) { storeSession(config.id, nextSession); setSession(nextSession); }
  function logout() { clearStoredSession(config.id); setSession(null); setActive(modules[0]?.id ?? 'resumen'); setOpen(false); setQuery(''); }
  if (!session) return <Login config={config} onLogin={login}/>;

  const moduleId = modules.find(item => item.id === active || active.startsWith(`${item.id}-`))?.id ?? active;
  const moduleContent = config.renderModule?.(moduleId, select, active, session);
  return <div className={`sistema-app sistema-${config.id} ${collapsed ? 'sidebar-replegado' : ''}`}>
    <Sidebar config={config} active={active} open={open} collapsed={collapsed} onSelect={select} onClose={closeMenu} onCollapse={() => setCollapsed(!collapsed)} onLogout={logout}/>
    <div className="sistema-cuerpo" inert={open}>
      <header className="sistema-topbar">
        <button ref={menuButton} className="abrir-menu" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open} aria-controls="system-sidebar"><Icon name="menu"/></button>
        <span className="topbar-icono"><Icon name={selected.icon}/></span>
        <div className="topbar-titulo"><h1>{selected.name}</h1><small>{config.name}</small></div>
        <div className="search-container"><label className="busqueda-global"><Icon name="search" size={17}/><input type="search" aria-label="Buscar módulo" placeholder="Buscar un módulo…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setQuery(''); }}/></label>
          {query.trim() && <div className="search-results" aria-label="Resultados de módulos">{results.length ? results.map(item => <button key={item.id} onClick={() => select(item.id)}><Icon name={item.icon} size={17}/>{item.name}<Icon name="chevronRight" size={14}/></button>) : <p role="status">No se encontraron módulos.</p>}</div>}
        </div>
        <div className="notificaciones" ref={notificationsRef}>
          <button className="notificaciones-boton" type="button" onClick={() => setNotificationsOpen(value => !value)} aria-label="Ver notificaciones" aria-expanded={notificationsOpen}>
            <Icon name="bell" size={19}/>
            <span>{notifications.length}</span>
          </button>
          {notificationsOpen && <section className="notificaciones-panel" aria-label="Notificaciones">
            <header><div><strong>Notificaciones</strong><small>{notifications.length} novedades del sistema</small></div><button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Cerrar notificaciones"><Icon name="close" size={16}/></button></header>
            <div className="notificaciones-lista">
              {notifications.map(item => <article className={`notificacion notificacion-${item.tone}`} key={item.id}>
                <span className="notificacion-punto"/>
                <div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.time}</small></div>
              </article>)}
            </div>
          </section>}
        </div>
        <div className="perfil"><span className="perfil-avatar"><Icon name="users" size={34}/></span><div><strong title={session.user}>{session.user === 'demo' ? 'Usuario de prueba' : session.user}</strong><small>{session.role || config.role}</small></div></div>
        <button className="salir-rapido" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"><Icon name="logout" size={19}/></button>
      </header>
      <main className="area-trabajo"><div className="content-limit">
        {!moduleContent && <div className="pagina-cabecera"><div><p>{config.category}</p><h2>{active === 'resumen' ? config.dashboardTitle : selected.name}</h2><small>{selected.description}</small></div>{config.id !== 'clinico' && <span className="demo-badge"><span/> Modo demostración</span>}</div>}
        {moduleContent ? <div key={active}>{moduleContent}</div> : (active === 'resumen' ? <>
          <section className="metricas" aria-label="Resumen del sistema">{config.metrics.map(item => <article key={item.title}><div className="metrica-heading"><span>{item.title}</span><span className="metric-icon"><Icon name={item.icon}/></span></div><strong>{item.value}</strong><small>{item.note} · Demo</small></article>)}</section>
          <section className="welcome-panel"><div><span className="section-kicker">TU ESPACIO DE TRABAJO</span><h2>{config.welcomeTitle}</h2><p>{config.welcomeDescription}</p><button className="boton-principal" onClick={() => select(config.actionId)}>{config.actionLabel} <Icon name="arrowRight" size={17}/></button></div><div className="welcome-visual" aria-hidden="true"><Icon name="fileText" size={76}/><span><Icon name="check" size={23}/></span></div></section>
          <section className="quick-section"><div className="section-title"><h2>Accesos rápidos</h2><span>{config.name}</span></div><div className="quick-grid">{modules.filter(item => config.quickIds.includes(item.id)).map(item => <button key={item.id} onClick={() => select(item.id)}><span className="quick-icon"><Icon name={item.icon} size={22}/></span><strong>{item.name}</strong><span>{item.description}</span><Icon className="quick-arrow" name="arrowRight" size={17}/></button>)}</div></section>
        </> : <section className="modulo-vacio"><span className="empty-icon"><Icon name={selected.icon} size={35}/></span><p>{config.name.toUpperCase()}</p><h2>{selected.name}</h2><div>{selected.description}</div><small>El contenido de este módulo se diseñará en la siguiente etapa.</small><button className="boton-secundario" onClick={() => select('resumen')}><Icon name="chevronLeft" size={16}/> Volver al panel principal</button></section>)}
      </div></main>
    </div>
  </div>;
}
