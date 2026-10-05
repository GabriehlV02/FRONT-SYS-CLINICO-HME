import { useEffect, useId, useRef, useState } from 'react';

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export function SelectorUnidad({ valor, unidades, abreviaturas, onChange, onSelect }: { valor: string; unidades: string[]; abreviaturas: Record<string, string>; onChange: (valor: string) => void; onSelect: (valor: string) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [filtrar, setFiltrar] = useState(false);
  const [activo, setActivo] = useState(-1);
  const etiqueta = (unidad: string) => abreviaturas[unidad] ? `${unidad} (${abreviaturas[unidad]})` : unidad;
  const opciones = unidades.filter((unidad) => !filtrar || normalizar(`${etiqueta(unidad)} ${unidad === 'Grados Celsius' ? 'grados centígrados C°' : ''}`).includes(normalizar(valor.trim())));
  const abrir = () => { setAbierto(true); setFiltrar(false); setActivo(-1); };
  const seleccionar = (unidad: string) => { onSelect(unidad); setAbierto(false); setActivo(-1); };

  useEffect(() => {
    if (abierto && activo >= 0) lista.current?.children[activo]?.scrollIntoView({ block: 'nearest' });
  }, [abierto, activo]);

  return <div className="config-signos-unidad" onBlur={(evento) => {
    if (!evento.currentTarget.contains(evento.relatedTarget)) setAbierto(false);
  }}>
    <label htmlFor={id}>Unidad de medida *</label>
    <div className="config-signos-unidad-control">
      <input ref={input} id={id} role="combobox" aria-expanded={abierto} aria-controls={`${id}-lista`} aria-autocomplete="list"
        aria-activedescendant={abierto && activo >= 0 && opciones[activo] ? `${id}-opcion-${activo}` : undefined}
        aria-describedby={`${id}-ayuda`} autoComplete="off" value={valor} maxLength={80} required
        placeholder="Selecciona o escribe una unidad" onFocus={abrir} onClick={() => { if (!abierto) abrir(); }}
        onChange={(evento) => { onChange(evento.target.value); setFiltrar(true); setAbierto(true); setActivo(-1); }}
        onKeyDown={(evento) => {
          if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
            evento.preventDefault();
            if (!abierto) { abrir(); return; }
            setActivo((anterior) => opciones.length ? (anterior + (evento.key === 'ArrowDown' ? 1 : anterior < 0 ? 0 : -1) + opciones.length) % opciones.length : -1);
          } else if (evento.key === 'Enter' && abierto && activo >= 0 && opciones[activo]) {
            evento.preventDefault(); seleccionar(opciones[activo]);
          } else if (evento.key === 'Escape' && abierto) {
            evento.preventDefault(); evento.stopPropagation(); setAbierto(false);
          } else if (evento.key === 'Tab') setAbierto(false);
        }} />
      <button type="button" tabIndex={-1} aria-label={abierto ? 'Cerrar unidades' : 'Mostrar unidades'} aria-controls={`${id}-lista`} aria-expanded={abierto}
        onMouseDown={(evento) => evento.preventDefault()} onClick={() => { input.current?.focus(); if (abierto) setAbierto(false); else abrir(); }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ transform: abierto ? 'rotate(180deg)' : undefined }}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {abierto && <ul ref={lista} id={`${id}-lista`} role="listbox" aria-label="Unidades de medida" className="config-signos-unidad-lista">
        {opciones.map((unidad, indice) => <li key={unidad} id={`${id}-opcion-${indice}`} role="option" aria-selected={valor === unidad}
          className={activo === indice ? 'activa' : undefined} onMouseDown={(evento) => evento.preventDefault()}
          onClick={() => seleccionar(unidad)}>{etiqueta(unidad)}{valor === unidad && <span aria-hidden="true">✓</span>}</li>)}
        {!opciones.length && <li className="config-signos-unidad-vacia" role="presentation">Sin coincidencias. Puedes usar la unidad que escribiste.</li>}
      </ul>}
    </div>
    <small id={`${id}-ayuda`}>Puedes elegir una unidad existente o escribir una nueva.</small>
  </div>;
}
