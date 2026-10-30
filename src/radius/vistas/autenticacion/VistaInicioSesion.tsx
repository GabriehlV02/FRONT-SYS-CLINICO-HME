import { useState, type FormEvent } from 'react';
import './LoginView.css';
import './LoginPlomo.css';
import './LoginGris.css';
import './AnimacionesLogin.css';
import './LoginRefinamiento.css';
import '../../../ui/styles/LoginFields.css';
import Icon from '../../componentes/Icono';
import { notificar } from '../../componentes/Notificaciones';
import type { Sesion } from '../../types/sesion';

type Props = { onLogin: (sesion: Sesion) => void };

function mensajeAmigable(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : '';
  if (/api\/login|route .*not be found/i.test(mensaje)) return 'El acceso al sistema aún no está disponible. Intenta nuevamente en unos minutos.';
  return mensaje || 'No pudimos conectar con el servidor. Verifica tu conexión e intenta otra vez.';
}

function identificadorDispositivo() {
  const clave = 'pulso_device_id';
  const guardado = localStorage.getItem(clave);
  if (guardado) return guardado;
  const nuevo = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(clave, nuevo);
  return nuevo;
}

function sistemaCliente() {
  const plataforma = navigator.platform || 'Plataforma no identificada';
  const agente = navigator.userAgent;
  const nombreSistema = /Windows/i.test(agente) ? 'Windows' : /Mac OS/i.test(agente) ? 'macOS' : /Android/i.test(agente) ? 'Android' : /iPhone|iPad/i.test(agente) ? 'iOS' : /Linux/i.test(agente) ? 'Linux' : 'Sistema no identificado';
  return { clienteId: identificadorDispositivo(), nombreSistema, plataforma, navegador: agente.slice(0, 200) };
}

