import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../radius/api';
import { obtenerPacientes, type PacienteDemo } from '../../../radius/datos/almacenDemo';

export const nombrePaciente = (p: PacienteDemo) => [p.nombres, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ');
const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function BuscadorPacienteInternacion({ valor, ciInicial, onCambiar, onSeleccionar }: {
  valor: string; ciInicial?: string; onCambiar: (valor: string) => void; onSeleccionar: (p: PacienteDemo) => void;
}) {
  const [pacientes, setPacientes] = useState<PacienteDemo[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [activo, setActivo] = useState(-1);
  const seleccionadoInicial = useRef(false);
  const seleccionar = useRef(onSeleccionar);
  seleccionar.current = onSeleccionar;
  useEffect(() => {
    let vigente = true;
    const locales = obtenerPacientes();
    setPacientes(locales);
    const actualizar = () => setPacientes(actuales => {
      const combinados = new Map(actuales.map(p => [p.id, p]));
      obtenerPacientes().forEach(p => combinados.set(p.id, p));
      return [...combinados.values()];
    });
    void apiFetch('/api/pacientes').then(async respuesta => {
      if (!respuesta.ok) throw new Error();
      const datos: unknown = await respuesta.json();
      if (!Array.isArray(datos)) throw new Error();
      if (vigente) {
        const combinados = new Map(locales.map(p => [p.numeroDocumento || p.id, p]));
        (datos as PacienteDemo[]).forEach(p => combinados.set(p.numeroDocumento || p.id, p));
        setPacientes([...combinados.values()]);
      }
    }).catch(() => { if (vigente) setAviso('No se pudo consultar el servidor. Se muestran los pacientes disponibles en este navegador.'); })
      .finally(() => { if (vigente) setCargando(false); });
    window.addEventListener('radiuus:datos-demo', actualizar);
    return () => { vigente = false; window.removeEventListener('radiuus:datos-demo', actualizar); };
  }, []);
  useEffect(() => {
    if (seleccionadoInicial.current || !ciInicial || cargando) return;
    const encontrado = pacientes.find(p => p.numeroDocumento === ciInicial);
    if (encontrado) { seleccionadoInicial.current = true; seleccionar.current(encontrado); }
  }, [pacientes, cargando, ciInicial]);
  const consulta = normalizar(valor);
  const coincidencias = consulta ? pacientes.filter(p => consulta.split(/\s+/).every(parte => normalizar(`${nombrePaciente(p)} ${p.numeroDocumento}`).includes(parte))).slice(0, 8) : [];
  const elegir = (p: PacienteDemo) => { onSeleccionar(p); setAbierto(false); setActivo(-1); };
  return <div className="internacion-buscador doble" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setAbierto(false); }}>
    <label htmlFor="internacion-nombre">Nombre y apellidos *</label>
    <input id="internacion-nombre" name="nombre" required pattern=".*\S.*" role="combobox" aria-autocomplete="list" aria-expanded={abierto && Boolean(consulta)} aria-controls="internacion-pacientes" aria-activedescendant={abierto && activo >= 0 && coincidencias[activo] ? `internacion-paciente-${activo}` : undefined} autoComplete="off" value={valor} placeholder="Escribe el nombre o CI para buscar un paciente" onFocus={() => setAbierto(true)} onChange={e => { onCambiar(e.target.value); setAbierto(true); setActivo(-1); }} onKeyDown={e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setAbierto(true); setActivo(i => coincidencias.length ? (i + (e.key === 'ArrowDown' ? 1 : -1) + coincidencias.length) % coincidencias.length : -1); }
      if (e.key === 'Enter' && abierto && activo >= 0 && coincidencias[activo]) { e.preventDefault(); elegir(coincidencias[activo]); }
      if (e.key === 'Escape' && abierto) { e.preventDefault(); e.stopPropagation(); setAbierto(false); }
    }} />
    {abierto && consulta && <div className="internacion-buscador-resultados"><ul id="internacion-pacientes" role="listbox" aria-label="Pacientes registrados">{coincidencias.map((p, i) => <li key={p.id} id={`internacion-paciente-${i}`} role="option" aria-selected={i === activo} onMouseDown={e => e.preventDefault()} onMouseMove={() => setActivo(i)} onClick={() => elegir(p)}><strong>{nombrePaciente(p)}</strong><span>CI {p.numeroDocumento} · {p.telefono || 'Sin teléfono'}</span></li>)}</ul>{!coincidencias.length && <p role="status">{cargando ? 'Buscando pacientes…' : 'Sin coincidencias. Puedes completar los datos como nuevo paciente.'}</p>}</div>}
    <small>{aviso || 'Busca por nombre, apellidos o CI y selecciona un paciente para cargar sus datos.'}</small>
  </div>;
}
