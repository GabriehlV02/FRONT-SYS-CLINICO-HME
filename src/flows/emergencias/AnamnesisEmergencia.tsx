import { useEffect, useRef, useState } from 'react';
import Icon from '../../radius/componentes/Icono';
import './AnamnesisEmergencia.css';

type Foto = { id: string; nombre: string; url: string };
export default function AnamnesisEmergencia({ cuentaId, cerrada, inicial = '' }: { cuentaId: string; cerrada: boolean; inicial?: string }) {
  const clave = `anamnesis-borrador-${cuentaId}`;
  const [datos, setDatos] = useState<{ relato: string; fotos: Foto[]; impresion?: string }>(() => {
    try { return JSON.parse(sessionStorage.getItem(clave) || 'null') || { relato: inicial, fotos: [] }; }
    catch { return { relato: inicial, fotos: [] }; }
  });
  const [aviso, setAviso] = useState('');
  const [sugerencias, setSugerencias] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('impresiones-demo') || '[]'); } catch { return []; }
  });
  function recordarImpresion() {
    const texto = datos.impresion?.trim();
    if (!texto) return;
    const nuevas = [texto, ...sugerencias.filter(s => s !== texto)].slice(0, 50);
    setSugerencias(nuevas);
    try { sessionStorage.setItem('impresiones-demo', JSON.stringify(nuevas)); } catch { /* El relato conserva su propio aviso de almacenamiento. */ }
  }
  const [cargando, setCargando] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const vigente = useRef(true);
  const [camara, setCamara] = useState(false);
  const [captura, setCaptura] = useState('');
  useEffect(() => { vigente.current = true; return () => { vigente.current = false; stream.current?.getTracks().forEach(t => t.stop()); }; }, []);
  useEffect(() => { if (camara && !captura && video.current && stream.current) video.current.srcObject = stream.current; }, [camara, captura]);
  function cerrarCamara() { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setCamara(false); setCaptura(''); }
  async function fotografiar() {
    if (captura) {
      actualizar({ ...datos, fotos: [...datos.fotos, { id: crypto.randomUUID(), nombre: `Fotografía ${new Date().toLocaleString('es-BO')}`, url: captura }] });
      cerrarCamara(); return;
    }
    if (camara) {
      const fuente = video.current;
      if (!fuente?.videoWidth) { setAviso('Espera a que la cámara esté lista.'); return; }
      const canvas = document.createElement('canvas');
      const escala = Math.min(1, 1280 / fuente.videoWidth);
      canvas.width = Math.round(fuente.videoWidth * escala); canvas.height = Math.round(fuente.videoHeight * escala);
      canvas.getContext('2d')?.drawImage(fuente, 0, 0, canvas.width, canvas.height);
      const imagen = canvas.toDataURL('image/jpeg', .75);
      if (imagen.length > 1066666) { setAviso('La imagen es demasiado grande. Intenta cargar una imagen de hasta 800 KB.'); return; }
      setCaptura(imagen); stream.current?.getTracks().forEach(t => t.stop()); return;
    }
    if (datos.fotos.length >= 3) { setAviso('Puedes adjuntar hasta 3 imágenes.'); return; }
    setCargando(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara requiere localhost o una conexión HTTPS compatible.');
      const medio = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (!vigente.current) { medio.getTracks().forEach(t => t.stop()); return; }
      stream.current = medio; setCamara(true); setAviso('');
    } catch { setAviso('No se pudo abrir la cámara. Revisa el permiso del navegador y que no esté ocupada.'); }
    finally { if (vigente.current) setCargando(false); }
  }
  function actualizar(nuevo: typeof datos) {
    setDatos(nuevo);
    try { sessionStorage.setItem(clave, JSON.stringify(nuevo)); setAviso('Borrador guardado en esta pestaña.'); }
    catch { setAviso('No se pudo guardar el borrador: almacenamiento lleno. Reduce los adjuntos antes de salir.'); }
  }
  async function adjuntar(archivos: FileList | null) {
    if (!archivos?.length) return;
    if (datos.fotos.length + archivos.length > 3) { setAviso('Puedes adjuntar hasta 3 imágenes.'); return; }
    setCargando(true);
    try {
      const fotos: Foto[] = [];
      for (const archivo of Array.from(archivos)) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || archivo.size > 800000) throw new Error('Usa imágenes JPG, PNG o WebP de hasta 800 KB cada una.');
        const url = await new Promise<string>((resolve, reject) => {
          const lector = new FileReader();
          lector.onload = () => resolve(String(lector.result));
          lector.onerror = () => reject(new Error('No se pudo leer la imagen.'));
          lector.readAsDataURL(archivo);
        });
        fotos.push({ id: crypto.randomUUID(), nombre: archivo.name, url });
      }
      actualizar({ ...datos, fotos: [...datos.fotos, ...fotos] });
    } catch (error) { setAviso(error instanceof Error ? error.message : 'No se pudo adjuntar la imagen.'); }
    finally { setCargando(false); }
  }
  return <details open className="em-panel em-anamnesis em-panel-plegable" onToggle={e => { if (!e.currentTarget.open) cerrarCamara(); }}>
    <summary className="em-panel-titulo"><h3 id="em-anamnesis-titulo">Anamnesis · Relato cronológico</h3></summary>
    <div className="anamnesis-edicion"><div className="anamnesis-texto">
    <textarea id="anamnesis-relato" aria-label="Relato del paciente o acompañante" rows={7} maxLength={20000} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} value={datos.relato} disabled={cerrada || cargando} onChange={e => actualizar({ ...datos, relato: e.target.value })} placeholder="Registra el motivo de consulta, qué ocurrió, cómo y por qué llegó a emergencias, y quién proporciona el relato (paciente, familiar, bomberos u otra persona)." />
    <div className="anamnesis-impresion">
      <label htmlFor="anamnesis-impresion">Impresión diagnóstica</label>
      <input id="anamnesis-impresion" type="text" list="anamnesis-impresiones" maxLength={500} disabled={cerrada || cargando} value={datos.impresion || ''} placeholder="Escribe o selecciona una impresión diagnóstica…" aria-describedby="anamnesis-palabras" onBlur={recordarImpresion} onChange={e => {
        const texto = e.target.value;
        if (texto.trim().split(/\s+/).filter(Boolean).length > 20) { setAviso('La impresión diagnóstica admite hasta 20 palabras.'); return; }
        actualizar({ ...datos, impresion: texto });
      }} />
      <datalist id="anamnesis-impresiones">{sugerencias.map(s => <option key={s} value={s} />)}</datalist>
      <small id="anamnesis-palabras">{(datos.impresion || '').trim().split(/\s+/).filter(Boolean).length}/20 palabras</small>
    </div>
    </div>{!cerrada && <fieldset disabled={cargando}><legend>Adjuntar imágenes</legend>
      <label className="anamnesis-adjuntar"><Icon name="image" size={19}/><span>Cargar imagen</span><input aria-label="Cargar imagen" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { void adjuntar(e.target.files); e.target.value = ''; }} /></label>
      <button type="button" className="anamnesis-camara" onClick={() => void fotografiar()}><Icon name="image" size={19}/>{captura ? 'Aceptar' : camara ? 'Tomar imagen' : 'Tomar fotografía'}</button>
      {camara && <><div className="anamnesis-preview">{captura ? <img src={captura} alt="Fotografía pendiente de aceptar" /> : <video ref={video} autoPlay playsInline muted />}</div><button type="button" onClick={cerrarCamara}>Cancelar</button></>}
      <small>Hasta 3 imágenes de 800 KB. La cámara se abrirá en dispositivos compatibles.</small>
    </fieldset>}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{datos.fotos.map(foto => <figure key={foto.id} style={{ margin: '12px 0', maxWidth: 200 }}><a href={foto.url} target="_blank" rel="noreferrer"><img src={foto.url} alt={foto.nombre} style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 8 }} /></a><figcaption style={{ overflowWrap: 'anywhere' }}>{foto.nombre}</figcaption>{!cerrada && <button type="button" disabled={cargando} onClick={() => actualizar({ ...datos, fotos: datos.fotos.filter(f => f.id !== foto.id) })}>Quitar imagen</button>}</figure>)}</div>
    <p className="anamnesis-estado" role="status">{cargando ? 'Adjuntando imagen…' : aviso}</p>
  </details>;
}
