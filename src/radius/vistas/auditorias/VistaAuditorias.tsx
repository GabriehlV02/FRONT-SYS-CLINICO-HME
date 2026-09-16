import { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
import Icon from '../../componentes/Icono';
import type { Sesion } from '../../types/sesion';
import './VistaAuditorias.css';

type Dispositivo = NonNullable<Sesion['dispositivo']>;
type Evento = {
  id: string;
  tipo: 'inicio_sesion' | 'cierre_sesion';
  usuarioNombre: string;
  dispositivoId: string;
  ip: string;
  creadoEn: string;
  detalle: string;
};

function fecha(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function VistaAuditorias({ sesion }: { sesion: Sesion }) {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const [dispositivosResponse, eventosResponse] = await Promise.all([
        apiFetch('/api/auditorias/dispositivos'),
        apiFetch('/api/auditorias/eventos'),
      ]);
      const dispositivosData = await dispositivosResponse.json().catch(() => ({}));
      const eventosData = await eventosResponse.json().catch(() => ({}));
      if (!dispositivosResponse.ok || !eventosResponse.ok) {
        throw new Error(dispositivosData.message || eventosData.message || 'No se pudieron cargar las auditorías.');
      }
      setDispositivos(dispositivosData.dispositivos || []);
      setEventos(eventosData.eventos || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las auditorías.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { void cargar(); }, []);

  const guardarNombre = async (id: string) => {
    const valor = nombre.trim();
    if (!valor) return;
    const response = await apiFetch(`/api/auditorias/dispositivos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ nombrePersonalizado: valor }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.message || 'No se pudo guardar el nombre.');
      return;
    }
    setDispositivos((actuales) => actuales.map((item) => item.id === id ? { ...item, nombrePersonalizado: data.nombrePersonalizado } : item));
    setEditando(null);
  };

  return (
    <section className="auditorias-vista">
      <header className="auditorias-cabecera">
        <div>
          <p>AUDITORÍAS</p>
          <h2>Dispositivos y accesos</h2>
          <small>Controla desde qué equipos se accede al sistema clínico.</small>
        </div>
        <button className="auditorias-actualizar" onClick={() => void cargar()} disabled={cargando}>
          <Icon name="audit" size={16} /> Actualizar
        </button>
      </header>

      <div className="auditorias-aviso">
        <Icon name="audit" size={18} />
        <span>El navegador no permite obtener la MAC real. Se registra un identificador seguro del equipo, su sistema, navegador e IP.</span>
      </div>

      {error && <p className="auditorias-error" role="alert">{error}</p>}
      {cargando ? <p className="auditorias-vacio">Cargando registros...</p> : (
        <div className="auditorias-grid">
          <section className="auditorias-panel">
            <div className="auditorias-panel-titulo">
              <div><h3>Equipos registrados</h3><small>{dispositivos.length} dispositivos detectados</small></div>
            </div>
            {dispositivos.length === 0 ? <p className="auditorias-vacio">Todavía no hay equipos registrados.</p> : dispositivos.map((item) => (
              <article className="dispositivo-card" key={item.id}>
                <span className="dispositivo-icono"><Icon name="building" size={21} /></span>
                <div className="dispositivo-datos">
                  <strong>{item.nombrePersonalizado || item.nombreSistema}</strong>
                  <small>{item.nombreSistema} · {item.plataforma}</small>
                  <small>IP {item.ip} · Último acceso {fecha(item.ultimoAcceso)}</small>
                  <small className="dispositivo-mac">MAC: no disponible desde navegador</small>
                </div>
                {editando === item.id ? (
                  <div className="dispositivo-edicion">
                    <input value={nombre} onChange={(event) => setNombre(event.target.value)} maxLength={100} autoFocus />
                    <button onClick={() => void guardarNombre(item.id)}>Guardar</button>
                    <button className="texto" onClick={() => setEditando(null)}>Cancelar</button>
                  </div>
                ) : (
                  <button className="dispositivo-renombrar" onClick={() => { setEditando(item.id); setNombre(item.nombrePersonalizado || ''); }}>
                    <Icon name="edit" size={15} /> Nombrar
                  </button>
                )}
              </article>
            ))}
          </section>

          <section className="auditorias-panel">
            <div className="auditorias-panel-titulo">
              <div><h3>Actividad reciente</h3><small>Últimos inicios de sesión</small></div>
            </div>
            {eventos.length === 0 ? <p className="auditorias-vacio">No hay actividad registrada.</p> : eventos.slice(0, 12).map((evento) => (
              <article className="evento-auditoria" key={evento.id}>
                <span><Icon name="check" size={14} /></span>
                <div><strong>{evento.usuarioNombre}</strong><small>{evento.detalle}</small></div>
                <time>{fecha(evento.creadoEn)}</time>
              </article>
            ))}
          </section>
        </div>
      )}
    </section>
  );
}
