import { useState } from 'react';
import Icon from '../../componentes/Icono';
import './VisorEcocardiogramas.css';

const estudios = [
  { paciente: 'María Fernanda López García', detalle: 'Ecocardiograma transtorácico · 19/10/2026', estado: 'Informado' },
  { paciente: 'Carlos Alberto Mendoza Rojas', detalle: 'Ecocardiograma Doppler color · 18/10/2026', estado: 'Pendiente de informe' },
  { paciente: 'Ana Sofía Quispe Vargas', detalle: 'Ecocardiograma transtorácico · 16/10/2026', estado: 'Informado' },
];

export default function VisorEcocardiogramas() {
  const [seleccionado, setSeleccionado] = useState(0);
  const [cuadro, setCuadro] = useState(0);
  const [zoom, setZoom] = useState(100);
  const estudio = estudios[seleccionado];

  return <section className="eco-visor" aria-label="Visor de ecocardiogramas">
    <aside className="eco-estudios"><header><div><span>ESTUDIOS DISPONIBLES</span><strong>Ecocardiogramas</strong></div><b>{estudios.length}</b></header>{estudios.map((item, indice) => <button type="button" key={item.paciente} className={seleccionado === indice ? 'activo' : ''} onClick={() => { setSeleccionado(indice); setCuadro(0); }}><span><Icon name="audit" size={17}/></span><div><strong>{item.paciente}</strong><small>{item.detalle}</small><em>{item.estado}</em></div></button>)}</aside>
    <main className="eco-area"><header className="eco-toolbar"><div><button type="button" title="Cuadro anterior" onClick={() => setCuadro(actual => Math.max(0, actual - 1))}><Icon name="chevronLeft" size={16}/></button><strong>Vista apical de cuatro cámaras</strong><button type="button" title="Cuadro siguiente" onClick={() => setCuadro(actual => Math.min(64, actual + 1))}><Icon name="chevronRight" size={16}/></button></div><button type="button" onClick={() => setZoom(100)}><Icon name="refresh" size={14}/> Restablecer</button></header>
      <div className="eco-lienzo"><div className="eco-imagen" style={{ transform: `scale(${zoom / 100})` }}><i className="eco-onda onda-uno"/><i className="eco-onda onda-dos"/><i className="eco-corazon"/><span className="eco-linea"/></div><div className="eco-datos"><strong>{estudio.paciente}</strong><span>{estudio.detalle}</span><span>FC 72 lpm · Prof. 14 cm · Ganancia 58%</span></div><div className="eco-cuadro">CUADRO {cuadro + 1} / 65</div></div>
      <footer><label>Cuadro <input type="range" min="0" max="64" value={cuadro} onChange={event => setCuadro(Number(event.target.value))}/><b>{cuadro + 1} / 65</b></label><label>Zoom <input type="range" min="70" max="180" value={zoom} onChange={event => setZoom(Number(event.target.value))}/><b>{zoom}%</b></label></footer>
    </main>
    <aside className="eco-mediciones"><header><span>MEDICIONES</span><strong>Resumen clínico</strong></header><dl><div><dt>FEVI</dt><dd>62 %</dd></div><div><dt>DTDVI</dt><dd>48 mm</dd></div><div><dt>TAPSE</dt><dd>21 mm</dd></div><div><dt>PSAP</dt><dd>28 mmHg</dd></div></dl><p><Icon name="check" size={15}/> Adquisición completa</p><small>Vista demostrativa. La interpretación final corresponde al médico especialista.</small></aside>
  </section>;
}
