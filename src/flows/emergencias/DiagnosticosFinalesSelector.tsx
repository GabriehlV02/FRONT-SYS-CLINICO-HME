import { useMemo, useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import './DiagnosticosFinalesSelector.css';

type Diagnostico = { id: string; codigo: string; nombre: string };

// Adaptador temporal: sustituir este arreglo por la respuesta de la API CIE-11 OMS.
const catalogoTemporal: Diagnostico[] = [
  { id: '5A11', codigo: '5A11', nombre: 'Diabetes mellitus tipo 2' },
  { id: '5A10', codigo: '5A10', nombre: 'Diabetes mellitus tipo 1' },
  { id: '5A12', codigo: '5A12', nombre: 'Diabetes mellitus por desnutrición' },
  { id: '5A14', codigo: '5A14', nombre: 'Diabetes mellitus no especificada' },
  { id: 'BA00', codigo: 'BA00', nombre: 'Hipertensión esencial' },
  { id: 'CA40', codigo: 'CA40', nombre: 'Neumonía' },
  { id: '1A00', codigo: '1A00', nombre: 'Cólera' },
];

export function DiagnosticosFinalesSelector({ inicial = '' }: { inicial?: string }) {
  const [consulta, setConsulta] = useState('');
  const [seleccionados, setSeleccionados] = useState<Diagnostico[]>(inicial ? [{ id: 'previo', codigo: '', nombre: inicial }] : []);
  const resultados = useMemo(() => {
    const texto = consulta.trim().toLowerCase();
    if (texto.length < 3) return [];
    return catalogoTemporal.filter(item => `${item.codigo} ${item.nombre}`.toLowerCase().includes(texto)).sort((a, b) => {
      const ai = a.nombre.toLowerCase().indexOf(texto); const bi = b.nombre.toLowerCase().indexOf(texto);
      return ai - bi || a.nombre.localeCompare(b.nombre);
    }).slice(0, 20);
  }, [consulta]);
  const agregar = (item: Diagnostico) => { if (!seleccionados.some(actual => actual.id === item.id)) setSeleccionados(actual => [...actual, item]); setConsulta(''); };
  return <section className="em-diagnosticos-selector"><div className="em-diagnosticos-busqueda"><label><span>Buscar diagnóstico</span><div><Icon name="search" size={16}/><input value={consulta} onChange={e => setConsulta(e.target.value)} placeholder="Escribe al menos 3 letras, ej.: diab" autoComplete="off"/></div></label><small>Preparado para CIE-11 OMS · escribe 3 o más letras.</small>{consulta.trim().length >= 3 && <div className="em-diagnosticos-resultados">{resultados.length ? resultados.map(item => <button type="button" key={item.id} onClick={() => agregar(item)}><span><b>{item.codigo}</b>{item.nombre}</span><Icon name="plus" size={15}/></button>) : <p>Sin coincidencias en el catálogo temporal.</p>}</div>}</div><aside className="em-diagnosticos-lista"><header><span>DIAGNÓSTICOS SELECCIONADOS</span><b>{seleccionados.length}</b></header>{seleccionados.length ? seleccionados.map(item => <article key={item.id}><span>{item.codigo && <b>{item.codigo}</b>}{item.nombre}</span><button type="button" onClick={() => setSeleccionados(actual => actual.filter(diagnostico => diagnostico.id !== item.id))} aria-label={`Quitar ${item.nombre}`}>×</button></article>) : <p>Selecciona uno o más diagnósticos para esta atención.</p>}</aside></section>;
}
