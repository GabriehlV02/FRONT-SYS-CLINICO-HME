import { useState, type FormEvent } from 'react';
import './LoginView.css';
import './LoginPlomo.css';
import './LoginGris.css';
import './AnimacionesLogin.css';
import '../../../ui/styles/LoginFields.css';
import Icon from '../../componentes/Icono';
import type { Sesion } from '../../types/sesion';

type Props = { onLogin: (sesion: Sesion) => void };

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

  const ingresar = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, dispositivo: sistemaCliente() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'No se pudo iniciar sesión.');
      const sesion: Sesion = { token: data.token, expiresAt: data.expiresAt, dispositivo: data.dispositivo, usuario: data.usuario };
      if (recordar) localStorage.setItem('pulso_usuario_recordado', form.usuario.trim());
      else localStorage.removeItem('pulso_usuario_recordado');
      localStorage.removeItem('pulso_session'); sessionStorage.removeItem('pulso_session');
      (recordar ? localStorage : sessionStorage).setItem('pulso_session', JSON.stringify(sesion)); onLogin(sesion);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo conectar con el servidor.'); }
    finally { setLoading(false); }
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
          <p className="login-presentacion-kicker">HOSPITAL MARIA ESPERANZA</p>
          <h1>Tu salud,<br /><strong>nuestra prioridad</strong></h1>
          <p className="login-presentacion-texto">Sistema de gestión clínica para<br />un mejor cuidado del paciente.</p>
        </div>
        <div className="login-presentacion-onda" aria-hidden="true" />
      </section>
      <section className="login-acceso">
        <form className="login-card" onSubmit={ingresar}>
          <div className="login-icono-acceso" aria-hidden="true"><Icon name="users" size={27} /></div>
          <p className="login-kicker">ACCESO AL SISTEMA</p>
          <h1>Iniciar sesión</h1>
          <p className="login-subtitulo">Accede al sistema clínico con tu cuenta</p>
          {error && <div className="login-error" role="alert">{error}</div>}
          <div className="login-field"><label className="login-label" htmlFor="clinico-usuario">Usuario</label><div className="login-input"><Icon name="users" size={19} /><input id="clinico-usuario" autoFocus required autoComplete="username" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} placeholder="Ingresa tu usuario" /></div></div>
          <div className="login-field"><label className="login-label" htmlFor="clinico-password">Contraseña</label><div className="login-input"><Icon name="asset" size={18} /><input id="clinico-password" required type={mostrarPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Ingresa tu contraseña" /><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { const input = e.currentTarget.previousElementSibling as HTMLInputElement; const start = input.selectionStart, end = input.selectionEnd; setMostrarPassword((v) => !v); requestAnimationFrame(() => { input.focus({ preventScroll: true }); input.setSelectionRange(start, end); }); }} aria-pressed={mostrarPassword} aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}><Icon name={mostrarPassword ? 'eyeOff' : 'eye'} size={18} /></button></div></div>
          <div className="login-opciones"><label><input type="checkbox" checked={recordar} onChange={(e) => { const activo = e.target.checked; setRecordar(activo); if (!activo) localStorage.removeItem('pulso_usuario_recordado'); }} /> Mantener sesión en este equipo</label><span>¿Olvidaste tu contraseña?</span></div>
          <button className="login-submit" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'} <Icon name="arrowRight" size={18} /></button>
        </form>
      </section>
    </div>
  </main>;
}
