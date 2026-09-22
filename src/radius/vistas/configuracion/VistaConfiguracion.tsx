import { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
import Icon from '../../componentes/Icono';
import { leerSesion } from '../../types/sesion';
import VistaGestionUsuarios from '../usuarios/VistaGestionUsuarios';
import './VistaConfiguracion.css';

type Perfil = {
  nombre?: string;
  apellido?: string;
  email?: string;
  usuario?: string;
  ci?: string;
  telefono?: string;
};

type Orthanc = {
  conectado: boolean;
  nombre: string;
  version: string;
  apiVersion: string;
};

type SeccionConfiguracion = 'usuario' | 'sistema';

export default function VistaConfiguracion({
  initialSection = 'usuario',
}: {
  initialSection?: SeccionConfiguracion | 'usuarios';
}) {
  const [seccion, setSeccion] = useState<SeccionConfiguracion>(initialSection === 'usuarios' ? 'sistema' : initialSection);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [orthanc, setOrthanc] = useState<Orthanc | null>(null);
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState('');
  const sesion = leerSesion();

  useEffect(() => {
    setSeccion(initialSection === 'usuarios' ? 'sistema' : initialSection);
  }, [initialSection]);

  useEffect(() => {
    void apiFetch('/api/mi-perfil')
      .then(async (respuesta) => {
        if (respuesta.ok) setPerfil(await respuesta.json());
      })
      .catch(() => undefined);
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
          <div className="config-seccion-titulo">
            <h2>Configuración de usuario</h2>
            <p>Datos de tu cuenta, sesión y permisos asignados.</p>
          </div>
          <div className="config-grid">
            <article className="config-tarjeta config-perfil">
              <div className="config-icono">
                <Icon name="users" size={24} />
              </div>
              <div>
                <small>Usuario conectado</small>
                <h3>{perfil ? `${perfil.nombre || ''} ${perfil.apellido || ''}`.trim() : sesion?.usuario.nombre || 'Usuario'}</h3>
                <span className="config-estado"><i />Cuenta activa</span>
              </div>
            </article>
            <article className="config-tarjeta">
              <h3>Datos de acceso</h3>
              <dl>
                <div><dt>Usuario</dt><dd>{perfil?.usuario || 'No registrado'}</dd></div>
                <div><dt>Correo</dt><dd>{perfil?.email || 'No registrado'}</dd></div>
                <div><dt>Documento</dt><dd>{perfil?.ci || 'No registrado'}</dd></div>
                <div><dt>Telefono</dt><dd>{perfil?.telefono || 'No registrado'}</dd></div>
              </dl>
            </article>
            <article className="config-tarjeta">
              <h3>Sesion y permisos</h3>
              <dl>
                <div><dt>Rol</dt><dd>{sesion?.usuario.rol || 'Sin rol'}</dd></div>
                <div><dt>La sesion finaliza</dt><dd>{sesion ? new Date(sesion.expiresAt).toLocaleString('es-BO') : 'No disponible'}</dd></div>
                <div><dt>Permisos asignados</dt><dd>{sesion?.usuario.permisos.length || 0}</dd></div>
              </dl>
            </article>
          </div>
        </section>
      )}

      {seccion === 'sistema' && (
        <section className="config-contenido">
          <div className="config-seccion-titulo">
            <h2>Configuración del sistema</h2>
            <p>Estado de los servicios que permiten consultar y visualizar estudios.</p>
          </div>
          {error && <div className="config-error">{error}</div>}
          <div className="config-grid">
            <article className="config-tarjeta config-servicio">
              <div className="config-servicio-cabecera">
                <span><Icon name="package" size={22} /></span>
                <div>
                  <small>Servidor PACS</small>
                  <h3>{orthanc?.nombre || 'Orthanc'}</h3>
                </div>
                <i className={orthanc ? 'conectado' : ''} />
              </div>
              <dl>
                <div><dt>Direccion interna</dt><dd>Configurado en el servidor</dd></div>
                <div><dt>Version</dt><dd>{orthanc?.version || 'No comprobada'}</dd></div>
                <div><dt>API</dt><dd>{orthanc?.apiVersion || 'No comprobada'}</dd></div>
              </dl>
              <button disabled={probando} onClick={() => void probar()}>
                <Icon name="arrowRight" size={16} />
                {probando ? 'Comprobando...' : 'Probar conexion'}
              </button>
            </article>
            <article className="config-tarjeta">
              <h3>Aplicacion</h3>
              <dl>
                <div><dt>Frontend</dt><dd>HOSPITAL Imagenologia</dd></div>
                <div><dt>Backend</dt><dd>API clinica activa</dd></div>
                <div><dt>Almacenamiento DICOM</dt><dd>Administrado por Orthanc</dd></div>
              </dl>
            </article>
          </div>
          <section className="config-gestion-usuarios" aria-label="Usuarios y roles">
            <VistaGestionUsuarios />
          </section>
        </section>
      )}
    </div>
  );
}
