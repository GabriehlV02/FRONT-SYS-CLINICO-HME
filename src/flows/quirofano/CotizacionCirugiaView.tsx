import { useMemo, useState } from "react";
import Icon from "../../radius/componentes/Icono";
import {
  leerCatalogoCirugias,
  tieneTarifas,
  tieneTarifasPendientes,
  totalPaquete,
} from "./catalogoCirugiasAdmin";
import type { PaqueteCirugia } from "./catalogoCirugiasAdmin";
import "./CotizacionCirugiaView.css";

type Paciente = { ci: string; nombre: string };
const MONEDA = new Intl.NumberFormat("es-BO", {
  style: "currency",
  currency: "BOB",
  maximumFractionDigits: 2,
});

export function CotizacionCirugiaView({
  pacientes,
}: {
  pacientes: Paciente[];
}) {
  const catalogo = useMemo(leerCatalogoCirugias, []);
  const [paqueteId, setPaqueteId] = useState("");
  const [pacienteCi, setPacienteCi] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [medico, setMedico] = useState("");
  const paquete = catalogo.find((item) => item.id === paqueteId);
  const paciente = pacientes.find((item) => item.ci === pacienteCi);
  const estimado = paquete && tieneTarifas(paquete) ? totalPaquete(paquete) * cantidad : 0;

  const imprimir = () => {
    if (!paquete) return;
    const ventana = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!ventana) return;
    const escapar = (texto: string) =>
      texto.replace(/[&<>"']/g, (caracter) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter]!,
      );
    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cotización quirúrgica</title><style>body{font:15px Arial,sans-serif;color:#173d60;margin:40px}header{display:flex;justify-content:space-between;border-bottom:2px solid #087fc0;padding-bottom:18px}h1{margin:0 0 8px;color:#07517e}small{color:#66839a}table{width:100%;border-collapse:collapse;margin-top:28px}td,th{text-align:left;padding:12px;border-bottom:1px solid #d9e7ef}.total{text-align:right;font-size:22px;font-weight:bold;margin-top:24px}.nota{margin-top:32px;padding:14px;background:#f1f8fc;color:#526e82}@media print{button{display:none}}</style></head><body><header><div><h1>Cotización quirúrgica</h1><small>Menú de quirófano · Estimado preliminar</small></div><div>${new Date().toLocaleDateString("es-BO")}</div></header><table><tbody><tr><th>Paciente</th><td>${escapar(paciente?.nombre || "No especificado")}</td></tr><tr><th>Documento</th><td>${escapar(paciente?.ci || "No especificado")}</td></tr><tr><th>Cirugía</th><td>${escapar(paquete.codigo)} · ${escapar(paquete.nombre)}</td></tr><tr><th>Especialidad</th><td>${escapar(paquete.especialidad)}</td></tr><tr><th>Médico</th><td>${escapar(medico || paquete.medico)}</td></tr><tr><th>Cantidad</th><td>${cantidad}</td></tr></tbody></table><p class="total">Total estimado: ${MONEDA.format(estimado)}</p><p class="nota">Cotización referencial, sujeta a valoración médica y confirmación de tarifas, materiales y disponibilidad. No constituye factura ni garantía de costo final.${tieneTarifasPendientes(paquete) ? " El paquete tiene tarifas pendientes; el total mostrado es parcial." : ""}</p><script>window.print()</script></body></html>`);
    ventana.document.close();
  };

  return (
    <section className="cotizacion-cirugia" aria-labelledby="cotizacion-cirugia-titulo">
      <header className="cotizacion-cirugia-cabecera">
        <div>
          <p>QUIRÓFANO · PRESUPUESTO PRELIMINAR</p>
          <h2 id="cotizacion-cirugia-titulo">Cotizar cirugía</h2>
          <small>Prepara una estimación con los paquetes y tarifas del catálogo quirúrgico.</small>
        </div>
        <span><Icon name="cash" size={18} /> Estimado referencial</span>
      </header>
      <div className="cotizacion-cirugia-contenido">
        <section className="cotizacion-cirugia-formulario" aria-label="Datos de cotización">
          <label>Paciente
            <select value={pacienteCi} onChange={(evento) => setPacienteCi(evento.target.value)}>
              <option value="">Seleccionar paciente (opcional)</option>
              {pacientes.map((item) => <option key={item.ci} value={item.ci}>{item.nombre} · CI {item.ci}</option>)}
            </select>
          </label>
          <label>Cirugía del catálogo
            <select required value={paqueteId} onChange={(evento) => setPaqueteId(evento.target.value)}>
              <option value="">Selecciona cirugía</option>
              {catalogo.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}
            </select>
          </label>
          {paquete && <>
            <div className="cotizacion-cirugia-datos">
              <span>Especialidad<strong>{paquete.especialidad}</strong></span>
              <span>Médico del paquete<strong>{paquete.medico}</strong></span>
            </div>
            <label>Médico para esta cotización
              <input value={medico} onChange={(evento) => setMedico(evento.target.value)} placeholder={paquete.medico} />
            </label>
            <label>Cantidad de procedimientos
              <input type="number" min="1" step="1" value={cantidad} onChange={(evento) => setCantidad(Math.max(1, Number(evento.target.value) || 1))} />
            </label>
          </>}
        </section>
        <aside className="cotizacion-cirugia-resumen" aria-live="polite">
          <span>RESUMEN</span>
          <h3>{paquete?.nombre || "Selecciona una cirugía"}</h3>
          <p>{paquete ? `${paquete.instrumentos.length} instrumentos · ${paquete.horasQuirofano} h de quirófano · ${paquete.colaboradores} colaboradores` : "Elige un paquete del catálogo para calcular el estimado."}</p>
          <small>Total estimado</small>
          <strong>{paquete && tieneTarifas(paquete) ? MONEDA.format(estimado) : "Pendiente de tarifas"}</strong>
          {paquete && tieneTarifasPendientes(paquete) && <em>Estimado parcial: el paquete tiene tarifas pendientes.</em>}
          {!catalogo.length && <em>Aún no hay paquetes. Registra cirugías y sus tarifas en “Catálogo de cirugías”.</em>}
          <button type="button" disabled={!paquete || !tieneTarifas(paquete)} onClick={imprimir}><Icon name="fileText" size={16} /> Imprimir cotización</button>
          <small className="cotizacion-cirugia-nota">Cotización preliminar, sujeta a evaluación médica y confirmación de tarifas.</small>
        </aside>
      </div>
    </section>
  );
}
