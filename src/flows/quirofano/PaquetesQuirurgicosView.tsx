import { useEffect, useState, type FormEvent } from "react";
import { useProfesionales } from "../../radius/profesionales";
import { leerCatalogoCirugias } from "./catalogoCirugiasAdmin";
import { leerRoperia } from "./almacenRoperia";
import type { KitEsteril, MaterialEsteril } from "./almacenEsterilizacion";
import type { CirugiaProgramada } from "./cronogramaQuirofano";
import "./PaquetesQuirurgicosView.css";

type Parte = { id: string; nombre: string; cantidad: number };
type Paquete = { id: string; nombre: string; descripcion: string; cajas: Parte[]; instrumentos: Parte[]; ropa: Parte[]; insumos: Parte[]; medicos: Parte[]; cirugias: Parte[] };
type Grupo = "cajas" | "instrumentos" | "ropa" | "insumos" | "medicos" | "cirugias";
const CLAVE = "hme-paquetes-esterilizacion-v1";
const nuevo = (): Paquete => ({ id: crypto.randomUUID(), nombre: "", descripcion: "", cajas: [], instrumentos: [], ropa: [], insumos: [], medicos: [], cirugias: [] });
const leer = (): Paquete[] => {
  try { const valor: unknown = JSON.parse(localStorage.getItem(CLAVE) || "[]"); return Array.isArray(valor) ? valor : []; } catch { return []; }
};

