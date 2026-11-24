import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { puntosSignoVital, type CampoGrafica, type MedicionGrafica } from "./datosGraficaSigno";
import "./GraficaSignoVital.css";
import { rangosReferencia } from "../triaje/rangosReferencia";

const fechaHora = (fecha: string) => new Date(fecha).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" });
const numero = (valor: number) => valor.toLocaleString("es-BO", { maximumFractionDigits: 2 });

export function GraficaSignoVital({ campo, mediciones, cerrar, nacimiento }: { campo: CampoGrafica; mediciones: readonly MedicionGrafica[]; cerrar: () => void; nacimiento?: string }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const elemento = dialogo.current;
    elemento?.showModal();
    return () => { elemento?.close(); anterior?.focus(); };
  }, []);
  const puntos = puntosSignoVital(campo, mediciones);
  const referencias: Record<string, string> = { temperatura: "temperatura-c", frecuenciaCardiaca: "pulso-0", frecuenciaRespiratoria: "respiracion", presionSistolica: "sistolica", presionDiastolica: "diastolica" };
  const rango = campo.rango === undefined ? rangosReferencia.find((r) => r.id === referencias[campo.id]) : campo.rango;
  const rangoValido = rango && Number.isFinite(rango.minimo) && Number.isFinite(rango.maximo) && rango.minimo < rango.maximo ? rango : null;
  const estado = (valor: number, instante: number) => {
    if (!rangoValido) return "sin-referencia";
    if (rangoValido.contexto) {
      const fechaNacimiento = nacimiento ? new Date(nacimiento.slice(0, 10) + "T00:00:00").getTime() : NaN;
      const fecha = new Date(instante);
      const adulto = new Date(fechaNacimiento); adulto.setFullYear(adulto.getFullYear() + 20);
      if (!rangoValido.contexto.toLocaleLowerCase().includes("adulto") || !Number.isFinite(fechaNacimiento) || instante < adulto.getTime() || fechaNacimiento > fecha.getTime()) return "sin-referencia";
    }
    return valor < rangoValido.minimo || valor > rangoValido.maximo ? "fuera" : "dentro";
  };
  const etiquetaEstado = (valor: number, instante: number) => ({ dentro: "Dentro del rango", fuera: "Fuera del rango", "sin-referencia": "Sin referencia aplicable" })[estado(valor, instante)];
  const valores = puntos.map((punto) => punto.valor);
  const minimo = puntos.length ? Math.min(...valores) : 0;
  const maximo = puntos.length ? Math.max(...valores) : 0;
  const margen = Math.max((maximo - minimo) * .15, Math.abs(maximo) * .03, 1);
  const referenciaAplicable = rangoValido && puntos.some((p) => estado(p.valor, p.instante) !== "sin-referencia") ? rangoValido : null;
  const base = Math.min(minimo, referenciaAplicable?.minimo ?? minimo) - margen;
  const tope = Math.max(maximo, referenciaAplicable?.maximo ?? maximo) + margen;
  const inicio = puntos[0]?.instante || 0;
  const duracion = (puntos.at(-1)?.instante || 0) - inicio;
  const posiciones = puntos.map((punto) => ({ ...punto, x: duracion ? 72 + (punto.instante - inicio) / duracion * 656 : 400, y: 250 - (punto.valor - base) / (tope - base) * 210 }));
  const ultimo = puntos.at(-1);
  return createPortal(<dialog ref={dialogo} className="signo-grafica-modal" aria-labelledby={titulo} onCancel={(e) => { e.preventDefault(); cerrar(); }} onClick={(e) => { if (e.target === e.currentTarget) { const caja = e.currentTarget.getBoundingClientRect(); if (e.clientX < caja.left || e.clientX > caja.right || e.clientY < caja.top || e.clientY > caja.bottom) cerrar(); } }}>
    <header><div><span>EVOLUCIÓN DE SIGNOS VITALES</span><h2 id={titulo}>{campo.etiqueta}</h2><p>{campo.unidad ? `Unidad: ${campo.unidad} · ` : ""}{puntos.length} mediciones disponibles</p></div><button type="button" onClick={cerrar} aria-label="Cerrar gráfica">×</button></header>
    {ultimo ? <>
      <div className="signo-grafica-resumen"><article className={`estado-${estado(ultimo.valor, ultimo.instante)}`}><span>Última medición</span><strong>{numero(ultimo.valor)} {campo.unidad}</strong><b className="signo-estado-etiqueta">{etiquetaEstado(ultimo.valor, ultimo.instante)}</b><small>{fechaHora(ultimo.fecha)}</small></article><article><span>Mínimo registrado</span><strong>{numero(minimo)} {campo.unidad}</strong></article><article><span>Máximo registrado</span><strong>{numero(maximo)} {campo.unidad}</strong></article></div>
      <div className="signo-grafica-leyenda"><span className="estado-dentro">● Dentro del rango</span><span className="estado-fuera">● Fuera del rango</span><span>● Sin referencia aplicable</span></div>
      <p className="signo-grafica-referencia">{referenciaAplicable ? `Referencia: ${numero(referenciaAplicable.minimo)}–${numero(referenciaAplicable.maximo)} ${campo.unidad || ""}. ${referenciaAplicable.contexto || "Rango configurado para este signo."}` : "Sin rango aplicable al contexto del paciente. Las mediciones se muestran en azul."}</p>
      <figure><svg viewBox="0 0 800 300" role="img" aria-label={`Evolución de ${campo.etiqueta}. ${puntos.length} mediciones. Valores detallados en la tabla inferior.`}>
        {Array.from({ length: 5 }, (_, i) => { const valor = base + (tope - base) * i / 4; const y = 250 - i * 210 / 4; return <g key={i}><line x1="72" x2="728" y1={y} y2={y} className="signo-grafica-guia" /><text x="62" y={y + 4} textAnchor="end">{numero(valor)}</text></g>; })}
        {referenciaAplicable && <rect x="72" width="656" y={250 - (referenciaAplicable.maximo - base) / (tope - base) * 210} height={(referenciaAplicable.maximo - referenciaAplicable.minimo) / (tope - base) * 210} className="signo-grafica-rango" />}
        {posiciones.map((punto, indice) => { const anterior = posiciones[indice - 1]; const color = estado(punto.valor, punto.instante); return <g key={punto.id} className={`estado-${color}`}>
          {anterior && <line x1={anterior.x} y1={anterior.y} x2={punto.x} y2={punto.y} className="signo-grafica-segmento" />}
          <circle cx={punto.x} cy={punto.y} r="11" className="signo-grafica-halo" />
          <circle cx={punto.x} cy={punto.y} r="5" className="signo-grafica-punto"><title>{fechaHora(punto.fecha)}: {numero(punto.valor)} {campo.unidad} · {etiquetaEstado(punto.valor, punto.instante)}</title></circle>
          {(posiciones.length <= 10 || indice === posiciones.length - 1) && <text x={punto.x} y={punto.y - 16} textAnchor="middle" className="signo-grafica-valor">{numero(punto.valor)}</text>}
        </g>; })}
        <text x="72" y="281">{fechaHora(puntos[0].fecha)}</text>{duracion > 0 && <text x="728" y="281" textAnchor="end">{fechaHora(ultimo.fecha)}</text>}
      </svg><figcaption>Fecha y hora de registro · {campo.unidad || "Valor registrado"}{puntos.length === 1 ? " · Se requiere otra medición para mostrar la evolución." : ""}</figcaption></figure>
      <div className="signo-grafica-datos"><table><caption>Mediciones de {campo.etiqueta}</caption><thead><tr><th scope="col">Fecha y hora</th><th scope="col">Valor {campo.unidad ? `(${campo.unidad})` : ""}</th></tr></thead><tbody>{puntos.map((punto) => <tr key={punto.id}><td>{fechaHora(punto.fecha)}</td><td>{numero(punto.valor)}</td></tr>)}</tbody></table></div>
    </> : <p className="signo-grafica-vacia">No hay valores numéricos registrados para este signo vital.</p>}
    <footer><button type="button" onClick={cerrar}>Cerrar gráfica</button></footer>
  </dialog>, document.body);
}