export default function VistaInicioSesion({ onLogin }: Props) {
  const usuarioRecordado = localStorage.getItem('pulso_usuario_recordado') || '';
  const [form, setForm] = useState({ usuario: usuarioRecordado, password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [recordar, setRecordar] = useState(Boolean(usuarioRecordado));
  const [recuperacionVisible, setRecuperacionVisible] = useState(false);
  const [recuperacion, setRecuperacion] = useState({ identificador: usuarioRecordado, codigo: '', contrasena: '', confirmar: '' });
  const [recuperando, setRecuperando] = useState(false);
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState('');
  const [errorRecuperacion, setErrorRecuperacion] = useState('');

  const ingresar = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
    const controlador = new AbortController();
    const limite = window.setTimeout(() => controlador.abort(), 8000);
    try {
      const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, dispositivo: sistemaCliente() }), signal: controlador.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const mensaje = response.status === 401
          ? 'Verifica tu usuario y contraseña, o solicita acceso al administrador.'
          : response.status === 422
            ? 'Completa el usuario y la contraseña para continuar.'
            : response.status === 429
              ? 'Se realizaron muchos intentos. Espera un momento antes de volver a intentar.'
              : 'El servicio de autenticación no está disponible. Intenta nuevamente en unos minutos.';
        notificar('error', `No se pudo iniciar sesión · Error ${response.status}`, mensaje);
        return;
      }
      if (!response.ok) throw new Error(data.message || 'No se pudo iniciar sesión.');
      const sesion: Sesion = { token: data.token, expiresAt: data.expiresAt, dispositivo: data.dispositivo, usuario: data.usuario };
      if (recordar) localStorage.setItem('pulso_usuario_recordado', form.usuario.trim());
      else localStorage.removeItem('pulso_usuario_recordado');
      localStorage.removeItem('pulso_session'); sessionStorage.removeItem('pulso_session');
      (recordar ? localStorage : sessionStorage).setItem('pulso_session', JSON.stringify(sesion)); onLogin(sesion);
    } catch { setError(''); notificar('error', 'No se pudo iniciar sesión · Error de conexión', 'No pudimos conectar con el servidor. Verifica tu conexión e intenta otra vez.'); }
    finally { window.clearTimeout(limite); setLoading(false); }
  };

  const solicitarCodigo = async () => {
    setRecuperando(true); setErrorRecuperacion('');
    try {
      const response = await fetch('/api/recuperar-contrasena', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identificador: recuperacion.identificador }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'No pudimos enviar el código. Intenta nuevamente.');
      setMensajeRecuperacion(data.message || 'Revisa tu correo para continuar.');
    } catch (error) { setErrorRecuperacion(error instanceof Error ? error.message : 'No pudimos enviar el código. Intenta nuevamente.'); }
    finally { setRecuperando(false); }
  };

  const restablecerContrasena = async () => {
    setRecuperando(true); setErrorRecuperacion('');
    try {
      const response = await fetch('/api/restablecer-contrasena', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identificador: recuperacion.identificador, codigo: recuperacion.codigo, contrasena_nueva: recuperacion.contrasena, confirmar_contrasena: recuperacion.confirmar }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'No pudimos restablecer la contraseña. Intenta nuevamente.');
      setMensajeRecuperacion(data.message || 'Contraseña actualizada.'); setRecuperacion((actual) => ({ ...actual, codigo: '', contrasena: '', confirmar: '' }));
    } catch (error) { setErrorRecuperacion(error instanceof Error ? error.message : 'No pudimos restablecer la contraseña.'); }
    finally { setRecuperando(false); }
  };

  const volverAlInicio = () => {
    setRecuperacionVisible(false);
    setErrorRecuperacion('');
    setRecuperacion((actual) => ({ ...actual, codigo: '', contrasena: '', confirmar: '' }));
    setForm((actual) => ({ ...actual, password: '' }));
  };

  return <main className="login-page login-page-clinico">
    <svg className="triangulo-fondo triangulo-superior" viewBox="0 0 500 430" aria-hidden="true"><path d="M245 20Q265-13 285 20L485 365Q505 400 465 400H65Q25 400 45 365Z" /></svg>
    <svg className="triangulo-fondo triangulo-inferior" viewBox="0 0 500 430" aria-hidden="true"><path d="M245 20Q265-13 285 20L485 365Q505 400 465 400H65Q25 400 45 365Z" /></svg>
    <svg className="triangulo-fondo triangulo-orbita" viewBox="0 0 220 195" aria-hidden="true"><path d="M101 15Q110 0 119 15L207 166Q216 182 198 182H22Q4 182 13 166Z" /><circle cx="193" cy="142" r="6" /></svg>
    {['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis'].map((nombre) => <svg key={nombre} className={`mini-triangulo mini-${nombre}`} viewBox="0 0 100 90" aria-hidden="true"><path d="M45 8Q50 0 55 8L94 76Q99 85 89 85H11Q1 85 6 76Z" /></svg>)}
    <i className="punto punto-uno" /><i className="punto punto-dos" /><i className="punto punto-tres" /><i className="trazo trazo-uno" /><i className="trazo trazo-dos" /><i className="trazo trazo-tres" />
    <div className="login-shell">
      <section className="login-presentacion" aria-label="Información del Hospital Maria Esperanza">
        <div className="login-presentacion-contenido">
          <img src="/logo-hospital-original.png" alt="Hospital Maria Esperanza" className="login-logo" />
          <p className="login-presentacion-kicker"><span />HOSPITAL MARIA ESPERANZA</p>
          <h1>Tu salud,<br /><strong>nuestra prioridad</strong></h1>
          <p className="login-presentacion-texto">Sistema de gestión clínica para<br />un mejor cuidado del paciente.</p>
        </div>
        <p className="login-presentacion-pie"><span /> Plataforma clínica institucional</p>
        <div className="login-presentacion-onda" aria-hidden="true" />
      </section>
      <section className="login-acceso">
        {!recuperacionVisible ? <form className="login-card" onSubmit={ingresar}>
          <p className="login-kicker">PORTAL CLÍNICO</p>
          <h1>Iniciar sesión</h1>
          <p className="login-subtitulo">Accede al sistema clínico con tu cuenta</p>
          {error && <div className="login-error" role="alert"><Icon name="close" size={17} /><div><strong>No se pudo iniciar sesión</strong><span>{error}</span></div></div>}
          <div className="login-field"><label className="login-label" htmlFor="clinico-usuario">Usuario</label><div className="login-input"><Icon name="users" size={19} /><input id="clinico-usuario" autoFocus required autoComplete="username" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} placeholder="Ingresa tu usuario" /></div></div>
          <div className="login-field"><label className="login-label" htmlFor="clinico-password">Contraseña</label><div className="login-input"><Icon name="asset" size={18} /><input id="clinico-password" required type={mostrarPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Ingresa tu contraseña" /><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { const input = e.currentTarget.previousElementSibling as HTMLInputElement; const start = input.selectionStart, end = input.selectionEnd; setMostrarPassword((v) => !v); requestAnimationFrame(() => { input.focus({ preventScroll: true }); input.setSelectionRange(start, end); }); }} aria-pressed={mostrarPassword} aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}><Icon name={mostrarPassword ? 'eyeOff' : 'eye'} size={18} /></button></div></div>
          <div className="login-opciones">
            <label><input type="checkbox" checked={recordar} onChange={(e) => { const activo = e.target.checked; setRecordar(activo); if (!activo) localStorage.removeItem('pulso_usuario_recordado'); }} /> Recordar usuario en este equipo</label>
            <button type="button" className="login-ayuda-link" onClick={() => { setRecuperacionVisible(true); setRecuperacion((actual) => ({ ...actual, identificador: form.usuario.trim() || actual.identificador })); setForm((actual) => ({ ...actual, password: '' })); setMensajeRecuperacion(''); setErrorRecuperacion(''); }}><span>¿Olvidaste tu contraseña?</span><Icon name="arrowRight" size={15} /></button>
          </div>
          <button className="login-submit" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'} {!loading && <Icon name="arrowRight" size={18} />}</button>
          <p className="login-helper">Para proteger la información clínica, no compartas tus credenciales.</p>
        </form> : <section className="login-card login-card-recuperacion" aria-labelledby="clinico-recuperacion-titulo">
          <button className="login-recuperacion-volver" type="button" onClick={volverAlInicio}><Icon name="chevronLeft" size={16} /> Volver a iniciar sesión</button>
          <div className="login-recuperacion-marcas" aria-hidden="true">
            <span className="login-recuperacion-marca login-recuperacion-gmail"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M2 6.3v11.4c0 .7.5 1.2 1.2 1.2H5V8.7z"/><path fill="#34A853" d="M19 8.7v10.2h1.8c.7 0 1.2-.5 1.2-1.2V6.3z"/><path fill="#EA4335" d="M2 6.3 4.7 4.5 12 10l7.3-5.5L22 6.3 12 13.8z"/><path fill="#C5221F" d="M19.3 4.5 22 6.3V5.5c0-1.3-1.5-2-2.5-1.2z"/><path fill="#FBBC04" d="M2 6.3 4.7 4.5 4.5 4.3C3.5 3.6 2 4.2 2 5.5z"/></svg></span>
            <span className="login-recuperacion-marca login-recuperacion-google"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.4-.18-2.06H12v3.89h5.24a4.48 4.48 0 0 1-1.94 2.93v2.43h3.13c1.83-1.68 2.92-4.16 2.92-7.19Z"/><path fill="#34A853" d="M12 21.5c2.62 0 4.82-.87 6.43-2.35l-3.13-2.43c-.87.58-1.98.93-3.3.93-2.54 0-4.69-1.72-5.46-4.03H3.31v2.52A9.72 9.72 0 0 0 12 21.5Z"/><path fill="#FBBC05" d="M6.54 13.62a5.9 5.9 0 0 1 0-3.24V7.86H3.31a9.75 9.75 0 0 0 0 8.28z"/><path fill="#EA4335" d="M12 6.35c1.43 0 2.72.49 3.74 1.48l2.8-2.8A9.36 9.36 0 0 0 12 2.5a9.72 9.72 0 0 0-8.69 5.36l3.23 2.52C7.31 8.07 9.46 6.35 12 6.35Z"/></svg></span>
          </div>
          <p className="login-kicker">RECUPERACIÓN DE ACCESO</p>
          <h1 id="clinico-recuperacion-titulo">Restablece tu contraseña</h1>
          <p className="login-subtitulo">Te enviaremos un código al correo registrado.</p>
          <div className="login-recuperacion-progreso" aria-label="Pasos de recuperación"><span className={!mensajeRecuperacion ? 'activo' : ''}><b>1</b> Solicitar código</span><span className={mensajeRecuperacion ? 'activo' : ''}><b>2</b> Validar y cambiar</span></div>
          <div className="login-recuperacion-vista" onKeyDown={(evento) => { if (evento.key !== 'Enter' || !(evento.target instanceof HTMLInputElement)) return; evento.preventDefault(); if (recuperando || mensajeRecuperacion.includes('actualizada')) return; if (mensajeRecuperacion) { if (recuperacion.codigo.length === 6 && recuperacion.contrasena.length >= 8 && recuperacion.contrasena === recuperacion.confirmar) void restablecerContrasena(); } else if (recuperacion.identificador.trim()) void solicitarCodigo(); }}>
            {!mensajeRecuperacion && <div className="login-recuperacion-solicitud"><label htmlFor="clinico-recuperacion-identificador">Usuario o correo</label><div className="login-recuperacion-entrada"><Icon name="users" size={19}/><input id="clinico-recuperacion-identificador" autoFocus required value={recuperacion.identificador} onChange={(e) => setRecuperacion({ ...recuperacion, identificador: e.target.value })} placeholder="Escribe tu usuario o correo" autoComplete="username" /></div><button className="login-recuperacion-principal" type="button" onClick={solicitarCodigo} disabled={recuperando || !recuperacion.identificador.trim()}>{recuperando ? 'Enviando código…' : 'Enviar código'}<Icon name="arrowRight" size={17} /></button></div>}
            {mensajeRecuperacion && <p className="login-recuperacion-mensaje" role="status">{mensajeRecuperacion}</p>}
            {mensajeRecuperacion && !mensajeRecuperacion.includes('actualizada') && <div className="login-recuperacion-restablecer"><label htmlFor="clinico-recuperacion-codigo">Código recibido</label><input id="clinico-recuperacion-codigo" autoFocus required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={recuperacion.codigo} onChange={(e) => setRecuperacion({ ...recuperacion, codigo: e.target.value.replace(/\D/g, '') })} placeholder="000000" autoComplete="one-time-code" /><label htmlFor="clinico-recuperacion-contrasena">Nueva contraseña</label><input id="clinico-recuperacion-contrasena" required minLength={8} type="password" value={recuperacion.contrasena} onChange={(e) => setRecuperacion({ ...recuperacion, contrasena: e.target.value })} placeholder="Mínimo 8 caracteres" autoComplete="new-password" /><label htmlFor="clinico-recuperacion-confirmar">Confirma la nueva contraseña</label><input id="clinico-recuperacion-confirmar" required minLength={8} type="password" value={recuperacion.confirmar} onChange={(e) => setRecuperacion({ ...recuperacion, confirmar: e.target.value })} placeholder="Repite tu contraseña" autoComplete="new-password" />{recuperacion.confirmar && recuperacion.contrasena !== recuperacion.confirmar && <small className="login-recuperacion-validacion">Las contraseñas deben coincidir.</small>}<button className="login-recuperacion-principal" type="button" onClick={restablecerContrasena} disabled={recuperando || recuperacion.codigo.length !== 6 || recuperacion.contrasena.length < 8 || recuperacion.contrasena !== recuperacion.confirmar}>{recuperando ? 'Guardando…' : 'Cambiar contraseña'}<Icon name="arrowRight" size={17} /></button><button className="login-recuperacion-reenviar" type="button" onClick={solicitarCodigo} disabled={recuperando}>¿No recibiste el código? Solicitar otro</button></div>}
            {errorRecuperacion && <p className="login-recuperacion-error" role="alert">{errorRecuperacion}</p>}
            {mensajeRecuperacion.includes('actualizada') && <button className="login-recuperacion-principal" type="button" onClick={volverAlInicio}>Volver a iniciar sesión<Icon name="arrowRight" size={17}/></button>}
          </div>
          <p className="login-recuperacion-nota">Código válido por 15 minutos. No lo compartas.</p>
        </section>}
      </section>
    </div>
  </main>;
}
