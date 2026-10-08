import { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
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
}: {
  initialSection?: SeccionConfiguracion | 'usuarios';
}) {
  const [seccion, setSeccion] = useState<SeccionConfiguracion>(initialSection === 'usuarios' ? 'sistema' : initialSection);
  const [orthanc, setOrthanc] = useState<Orthanc | null>(null);
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState('');
  const [eventos, setEventos] = useState<EventoCuenta[]>([]);

  useEffect(() => {
    setSeccion(initialSection === 'usuarios' ? 'sistema' : initialSection);
  }, [initialSection]);

  useEffect(() => {
    void apiFetch('/api/mi-actividad').then(async respuesta => respuesta.ok ? respuesta.json() : { eventos: [] }).then(datos => setEventos(datos.eventos || [])).catch(() => undefined);
  }, []);

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
          <section className="config-tarjeta config-actividad">
            <header><div><h3>Actividad de tu cuenta</h3><p>Accesos y cambios realizados desde esta cuenta.</p></div><span>{eventos.length} registros</span></header>
            {eventos.length ? <div className="config-actividad-lista">{eventos.map(evento => <article key={evento.id}><span className={`config-actividad-icono ${evento.tipo}`}><Icon name={evento.tipo === 'inicio_sesion' ? 'userCheck' : evento.tipo === 'contrasena_actualizada' ? 'settings' : 'edit'} size={16} /></span><div><strong>{evento.detalle}</strong><small>{new Date(evento.creadoEn).toLocaleString('es-BO')}{evento.ip ? ` · IP ${evento.ip}` : ''}</small></div></article>)}</div> : <p className="config-actividad-vacia">No hay actividad registrada para esta cuenta.</p>}
          </section>
        </section>
      )}
      {seccion === 'sistema' && <section className="config-contenido" aria-label="Configuración del sistema" />}
    </div>
  );
}
