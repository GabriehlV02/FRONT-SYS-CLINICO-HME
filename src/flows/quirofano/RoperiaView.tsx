import { useEffect, useRef, useState, type FormEvent } from "react";
import Icon from "../../radius/componentes/Icono";
import { guardarRoperia, leerRoperia, type ArticuloTextil } from "./almacenRoperia";
import "./RoperiaView.css";

const nuevoArticulo = (): ArticuloTextil => ({ id: crypto.randomUUID(), nombre: "", descripcion: "", material: "", tamano: "", color: "", imagen: "" });

export function RoperiaView() {
  const [articulos, setArticulos] = useState(leerRoperia);
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState<ArticuloTextil | null>(null);
  const [error, setError] = useState("");
  const [camara, setCamara] = useState(false);
  const [errorCamara, setErrorCamara] = useState("");
  const dialogo = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const capturaMovil = useRef<HTMLInputElement>(null);
  useEffect(() => { if (form && dialogo.current && !dialogo.current.open) dialogo.current.showModal(); }, [form]);
  useEffect(() => {
    if (!camara) return;
    let activa = true;
    let stream: MediaStream | undefined;
    if (!navigator.mediaDevices?.getUserMedia) { setErrorCamara("La cámara no está disponible. Puedes cargar una imagen o usar la cámara del dispositivo."); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } }).then((medio) => {
      if (!activa) { medio.getTracks().forEach((pista) => pista.stop()); return; }
      stream = medio;
      if (video.current) { video.current.srcObject = medio; void video.current.play().catch(() => undefined); }
    }).catch(() => { if (activa) setErrorCamara("No se pudo abrir la cámara. Revisa los permisos o carga una imagen."); });
    return () => { activa = false; stream?.getTracks().forEach((pista) => pista.stop()); };
  }, [camara]);
  const cerrar = () => { setCamara(false); setErrorCamara(""); setForm(null); setError(""); if (dialogo.current?.open) dialogo.current.close(); };
  const cargar = async (fichero?: File) => {
    if (!fichero) return;
    if (!fichero.type.startsWith("image/")) { setError("Selecciona un archivo de imagen válido."); return; }
    try {
      const bitmap = await createImageBitmap(fichero);
      const escala = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.max(1, Math.round(bitmap.width * escala)); lienzo.height = Math.max(1, Math.round(bitmap.height * escala));
      const contexto = lienzo.getContext("2d");
      if (!contexto) throw new Error("No se pudo procesar la imagen");
      contexto.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height); bitmap.close();
      const imagen = lienzo.toDataURL("image/jpeg", 0.8);
      setForm((actual) => actual && ({ ...actual, imagen })); setError("");
    } catch { setError("No se pudo cargar la imagen. Prueba con otro archivo."); }
  };
  const capturar = () => {
    const actual = video.current;
    if (!actual?.videoWidth || !actual.videoHeight) { setErrorCamara("Espera a que la cámara esté lista para tomar la foto."); return; }
    const escala = Math.min(1, 1200 / Math.max(actual.videoWidth, actual.videoHeight));
    const lienzo = document.createElement("canvas"); lienzo.width = Math.round(actual.videoWidth * escala); lienzo.height = Math.round(actual.videoHeight * escala);
    const contexto = lienzo.getContext("2d"); if (!contexto) { setErrorCamara("No se pudo tomar la foto."); return; }
    contexto.drawImage(actual, 0, 0, lienzo.width, lienzo.height);
    setForm((anterior) => anterior && ({ ...anterior, imagen: lienzo.toDataURL("image/jpeg", 0.8) })); setCamara(false); setErrorCamara("");
  };
  const guardar = (event: FormEvent) => {
    event.preventDefault(); if (!form || !form.nombre.trim()) return;
    const siguiente = [...articulos.filter((item) => item.id !== form.id), { ...form, nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), material: form.material.trim(), tamano: form.tamano.trim(), color: form.color.trim() }];
    try { guardarRoperia(siguiente); setArticulos(siguiente); cerrar(); } catch { setError("No se pudo guardar. Revisa el espacio disponible en este navegador."); }
  };
  const visibles = articulos.filter((item) => `${item.nombre} ${item.material} ${item.color} ${item.tamano}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase()));
  return <section className="roperia-vista">
    <header><div><p>ESTERILIZACIÓN · ROPERÍA</p><h2>Inventario de ropería quirúrgica</h2><small>Registra prendas e insumos textiles utilizados en procedimientos.</small></div><button type="button" onClick={() => { setForm(nuevoArticulo()); setError(""); }}><Icon name="plus" size={16} /> Registrar artículo</button></header>
    <div className="roperia-lista"><label className="roperia-busqueda"><Icon name="search" size={17} /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, material, tamaño o color" aria-label="Buscar en ropería" /></label>
      {visibles.length ? <div className="roperia-tabla-scroll"><table><thead><tr><th>Imagen</th><th>Nombre</th><th>Material</th><th>Tamaño</th><th>Color</th><th>Descripción</th><th>Acciones</th></tr></thead><tbody>{visibles.map((item) => <tr key={item.id}><td>{item.imagen ? <img className="roperia-miniatura" src={item.imagen} alt={`Imagen de ${item.nombre}`} /> : <span className="roperia-sin-imagen"><Icon name="image" size={20} /></span>}</td><td><strong>{item.nombre}</strong></td><td>{item.material || "—"}</td><td>{item.tamano || "—"}</td><td>{item.color || "—"}</td><td>{item.descripcion || "—"}</td><td><button type="button" onClick={() => { setForm({ ...item }); setError(""); }}>Ver / editar</button></td></tr>)}</tbody></table></div> : <div className="roperia-vacio"><strong>{articulos.length ? "No se encontraron artículos" : "Aún no hay artículos registrados"}</strong><span>{articulos.length ? "Prueba con otra búsqueda." : "Agrega una prenda o insumo textil para comenzar."}</span></div>}
    </div>
    <dialog ref={dialogo} className="roperia-dialogo" onClose={() => { setForm(null); setCamara(false); setErrorCamara(""); }}>
      {form && <form onSubmit={guardar}><header><div><p>ROPERÍA QUIRÚRGICA</p><h3>{articulos.some((item) => item.id === form.id) ? "Detalle del artículo" : "Registrar artículo textil"}</h3></div><button type="button" aria-label="Cerrar" onClick={cerrar}>×</button></header><div className="roperia-formulario">
        <div className="roperia-campos"><label>Nombre *<input autoFocus required maxLength={120} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Campo quirúrgico" /></label><label>Material<input maxLength={100} value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="Ej. Algodón" /></label><label>Tamaño<input maxLength={80} value={form.tamano} onChange={(e) => setForm({ ...form, tamano: e.target.value })} placeholder="Ej. 90 × 90 cm" /></label><label>Color<input maxLength={80} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Ej. Azul" /></label><label className="roperia-ancho">Descripción<textarea rows={3} maxLength={1000} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Características u observaciones" /></label></div>
        <div className="roperia-foto"><strong>Imagen del artículo</strong><span>Fotografía la prenda o selecciona una imagen guardada.</span><div className="roperia-foto-acciones"><button type="button" onClick={() => { setErrorCamara(""); setCamara(true); }}>Usar cámara</button><button type="button" onClick={() => archivo.current?.click()}>Cargar imagen</button></div><input className="roperia-oculto" ref={archivo} type="file" accept="image/*" onChange={(e) => { void cargar(e.target.files?.[0]); e.currentTarget.value = ""; }} /><input className="roperia-oculto" ref={capturaMovil} type="file" accept="image/*" capture="environment" onChange={(e) => { void cargar(e.target.files?.[0]); setCamara(false); e.currentTarget.value = ""; }} />
        {camara && <div className="roperia-camara"><video ref={video} autoPlay muted playsInline />{errorCamara && <p role="alert">{errorCamara}</p>}<div><button type="button" onClick={() => capturaMovil.current?.click()}>Cámara del dispositivo</button><button type="button" onClick={() => setCamara(false)}>Cancelar</button><button type="button" onClick={capturar}>Capturar foto</button></div></div>}
        {form.imagen && <div className="roperia-preview"><img src={form.imagen} alt="Vista previa del artículo" /><button type="button" onClick={() => setForm({ ...form, imagen: "" })}>Quitar imagen</button></div>}</div>
        {error && <p className="roperia-error" role="alert">{error}</p>}</div><footer><button type="button" onClick={cerrar}>Cancelar</button><button type="submit">Guardar artículo</button></footer></form>}
    </dialog>
  </section>;
}
