import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '../../api';
import type { Sesion } from '../../types/sesion';
import Icon from '../../componentes/Icono';
import VistaGestionUsuarios from '../usuarios/VistaGestionUsuarios';
import VistaUsuariosSistema from './VistaUsuariosSistema';
import VistaRolesPermisos from '../usuarios/VistaRolesPermisos';
import VistaAlmacenesCajas from './VistaAlmacenesCajas';
import './VistaConfiguracion.css';

type Orthanc = {
  conectado: boolean;
  nombre: string;
  version: string;
  apiVersion: string;
};
type EventoCuenta = { id: string; tipo: 'inicio_sesion' | 'cierre_sesion' | 'perfil_actualizado' | 'contrasena_actualizada'; creadoEn: string; detalle: string; ip?: string };

type SeccionConfiguracion = 'usuario' | 'sistema' | 'usuarios' | 'roles-permisos' | 'almacenes-cajas';

export default function VistaConfiguracion({
  initialSection = 'usuario',
  tema = 'light',
  onCambiarTema,
  usuario,
}: {
  initialSection?: SeccionConfiguracion;
  tema?: 'light' | 'dark';
  onCambiarTema?: (tema: 'light' | 'dark') => void;
  usuario: Sesion['usuario'];
}) {
  const [seccion, setSeccion] = useState<SeccionConfiguracion>(initialSection);
  const [orthanc, setOrthanc] = useState<Orthanc | null>(null);
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState('');
  const [eventos, setEventos] = useState<EventoCuenta[]>([]);
  const [password, setPassword] = useState({ actual: '', nueva: '', confirmar: '' });
  const [passwordEstado, setPasswordEstado] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [seguridadAbierta, setSeguridadAbierta] = useState(false);
  const [modoRevision, setModoRevision] = useState(() => localStorage.getItem('clinico_modo_revision') === '1');
  const [cacheEstado, setCacheEstado] = useState('');
  const nombrePerfil = usuario.nombre?.trim() || usuario.usuario || 'Usuario';
  const nombreCorto = nombrePerfil.split(/\s+/)[0];
  const inicialesPerfil = nombrePerfil.split(/\s+/).slice(0, 2).map(parte => parte[0]).join('').toUpperCase();
  const datosPerfil = [
    { etiqueta: 'Nombre de usuario', valor: usuario.usuario, icono: 'users' as const, ayuda: 'Identificador para iniciar sesión' },
    { etiqueta: 'Correo electrónico', valor: usuario.correo, icono: 'audit' as const, ayuda: 'Canal para recuperar tu cuenta' },
    { etiqueta: 'Documento de identidad', valor: usuario.ci, icono: 'asset' as const, ayuda: 'Dato de identificación personal' },
    { etiqueta: 'Teléfono', valor: usuario.telefono, icono: 'patient' as const, ayuda: 'Número personal de contacto' },
  ];
  const datosRegistrados = datosPerfil.filter(dato => Boolean(dato.valor?.trim())).length;
  const cambiarModoRevision = (activo: boolean) => { setModoRevision(activo); window.dispatchEvent(new CustomEvent('clinico:modo-revision', { detail: activo })); };
  const limpiarCache = async () => { try { if ('caches' in window) await Promise.all((await caches.keys()).map(cache => caches.delete(cache))); sessionStorage.removeItem('clinico_catalogo_cache'); setCacheEstado('Caché temporal limpiada correctamente.'); } catch { setCacheEstado('No se pudo limpiar la caché temporal.'); } };

  useEffect(() => {
    setSeccion(initialSection);
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
            <strong>Mi usuario</strong>
            <small>Mi cuenta y preferencias personales</small>
          </span>
        </button>
        <button type="button" aria-current={seccion === 'sistema' ? 'page' : undefined} className={seccion === 'sistema' ? 'activo' : ''} onClick={() => setSeccion('sistema')}>
          <Icon name="settings" size={18} />
          <span>
            <strong>Configuración del sistema</strong>
            <small>Servicios, usuarios y roles</small>
          </span>
        </button>
        <button type="button" aria-current={seccion === 'usuarios' ? 'page' : undefined} className={seccion === 'usuarios' ? 'activo' : ''} onClick={() => setSeccion('usuarios')}>
          <Icon name="users" size={18} />
          <span>
            <strong>Usuarios</strong>
            <small>Registro de cuentas y accesos</small>
          </span>
        </button>
        <button type="button" aria-current={seccion === 'roles-permisos' ? 'page' : undefined} className={seccion === 'roles-permisos' ? 'activo' : ''} onClick={() => setSeccion('roles-permisos')}>
          <Icon name="asset" size={18} />
          <span><strong>Roles y permisos</strong><small>Define los accesos de cada rol</small></span>
        </button>
        <button type="button" aria-current={seccion === 'almacenes-cajas' ? 'page' : undefined} className={seccion === 'almacenes-cajas' ? 'activo' : ''} onClick={() => setSeccion('almacenes-cajas')}>
          <Icon name="building" size={18} />
          <span><strong>Almacenes y cajas</strong><small>Organiza puntos de operación</small></span>
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
            <header><div className="config-perfil-identidad"><span className="config-perfil-avatar" aria-hidden="true">{inicialesPerfil || <Icon name="users" size={24} />}</span><div><p>MI PERFIL</p><h3 id="config-perfil-titulo">Hola, {nombreCorto}</h3><strong className="config-perfil-nombre">{nombrePerfil}</strong></div></div><span className="config-perfil-acciones"><span className="config-perfil-estado"><i /> Cuenta activa</span><span className="config-perfil-rol">{usuario.rol}</span><button type="button" onClick={() => setSeguridadAbierta(actual => !actual)} aria-expanded={seguridadAbierta}><Icon name="settings" size={15} />{seguridadAbierta ? 'Cerrar seguridad' : 'Seguridad'}</button></span></header>
            <div className="config-perfil-resumen"><div><strong>Tus datos personales</strong><span>{datosRegistrados === datosPerfil.length ? 'Tu información está completa.' : `${datosRegistrados} de ${datosPerfil.length} datos registrados`}</span></div><div className="config-perfil-progreso" aria-label={`${datosRegistrados} de ${datosPerfil.length} datos registrados`}><span style={{ width: `${datosRegistrados / datosPerfil.length * 100}%` }} /></div>{datosRegistrados < datosPerfil.length && <small>Los datos pendientes pueden ser completados por un administrador del sistema.</small>}</div>
            <div className="config-perfil-datos">{datosPerfil.map(dato => <article key={dato.etiqueta} className={dato.valor ? 'completo' : 'pendiente'}><span className="config-perfil-dato-icono"><Icon name={dato.icono} size={18} /></span><div><small>{dato.etiqueta}</small><strong>{dato.valor || 'Pendiente de completar'}</strong><em>{dato.valor ? dato.ayuda : 'Solicita la actualización a un administrador'}</em></div>{dato.valor ? <span className="config-perfil-verificado"><Icon name="check" size={12} /> Registrado</span> : <span className="config-perfil-faltante">Pendiente</span>}</article>)}</div>
          </section>
          {seguridadAbierta && <section className="config-tarjeta config-seguridad" aria-labelledby="config-password-titulo">
            <header><div><h3 id="config-password-titulo">Cambiar contraseña</h3><p>Actualiza tu contraseña de acceso de forma segura.</p></div><Icon name="settings" size={20} /></header>
            <form onSubmit={cambiarPassword}><label>Contraseña actual<input required type="password" autoComplete="current-password" value={password.actual} onChange={event => setPassword({ ...password, actual: event.target.value })} /></label><label>Nueva contraseña<input required minLength={4} type="password" autoComplete="new-password" value={password.nueva} onChange={event => setPassword({ ...password, nueva: event.target.value })} /></label><label>Confirmar nueva contraseña<input required minLength={4} type="password" autoComplete="new-password" value={password.confirmar} onChange={event => setPassword({ ...password, confirmar: event.target.value })} /></label><button type="submit" disabled={guardandoPassword}>{guardandoPassword ? 'Guardando…' : 'Actualizar contraseña'}</button></form>{passwordEstado && <p className={`config-seguridad-estado ${passwordEstado.includes('correctamente') ? 'correcto' : 'error'}`}>{passwordEstado}</p>}
          </section>}
        </section>
      )}
      {seccion === 'sistema' && <section className="config-contenido config-sistema" aria-label="Configuración del sistema"><section className="config-tarjeta config-mantenimiento"><div><span className="config-apariencia-icono"><Icon name="settings" size={18}/></span><div><h3>Modo revisión del sistema</h3><p>Bloquea toda acción y deja el sistema disponible solo para visualización difuminada.</p></div></div><label className="config-switch"><span className="config-switch-text">{modoRevision ? 'Sistema desactivado' : 'Sistema operativo'}</span><input type="checkbox" checked={modoRevision} onChange={evento => cambiarModoRevision(evento.target.checked)} aria-label="Desactivar sistema para revisión"/><span className="config-switch-track" aria-hidden="true"><span/></span></label></section><section className="config-tarjeta config-mantenimiento"><div><span className="config-apariencia-icono"><Icon name="audit" size={18}/></span><div><h3>Limpiar caché del sistema</h3><p>Elimina archivos temporales sin borrar pacientes, configuraciones ni sesión.</p></div></div><button type="button" className="config-limpiar-cache" onClick={() => void limpiarCache()}><Icon name="close" size={16}/> Limpiar caché</button>{cacheEstado && <p className="config-cache-estado">{cacheEstado}</p>}</section></section>}
      {seccion === 'usuarios' && <VistaUsuariosSistema />}
      {seccion === 'roles-permisos' && <VistaRolesPermisos />}
      {seccion === 'almacenes-cajas' && <VistaAlmacenesCajas />}
    </div>
  );
}
