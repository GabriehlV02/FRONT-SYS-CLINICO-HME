import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '../../api';
import type { Sesion } from '../../types/sesion';
import Icon from '../../componentes/Icono';
import VistaGestionUsuarios from '../usuarios/VistaGestionUsuarios';
import './VistaConfiguracion.css';

type Orthanc = {
  conectado: boolean;
  nombre: string;
  version: string;
  apiVersion: string;
};
type EventoCuenta = { id: string; tipo: 'inicio_sesion' | 'cierre_sesion' | 'perfil_actualizado' | 'contrasena_actualizada'; creadoEn: string; detalle: string; ip?: string };

type SeccionConfiguracion = 'usuario' | 'sistema';

export default function VistaConfiguracion({
  initialSection = 'usuario',
  tema = 'light',
  onCambiarTema,
  usuario,
}: {
  initialSection?: SeccionConfiguracion | 'usuarios';
  tema?: 'light' | 'dark';
  onCambiarTema?: (tema: 'light' | 'dark') => void;
  usuario: Sesion['usuario'];
}) {
  const [seccion, setSeccion] = useState<SeccionConfiguracion>(initialSection === 'usuarios' ? 'sistema' : initialSection);
  const [orthanc, setOrthanc] = useState<Orthanc | null>(null);
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState('');
  const [eventos, setEventos] = useState<EventoCuenta[]>([]);
  const [password, setPassword] = useState({ actual: '', nueva: '', confirmar: '' });
  const [passwordEstado, setPasswordEstado] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [seguridadAbierta, setSeguridadAbierta] = useState(false);

  useEffect(() => {
    setSeccion(initialSection === 'usuarios' ? 'sistema' : initialSection);
  }, [initialSection]);

  useEffect(() => {
    void apiFetch('/api/mi-actividad').then(async respuesta => respuesta.ok ? respuesta.json() : { eventos: [] }).then(datos => setEventos(datos.eventos || [])).catch(() => undefined);
  }, []);

  const cambiarPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordEstado('');
    if (password.nueva !== password.confirmar) return setPasswordEstado('Las contraseñas nuevas no coinciden.');
    setGuardandoPassword(true);
    try {
      const respuesta = await apiFetch('/api/cambiar-contrasena', { method: 'POST', body: JSON.stringify({ usuario: usuario.usuario, contrasena_actual: password.actual, contrasena_nueva: password.nueva, confirmar_contrasena: password.confirmar }) });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo cambiar la contraseña.');
      setPassword({ actual: '', nueva: '', confirmar: '' });
      setPasswordEstado('Contraseña actualizada correctamente.');
    } catch (error) { setPasswordEstado(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.'); }
    finally { setGuardandoPassword(false); }
  };

  const probar = async () => {
    setProbando(true);
    setError('');
    try {
      const respuesta = await apiFetch('/api/orthanc/estado');
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message || 'No se pudo conectar con Orthanc.');
      setOrthanc(datos);
    } catch (evento) {
      setOrthanc(null);
      setError(evento instanceof Error ? evento.message : 'No se pudo comprobar la conexion.');
    } finally {
      setProbando(false);
    }
  };

  useEffect(() => {
    if (seccion === 'sistema' && !orthanc) void probar();
  }, [seccion]);

  return (
    <div className="config-vista">
      <nav className="config-pestanas" aria-label="Subvistas de configuración">
        <button type="button" aria-current={seccion === 'usuario' ? 'page' : undefined} className={seccion === 'usuario' ? 'activo' : ''} onClick={() => setSeccion('usuario')}>
          <Icon name="users" size={18} />
          <span>
            <strong>Configuración de usuario</strong>
            <small>Cuenta y preferencias personales</small>
          </span>
        </button>
        <button type="button" aria-current={seccion === 'sistema' ? 'page' : undefined} className={seccion === 'sistema' ? 'activo' : ''} onClick={() => setSeccion('sistema')}>
          <Icon name="settings" size={18} />
          <span>
            <strong>Configuración del sistema</strong>
            <small>Servicios, usuarios y roles</small>
          </span>
        </button>
      </nav>

      {seccion === 'usuario' && (
        <section className="config-contenido">
          <section className="config-tarjeta config-apariencia" aria-labelledby="config-apariencia-titulo">
            <div>
              <span className="config-apariencia-icono"><Icon name="settings" size={18} /></span>
              <div>
                <h3 id="config-apariencia-titulo">Tema del sistema</h3>
                <p>Cambia entre el tema claro actual y un azul noche cómodo para trabajar.</p>
              </div>
            </div>
            <label className="config-switch">
              <span className="config-switch-text">{tema === 'dark' ? 'Tema oscuro' : 'Tema claro'}</span>
              <input type="checkbox" checked={tema === 'dark'} onChange={evento => onCambiarTema?.(evento.target.checked ? 'dark' : 'light')} aria-label="Cambiar tema del sistema" />
              <span className="config-switch-track" aria-hidden="true"><span /></span>
            </label>
          </section>
          <section className="config-tarjeta config-perfil-actual" aria-labelledby="config-perfil-titulo">
            <header><div><span className="config-perfil-avatar"><Icon name="users" size={24} /></span><div><p>PERFIL EN USO</p><h3 id="config-perfil-titulo">{usuario.nombre}</h3><small>Información de registro y acceso al sistema clínico</small></div></div><span className="config-perfil-acciones"><span className="config-perfil-rol">{usuario.rol}</span><button type="button" onClick={() => setSeguridadAbierta(actual => !actual)} aria-expanded={seguridadAbierta}><Icon name="settings" size={15} />{seguridadAbierta ? 'Cerrar' : 'Editar'}</button></span></header>
            <div className="config-perfil-datos"><div><small>Usuario</small><strong>{usuario.usuario || 'No registrado'}</strong></div><div><small>Correo electrónico</small><strong>{usuario.correo || 'No registrado'}</strong></div><div><small>Documento de identidad</small><strong>{usuario.ci || 'No registrado'}</strong></div><div><small>Teléfono</small><strong>{usuario.telefono || 'No registrado'}</strong></div></div>
          </section>
          {seguridadAbierta && <section className="config-tarjeta config-seguridad" aria-labelledby="config-password-titulo">
            <header><div><h3 id="config-password-titulo">Cambiar contraseña</h3><p>Actualiza tu contraseña de acceso de forma segura.</p></div><Icon name="settings" size={20} /></header>
            <form onSubmit={cambiarPassword}><label>Contraseña actual<input required type="password" autoComplete="current-password" value={password.actual} onChange={event => setPassword({ ...password, actual: event.target.value })} /></label><label>Nueva contraseña<input required minLength={4} type="password" autoComplete="new-password" value={password.nueva} onChange={event => setPassword({ ...password, nueva: event.target.value })} /></label><label>Confirmar nueva contraseña<input required minLength={4} type="password" autoComplete="new-password" value={password.confirmar} onChange={event => setPassword({ ...password, confirmar: event.target.value })} /></label><button type="submit" disabled={guardandoPassword}>{guardandoPassword ? 'Guardando…' : 'Actualizar contraseña'}</button></form>{passwordEstado && <p className={`config-seguridad-estado ${passwordEstado.includes('correctamente') ? 'correcto' : 'error'}`}>{passwordEstado}</p>}
          </section>}
        </section>
      )}
      {seccion === 'sistema' && <section className="config-contenido" aria-label="Configuración del sistema" />}
    </div>
  );
}