export function PaquetesQuirurgicosView({ materiales, cajas, cirugiasProgramadas }: { materiales: MaterialEsteril[]; cajas: KitEsteril[]; cirugiasProgramadas: CirugiaProgramada[] }) {
  const [paquetes, setPaquetes] = useState<Paquete[]>(leer);
  const [form, setForm] = useState<Paquete | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!form && !detalle) return;
    const cerrar = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setForm(null); setDetalle(null); }
    };
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [form, detalle]);
  const { medicos } = useProfesionales();
  const cirugias = [
    ...leerCatalogoCirugias().map((c) => ({ id: `catalogo:${c.id}`, nombre: `${c.nombre} · ${c.codigo}` })),
    ...cirugiasProgramadas.map((c) => ({ id: `programada:${c.id}`, nombre: `${c.tipo} · ${c.fecha} ${c.hora} · ${c.paciente}` })),
  ];
  const opciones: Record<"cajas" | "instrumentos" | "ropa" | "medicos" | "cirugias", { id: string; nombre: string }[]> = {
    cajas: cajas.map((c) => ({ id: c.id, nombre: c.nombre })),
    instrumentos: materiales.map((m) => ({ id: m.id, nombre: `${m.nombre} · ${m.codigo}` })),
    ropa: leerRoperia().map((r) => ({ id: r.id, nombre: [r.nombre, r.tamano, r.color].filter(Boolean).join(" · ") })),
    medicos: medicos.map((m) => ({ id: m.id, nombre: m.nombre })),
    cirugias,
  };
  const etiquetas: Record<Grupo, string> = { cajas: "Cajas quirúrgicas", instrumentos: "Instrumentos sueltos", ropa: "Ropería", insumos: "Medicamentos e insumos especiales", medicos: "Médicos", cirugias: "Cirugías asociadas" };
  const grupos: Grupo[] = ["cajas", "instrumentos", "ropa", "insumos", "medicos", "cirugias"];
  const guardar = (event: FormEvent) => {
    event.preventDefault();
    if (!form || !form.nombre.trim()) return;
    if (paquetes.some((p) => p.id !== form.id && p.nombre.trim().toLocaleLowerCase() === form.nombre.trim().toLocaleLowerCase())) { setError("Ya existe un paquete con ese nombre."); return; }
    if (!grupos.some((grupo) => form[grupo].length)) { setError("Agrega al menos un componente o una asociación al paquete."); return; }
    const siguiente = [...paquetes.filter((p) => p.id !== form.id), { ...form, nombre: form.nombre.trim(), descripcion: form.descripcion.trim() }];
    try { localStorage.setItem(CLAVE, JSON.stringify(siguiente)); setPaquetes(siguiente); setForm(null); setError(""); } catch { setError("No se pudo guardar el paquete. Revisa el almacenamiento del navegador."); }
  };
  const agregar = (grupo: Grupo, parte: Parte) => setForm((actual) => actual && !actual[grupo].some((p) => p.id === parte.id) ? { ...actual, [grupo]: [...actual[grupo], parte] } : actual);
  const quitar = (grupo: Grupo, id: string) => setForm((actual) => actual && ({ ...actual, [grupo]: actual[grupo].filter((p) => p.id !== id) }));
  const cantidad = (grupo: Grupo, id: string, valor: number) => setForm((actual) => actual && ({ ...actual, [grupo]: actual[grupo].map((p) => p.id === id ? { ...p, cantidad: valor } : p) }));
  const seleccionado = paquetes.find((p) => p.id === detalle);
  return <section className="est-panel pq-panel">
    <header><div><h3>Paquetes quirúrgicos</h3><p>Organiza los recursos y asociaciones de cada paquete.</p></div><button className="est-principal" type="button" onClick={() => { setForm(nuevo()); setError(""); }}>+ Crear paquete</button></header>
    {paquetes.length ? <div className="pq-lista">{paquetes.map((p) => <article className="pq-tarjeta" key={p.id}>
      <div><span className="pq-etiqueta">PAQUETE QUIRÚRGICO</span><h4>{p.nombre}</h4><p>{p.descripcion || "Sin descripción"}</p><small>{p.cajas.length} cajas · {p.instrumentos.length} instrumentos · {p.ropa.length + p.insumos.length} otros recursos</small></div>
      <div className="pq-acciones"><button type="button" onClick={() => setDetalle(p.id)}>Ver detalle</button><button type="button" onClick={() => { setForm(structuredClone(p)); setError(""); }}>Editar</button></div>
    </article>)}</div> : <div className="pq-vacio"><strong>Aún no hay paquetes quirúrgicos</strong><p>Crea un paquete para reunir cajas, material y recursos asociados a tus cirugías.</p></div>}
    {seleccionado && <div className="pq-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetalle(null); }}><section className="pq-dialogo" role="dialog" aria-modal="true" aria-labelledby="pq-detalle-titulo"><header><div><span>PAQUETE QUIRÚRGICO</span><h3 id="pq-detalle-titulo">{seleccionado.nombre}</h3></div><button type="button" aria-label="Cerrar" onClick={() => setDetalle(null)}>×</button></header><div className="pq-contenido"><p>{seleccionado.descripcion || "Sin descripción"}</p><div className="pq-detalles">{grupos.map((grupo) => <section key={grupo}><h4>{etiquetas[grupo]}</h4>{seleccionado[grupo].length ? <ul>{seleccionado[grupo].map((p) => <li key={p.id}><span>{p.nombre}</span>{grupo !== "medicos" && grupo !== "cirugias" && <strong>× {p.cantidad}</strong>}</li>)}</ul> : <p>Sin elementos asociados</p>}</section>)}</div></div><footer><button type="button" onClick={() => setDetalle(null)}>Cerrar</button><button className="est-principal" type="button" onClick={() => { setForm(structuredClone(seleccionado)); setDetalle(null); setError(""); }}>Editar paquete</button></footer></section></div>}
    {form && <div className="pq-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setForm(null); }}><form className="pq-dialogo" role="dialog" aria-modal="true" aria-labelledby="pq-form-titulo" onSubmit={guardar}><header><div><span>ESTERILIZACIÓN</span><h3 id="pq-form-titulo">{paquetes.some((p) => p.id === form.id) ? "Editar paquete quirúrgico" : "Crear paquete quirúrgico"}</h3></div><button type="button" aria-label="Cerrar" onClick={() => setForm(null)}>×</button></header><div className="pq-contenido">
      <div className="pq-campos"><label>Nombre del paquete *<input autoFocus required maxLength={120} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Paquete de cirugía general" /></label><label>Descripción / observaciones<input maxLength={250} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Describe su uso" /></label></div>
      <div className="pq-grupos">{grupos.map((grupo) => <section className="pq-grupo" key={grupo}><h4>{etiquetas[grupo]}</h4>
        {grupo === "insumos" ? <AgregarLibre key={`${form.id}-${grupo}`} onAgregar={(nombre) => agregar(grupo, { id: crypto.randomUUID(), nombre, cantidad: 1 })} placeholder="Ej. Medicamento o insumo" /> : <select aria-label={`Agregar ${etiquetas[grupo]}`} value="" onChange={(e) => { const elegido = opciones[grupo].find((p) => p.id === e.target.value); if (elegido) agregar(grupo, { ...elegido, cantidad: 1 }); }}><option value="">{grupo === "ropa" && !opciones.ropa.length ? "Registra artículos en Ropería" : "Seleccionar para agregar"}</option>{opciones[grupo].filter((p) => !form[grupo].some((a) => a.id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>}
        {form[grupo].length ? <ul>{form[grupo].map((p) => <li key={p.id}><span>{p.nombre}</span>{grupo !== "medicos" && grupo !== "cirugias" && <label className="pq-cantidad">Cant. <input aria-label={`Cantidad de ${p.nombre}`} type="number" min="1" step="1" required value={p.cantidad || ""} onChange={(e) => cantidad(grupo, p.id, Number(e.target.value))} /></label>}<button type="button" className="pq-quitar" aria-label={`Quitar ${p.nombre}`} onClick={() => quitar(grupo, p.id)}>×</button></li>)}</ul> : <p className="pq-ayuda">Sin elementos agregados</p>}
      </section>)}</div>{error && <p className="pq-error" role="alert">{error}</p>}</div><footer><button type="button" onClick={() => setForm(null)}>Cancelar</button><button className="est-principal" type="submit">Guardar paquete</button></footer></form></div>}
  </section>;
}

function AgregarLibre({ onAgregar, placeholder }: { onAgregar: (nombre: string) => void; placeholder: string }) {
  const [valor, setValor] = useState("");
  return <div className="pq-agregar"><input value={valor} onChange={(e) => setValor(e.target.value)} placeholder={placeholder} aria-label={placeholder} /><button type="button" onClick={() => { if (valor.trim()) { onAgregar(valor.trim()); setValor(""); } }}>Agregar</button></div>;
}
