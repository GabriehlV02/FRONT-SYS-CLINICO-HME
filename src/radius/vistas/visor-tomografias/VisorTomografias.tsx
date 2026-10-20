import { useMemo, useRef, useState, type CSSProperties } from 'react';
import Icon from '../../componentes/Icono';
import './VisorTomografias.css';
import './VisorTomografiasOverrides.css';

type Plano = 'Axial' | 'Coronal' | 'Sagital';
type Herramienta = 'navegar' | 'ventana' | 'medir';

const SERIES: { plano: Plano; detalle: string; cortes: number }[] = [
  { plano: 'Axial', detalle: 'Tórax · 1 mm · Sin contraste', cortes: 186 },
  { plano: 'Coronal', detalle: 'Tórax · MPR · 3 mm', cortes: 74 },
  { plano: 'Sagital', detalle: 'Tórax · MPR · 3 mm', cortes: 68 },
];
const PRESETS = [
  { nombre: 'Pulmón', nivel: -600, ancho: 1500 },
  { nombre: 'Mediastino', nivel: 40, ancho: 400 },
  { nombre: 'Hueso', nivel: 400, ancho: 1800 },
];

export default function VisorTomografias() {
  const [serie, setSerie] = useState(0);
  const [corte, setCorte] = useState(92);
  const [zoom, setZoom] = useState(100);
  const [nivel, setNivel] = useState(40);
  const [ancho, setAncho] = useState(400);
  const [invertido, setInvertido] = useState(false);
  const [rotacion, setRotacion] = useState(0);
  const [herramienta, setHerramienta] = useState<Herramienta>('navegar');
  const [medicion, setMedicion] = useState(false);
  const [maximizado, setMaximizado] = useState(false);
  const estacion = useRef<HTMLElement>(null);
  const actual = SERIES[serie];
  const estiloImagen = useMemo(() => ({
    '--ct-zoom': `${zoom / 100}`,
    '--ct-rotacion': `${rotacion}deg`,
    '--ct-brillo': `${Math.max(72, Math.min(130, 100 + nivel / 12))}%`,
    '--ct-contraste': `${Math.max(75, Math.min(190, 100 + ancho / 11))}%`,
    '--ct-invertir': invertido ? '1' : '0',
  } as CSSProperties), [ancho, invertido, nivel, rotacion, zoom]);
  const restablecer = () => { setZoom(100); setNivel(40); setAncho(400); setInvertido(false); setRotacion(0); setHerramienta('navegar'); setMedicion(false); };
  const alternarPantallaCompleta = async () => {
    if (!document.fullscreenElement) { await estacion.current?.requestFullscreen(); setMaximizado(true); }
    else { await document.exitFullscreen(); setMaximizado(false); }
  };

  return <section className="ct-visor" aria-label="Visor de tomografías">
    <section className="ct-estacion" ref={estacion}>
      <aside className="ct-series"><header><strong>Series del estudio</strong><span>3</span></header>{SERIES.map((item, indice) => <button type="button" key={item.plano} className={serie === indice ? 'activo' : ''} onClick={() => { setSerie(indice); setCorte(Math.ceil(item.cortes / 2)); }}><i className={`ct-miniatura plano-${item.plano.toLowerCase()}`}/><span><strong>{item.plano}</strong><small>{item.detalle}</small><em>{item.cortes} imágenes</em></span></button>)}</aside>
      <main className="ct-area">
        <nav className="ct-toolbar" aria-label="Herramientas del visor"><div><button type="button" className={herramienta === 'navegar' ? 'activo' : ''} onClick={() => setHerramienta('navegar')} title="Navegar"><Icon name="eye" size={16}/></button><button type="button" className={herramienta === 'ventana' ? 'activo' : ''} onClick={() => setHerramienta('ventana')} title="Ventana y nivel"><Icon name="settings" size={16}/></button><button type="button" className={herramienta === 'medir' ? 'activo' : ''} onClick={() => { setHerramienta('medir'); setMedicion(true); }} title="Medir"><Icon name="edit" size={16}/></button></div><span className="ct-separador"/><button type="button" className={invertido ? 'activo' : ''} onClick={() => setInvertido(valor => !valor)}>Invertir</button><button type="button" onClick={() => setRotacion(valor => (valor + 90) % 360)}>Girar 90°</button><button type="button" onClick={restablecer}><Icon name="refresh" size={14}/> Restablecer</button><button type="button" className="ct-pantalla-completa" onClick={alternarPantallaCompleta}><Icon name={maximizado ? 'close' : 'eye'} size={14}/>{maximizado ? 'Salir de pantalla completa' : 'Pantalla completa'}</button></nav>
        <div className={`ct-lienzo herramienta-${herramienta}`} onDoubleClick={alternarPantallaCompleta}>
          <div className={`ct-imagen plano-${actual.plano.toLowerCase()}`} style={estiloImagen}><span className="ct-anatomia"/><b className="ct-orientacion superior">A</b><b className="ct-orientacion inferior">P</b><b className="ct-orientacion izquierda">R</b><b className="ct-orientacion derecha">L</b>{medicion && <span className="ct-medicion"><i/><b>42.6 mm</b></span>}</div>
          <div className="ct-overlay paciente"><strong>María Fernanda López García</strong><span>ID: HME-6845210 · F · 38 A</span><span>TC TÓRAX · 19/10/2026</span></div><div className="ct-overlay tecnico"><span>{actual.plano.toUpperCase()} · IMG {corte}/{actual.cortes}</span><span>WL {nivel} · WW {ancho}</span><span>Zoom {zoom}%</span></div><div className="ct-ayuda"><span>Rueda: cortes</span><span>Doble clic: pantalla completa</span></div>
        </div>
        <footer className="ct-controles"><label>Imagen <input type="range" min="1" max={actual.cortes} value={Math.min(corte, actual.cortes)} onChange={e => setCorte(Number(e.target.value))}/><b>{Math.min(corte, actual.cortes)} / {actual.cortes}</b></label><label>Zoom <input type="range" min="60" max="220" value={zoom} onChange={e => setZoom(Number(e.target.value))}/><b>{zoom}%</b></label></footer>
      </main>
      <aside className="ct-ajustes"><header><strong>Ventana y nivel</strong><small>Preajustes de TC</small></header><div className="ct-presets">{PRESETS.map(preset => <button key={preset.nombre} type="button" className={nivel === preset.nivel && ancho === preset.ancho ? 'activo' : ''} onClick={() => { setNivel(preset.nivel); setAncho(preset.ancho); }}>{preset.nombre}</button>)}</div><label>Nivel (WL)<input type="range" min="-1000" max="1000" value={nivel} onChange={e => setNivel(Number(e.target.value))}/><b>{nivel}</b></label><label>Ancho (WW)<input type="range" min="1" max="2000" value={ancho} onChange={e => setAncho(Number(e.target.value))}/><b>{ancho}</b></label><div className="ct-herramienta"><Icon name="check" size={15}/><span><strong>{herramienta === 'medir' ? 'Medición activa' : herramienta === 'ventana' ? 'Ajuste de ventana activo' : 'Modo navegación'}</strong><small>{herramienta === 'medir' ? 'Medición de referencia mostrada.' : 'Selecciona una herramienta en la barra.'}</small></span></div></aside>
    </section>
    <p className="ct-aviso">Vista de demostración para previsualización. No sustituye la interpretación diagnóstica ni la revisión de un estudio DICOM validado.</p>
  </section>;
}
