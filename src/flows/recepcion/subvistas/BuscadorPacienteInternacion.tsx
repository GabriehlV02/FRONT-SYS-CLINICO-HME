import { useEffect, useRef, useState, useId } from 'react';
import { usePacientes } from '../../../radius/vistas/pacientes/usePacientes';
import ModalRegistroPaciente from '../../../radius/vistas/pacientes/ModalRegistroPaciente';
import { type PacienteDemo } from '../../../radius/datos/almacenDemo';

import { pacienteParaVista } from '../../../radius/vistas/pacientes/pacientesApi';

export const nombrePaciente = (p: PacienteDemo) => [p.nombres, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ');
const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function BuscadorPacienteInternacion({ valor, ci, ciInicial, onCambiar, onSeleccionar, requerido = true }: {
  valor: string; ci: string; ciInicial?: string; onCambiar: (valor: string) => void; onSeleccionar: (p: PacienteDemo) => void; requerido?: boolean;
}) {
  const { pacientes: fichas, cargandoPacientes: cargando, errorPacientes: aviso } = usePacientes();
  const pacientes = fichas.map(pacienteParaVista);
  const campoId = useId();
  const listaId = campoId + "-opciones";
  const [registrando, setRegistrando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const seleccionadoInicial = useRef(false);
  const seleccionar = useRef(onSeleccionar);
  seleccionar.current = onSeleccionar;
  useEffect(() => {
    if (seleccionadoInicial.current || !ciInicial || cargando) return;
    const encontrado = pacientes.find(p => p.numeroDocumento === ciInicial);
    if (encontrado) { seleccionadoInicial.current = true; seleccionar.current(encontrado); }
  }, [pacientes, cargando, ciInicial]);
  useEffect(() => {
    const documento = normalizar(ci);
    if (!documento) return;
    const encontrado = pacientes.find(p => normalizar(p.numeroDocumento) === documento);
    if (encontrado) seleccionar.current(encontrado);
  }, [fichas, ci]);
  const consulta = normalizar(valor);
  const coincidencias = consulta ? pacientes.filter(p => consulta.split(/\s+/).every(parte => normalizar(`${nombrePaciente(p)} ${p.numeroDocumento}`).includes(parte))).slice(0, 8) : [];
  const elegir = (p: PacienteDemo) => { onSeleccionar(p); setAbierto(false); setActivo(-1); };
  return <div className="internacion-buscador doble" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setAbierto(false); }}>
    <label htmlFor={campoId}>Nombre y apellidos{requerido ? ' *' : ''}</label>
    <input id={campoId} name="nombre" required={requerido} pattern=".*\S.*" role="combobox" aria-autocomplete="list" aria-expanded={abierto && Boolean(consulta)} aria-controls={listaId} aria-activedescendant={abierto && activo >= 0 && coincidencias[activo] ? `${listaId}-${activo}` : undefined} autoComplete="off" value={valor} placeholder="Escribe el nombre o CI para buscar un paciente" onFocus={() => setAbierto(true)} onChange={e => { onCambiar(e.target.value); setAbierto(true); setActivo(-1); }} onKeyDown={e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setAbierto(true); setActivo(i => coincidencias.length ? (i + (e.key === 'ArrowDown' ? 1 : -1) + coincidencias.length) % coincidencias.length : -1); }
      if (e.key === 'Enter' && abierto && activo >= 0 && coincidencias[activo]) { e.preventDefault(); elegir(coincidencias[activo]); }
      if (e.key === 'Escape' && abierto) { e.preventDefault(); e.stopPropagation(); setAbierto(false); }
    }} />
    {abierto && consulta && <div className="internacion-buscador-resultados"><ul id={listaId} role="listbox" aria-label="Pacientes registrados">{coincidencias.map((p, i) => <li key={p.id} id={`${listaId}-${i}`} role="option" aria-selected={i === activo} onMouseDown={e => e.preventDefault()} onMouseMove={() => setActivo(i)} onClick={() => elegir(p)}><strong>{nombrePaciente(p)}</strong><span>CI {p.numeroDocumento} · {p.telefono || 'Sin teléfono'}</span></li>)}</ul>{!coincidencias.length && <p role="status">{cargando ? 'Buscando pacientes…' : 'Sin coincidencias. Utiliza Registrar paciente para crear su ficha.'}</p>}</div>}
    <small>{aviso || 'Busca por nombre, apellidos o CI y selecciona un paciente para cargar sus datos.'}</small>
    <button type="button" onClick={() => setRegistrando(true)}>Registrar paciente</button>
    {registrando && <ModalRegistroPaciente onCerrar={() => setRegistrando(false)} onRegistrado={p => elegir(pacienteParaVista(p))} />}
  </div>;
}
