import { useState } from 'react';
import Icon from '../../../radius/componentes/Icono';
import './ConfiguracionRecepcionView.css';

type ItemCatalogo = { id: string; nombre: string; tipo: string; precio: number };
type Paquete = { id: string; nombre: string; descripcion: string; precio: number; items: number };
const itemsCatalogo: ItemCatalogo[] = [
  { id: 'srv-consulta', nombre: 'Consulta médica general', tipo: 'Servicio', precio: 80 },
  { id: 'lab-hemograma', nombre: 'Hemograma completo', tipo: 'Servicio', precio: 50 },
  { id: 'img-rx', nombre: 'Estudio de imagenología', tipo: 'Servicio', precio: 120 },
  { id: 'ins-gasa', nombre: 'Gasa estéril 10 × 10 cm', tipo: 'Insumo', precio: 12 },
  { id: 'prd-paracetamol', nombre: 'Paracetamol 500 mg', tipo: 'Producto', precio: 8 },
];
const moneda = (valor: number) => `Bs ${valor.toFixed(2)}`;

export function ConfiguracionRecepcionView() {
  const [busqueda, setBusqueda] = useState('');
  const [mostrandoNuevoPaquete, setMostrandoNuevoPaquete] = useState(false);
  const [cobrosHabilitados, setCobrosHabilitados] = useState(true);
  const [cobrosQrHabilitados, setCobrosQrHabilitados] = useState(true);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [nombrePaquete, setNombrePaquete] = useState('');
  const [descripcionPaquete, setDescripcionPaquete] = useState('');
  const [busquedaItems, setBusquedaItems] = useState('');
  const [seleccion, setSeleccion] = useState<Record<string, number>>({});
  const [errorPaquete, setErrorPaquete] = useState('');
  const itemsSeleccionados = itemsCatalogo.filter((item) => seleccion[item.id]);
  const totalPaquete = itemsSeleccionados.reduce((total, item) => total + item.precio * seleccion[item.id], 0);
  const cambiarCantidad = (id: string, cambio: number) => setSeleccion((actual) => {
    const cantidad = Math.max(0, (actual[id] ?? 0) + cambio);
    const siguiente = { ...actual };
    if (cantidad) siguiente[id] = cantidad; else delete siguiente[id];
    return siguiente;
  });
  const cerrarEditor = () => { setMostrandoNuevoPaquete(false); setNombrePaquete(''); setDescripcionPaquete(''); setBusquedaItems(''); setSeleccion({}); setErrorPaquete(''); };
  const guardarPaquete = () => {
    if (!nombrePaquete.trim() || !itemsSeleccionados.length) { setErrorPaquete('Ingresa un nombre y selecciona al menos un ítem.'); return; }
    setPaquetes((actual) => [...actual, { id: crypto.randomUUID(), nombre: nombrePaquete.trim(), descripcion: descripcionPaquete.trim(), precio: totalPaquete, items: itemsSeleccionados.reduce((total, item) => total + seleccion[item.id], 0) }]);
    cerrarEditor();
  };

  return (
    <section className="configuracion-recepcion">
      <header className="configuracion-recepcion-cabecera">
        <div>
          <span>CONFIGURACIÓN</span>
          <h1>Paquetes</h1>
          <p>Administra los paquetes disponibles para la recepción.</p>
        </div>
      </header>

      <section className="configuracion-recepcion-opciones" aria-label="Opciones de cobro">
        <div><strong>Cobros</strong><small>Permite registrar cobros desde la caja.</small></div>
        <label className="configuracion-interruptor">
          <input type="checkbox" checked={cobrosHabilitados} onChange={(event) => setCobrosHabilitados(event.target.checked)} />
          <span aria-hidden="true" /><b>{cobrosHabilitados ? 'Habilitados' : 'Desactivados'}</b>
        </label>
        <div><strong>Cobros por QR</strong><small>Permite mostrar el botón que genera códigos QR de cobro.</small></div>
        <label className="configuracion-interruptor">
          <input type="checkbox" checked={cobrosQrHabilitados} onChange={(event) => setCobrosQrHabilitados(event.target.checked)} disabled={!cobrosHabilitados} />
          <span aria-hidden="true" /><b>{cobrosQrHabilitados && cobrosHabilitados ? 'Habilitados' : 'Desactivados'}</b>
        </label>
      </section>

      <section className="configuracion-recepcion-listado" aria-label="Listado de paquetes">
        <h1>Paquetes</h1>
        <label className="configuracion-recepcion-buscador">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar paquete"
            aria-label="Buscar paquete"
          />
        </label>
        <button className="configuracion-recepcion-crear" type="button" onClick={() => setMostrandoNuevoPaquete(true)}>
          <Icon name="plus" size={17} /> Crear nuevo paquete
        </button>
        <div className="configuracion-recepcion-tabla">
          <div className="configuracion-recepcion-encabezado" aria-hidden="true">
            <span>Paquete</span><span>Descripción</span><span>Estado</span>
          </div>
          {paquetes.filter((paquete) => `${paquete.nombre} ${paquete.descripcion}`.toLowerCase().includes(busqueda.toLowerCase())).length ? paquetes.filter((paquete) => `${paquete.nombre} ${paquete.descripcion}`.toLowerCase().includes(busqueda.toLowerCase())).map((paquete) => <div className="configuracion-recepcion-fila" key={paquete.id}><strong>{paquete.nombre}</strong><span>{paquete.descripcion || `${paquete.items} ítems seleccionados`}</span><b>{moneda(paquete.precio)}</b></div>) : <p>{busqueda ? 'No se encontraron paquetes.' : 'No hay paquetes registrados.'}</p>}
        </div>
      </section>

      {mostrandoNuevoPaquete && (
        <div
          className="configuracion-paquete-fondo"
          role="presentation"
          onClick={() => setMostrandoNuevoPaquete(false)}
        >
          <section
            className="configuracion-paquete-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Crear nuevo paquete"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>NUEVO PAQUETE</span>
                <h2>Crear nuevo paquete</h2>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setMostrandoNuevoPaquete(false)}>
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="configuracion-paquete-contenido">
              <section className="configuracion-paquete-datos">
                <label>Nombre del paquete<input value={nombrePaquete} onChange={(event) => setNombrePaquete(event.target.value)} placeholder="Ej.: Control prenatal" autoFocus /></label>
                <label>Descripción<textarea value={descripcionPaquete} onChange={(event) => setDescripcionPaquete(event.target.value)} placeholder="Describe el contenido o propósito del paquete" /></label>
                <div className="configuracion-paquete-total"><span>Precio calculado</span><strong>{moneda(totalPaquete)}</strong><small>Se actualiza con los ítems seleccionados.</small></div>
              </section>
              <div className="configuracion-paquete-divisor">
                <section className="configuracion-paquete-catalogo"><header><div><strong>Ítems disponibles</strong><small>Busca productos, insumos o servicios.</small></div><label><Icon name="search" size={16} /><input value={busquedaItems} onChange={(event) => setBusquedaItems(event.target.value)} placeholder="Buscar ítem" /></label></header><div className="configuracion-paquete-lista">{itemsCatalogo.filter((item) => `${item.nombre} ${item.tipo}`.toLowerCase().includes(busquedaItems.toLowerCase())).map((item) => <article key={item.id}><div><strong>{item.nombre}</strong><small>{item.tipo} · {moneda(item.precio)}</small></div><button type="button" onClick={() => cambiarCantidad(item.id, 1)}><Icon name="plus" size={15} /> Añadir</button></article>)}</div></section>
                <section className="configuracion-paquete-seleccion"><header><strong>Ítems del paquete</strong><span>{itemsSeleccionados.length} seleccionados</span></header>{itemsSeleccionados.length ? <div>{itemsSeleccionados.map((item) => <article key={item.id}><div><strong>{item.nombre}</strong><small>{moneda(item.precio)} c/u</small></div><div className="configuracion-paquete-cantidad"><button type="button" aria-label={`Quitar ${item.nombre}`} onClick={() => cambiarCantidad(item.id, -1)}>−</button><b>{seleccion[item.id]}</b><button type="button" aria-label={`Añadir ${item.nombre}`} onClick={() => cambiarCantidad(item.id, 1)}>+</button></div></article>)}</div> : <p>Selecciona ítems del catálogo para crear el paquete.</p>}</section>
              </div>
              {errorPaquete && <p className="configuracion-paquete-error">{errorPaquete}</p>}
            </div>
            <footer><button type="button" onClick={cerrarEditor}>Cancelar</button><button type="button" className="configuracion-paquete-guardar" onClick={guardarPaquete}><Icon name="check" size={16} /> Guardar paquete</button></footer>
          </section>
        </div>
      )}
    </section>
  );
}
