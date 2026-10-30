import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Icon from '../../../radius/componentes/Icono';
import { TriajeEmergenciasView } from '../../emergencias/TriajeEmergenciasView';
import { leerInternaciones, suscribirInternaciones } from '../../internacion/registroInternaciones';
import { apiEmergencias, nombrePaciente, type CuentaEmergencia } from '../../emergencias/emergenciasApi';
import './PreinternacionesRecepcion.css';
import './CuentasTodasView.css';

type EstadoCuenta = 'Pendiente' | 'Parcial' | 'Al día';

type CuentaPaciente = {
  id: string;
  paciente: string;
  historia: string;
  ubicacion: string;
  ingreso: string;
  responsable: string;
  total: number;
  pagado: number;
  estado: EstadoCuenta;
  consumos: { concepto: string; fecha: string; importe: number }[];
};

// Fuente temporal: será reemplazada por los consumos de internación expuestos por la API clínica.
const cuentasIniciales: CuentaPaciente[] = [
  { id: 'CTA-24019', paciente: 'Luis Escobar', historia: 'HC-004821', ubicacion: 'Internación · Habitación por asignar', ingreso: '29/09/2026', responsable: 'Sin registro', total: 333, pagado: 0, estado: 'Pendiente', consumos: [{ concepto: 'Emergencias · Oxígeno y materiales', fecha: '29 Sep', importe: 238 }, { concepto: 'Emergencias · Medicamentos e insumos', fecha: '29 Sep', importe: 95 }] },
  {
    id: 'CTA-24018',
    paciente: 'María Fernández López',
    historia: 'HC-004821',
    ubicacion: 'Habitación 204 · Piso 2',
    ingreso: '18/09/2026',
    responsable: 'Ana López',
    total: 4850,
    pagado: 1500,
    estado: 'Parcial',
    consumos: [
      {
        concepto: 'Estancia hospitalaria · 3 días',
        fecha: '18–20 Sep',
        importe: 2400,
      },
      { concepto: 'Laboratorio clínico', fecha: '19 Sep', importe: 680 },
      { concepto: 'Medicamentos e insumos', fecha: '20 Sep', importe: 1770 },
    ],
  },
  {
    id: 'CTA-24017',
    paciente: 'Carlos Mendoza Rojas',
    historia: 'HC-003615',
    ubicacion: 'UCI · Cubículo 03',
    ingreso: '17/09/2026',
    responsable: 'Luis Mendoza',
    total: 12400,
    pagado: 0,
    estado: 'Pendiente',
    consumos: [
      { concepto: 'Estancia UCI · 4 días', fecha: '17–20 Sep', importe: 8400 },
      {
        concepto: 'Procedimientos y monitoreo',
        fecha: '18–20 Sep',
        importe: 4000,
      },
    ],
  },
  {
    id: 'CTA-24016',
    paciente: 'Ana Rodríguez Vargas',
    historia: 'HC-005092',
    ubicacion: 'Habitación 112 · Piso 1',
    ingreso: '16/09/2026',
    responsable: 'Jorge Vargas',
    total: 3620,
    pagado: 3620,
    estado: 'Al día',
    consumos: [
      {
        concepto: 'Estancia hospitalaria · 2 días',
        fecha: '16–17 Sep',
        importe: 1600,
      },
      { concepto: 'Estudios de imagen', fecha: '17 Sep', importe: 920 },
      { concepto: 'Medicamentos e insumos', fecha: '17 Sep', importe: 1100 },
    ],
  },
  {
    id: 'CTA-24015',
    paciente: 'Roberto Quispe Flores',
    historia: 'HC-002978',
    ubicacion: 'Habitación 301 · Piso 3',
    ingreso: '15/09/2026',
    responsable: 'Elena Flores',
    total: 7280,
    pagado: 2500,
    estado: 'Parcial',
    consumos: [
      {
        concepto: 'Estancia hospitalaria · 5 días',
        fecha: '15–20 Sep',
        importe: 4000,
      },
      { concepto: 'Procedimiento quirúrgico', fecha: '16 Sep', importe: 2500 },
      { concepto: 'Medicamentos e insumos', fecha: '15–20 Sep', importe: 780 },
    ],
  },
];

const dinero = (valor: number) =>
  `Bs ${valor.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type OrigenCuenta = 'todas' | 'emergencias' | 'internacion' | 'tratamientos';

export function CuentasRecepcionView({ origenInicial = 'todas', pacienteInicial = '' }: { origenInicial?: OrigenCuenta; pacienteInicial?: string }) {
  const [origen, setOrigen] = useState<OrigenCuenta>(origenInicial);
  return <>{origen === 'todas' ? <CuentasTodasView onCambiarVista={setOrigen} /> : origen === 'emergencias' ? <TriajeEmergenciasView recepcion /> : origen === 'internacion' ? <CuentasInternacionView /> : <CuentasTratamientosView />}</>;
}

function CuentasTodasView({ onCambiarVista }: { onCambiarVista: (origen: OrigenCuenta) => void }) {
  const internaciones = useSyncExternalStore(suscribirInternaciones, leerInternaciones, leerInternaciones);
  const [emergencias, setEmergencias] = useState<CuentaEmergencia[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'Todas' | 'Emergencias' | 'Internaciones' | 'Deudas' | 'Cerradas'>('Todas');
  useEffect(() => { void apiEmergencias<{ cuentas: CuentaEmergencia[] }>().then(datos => setEmergencias(datos.cuentas)).catch(() => setEmergencias([])); }, []);
  const cuentas = useMemo(() => {
    const deEmergencias = emergencias.map(cuenta => { const total = cuenta.consumos.reduce((suma, consumo) => suma + consumo.precio * consumo.cantidad, 0); return { id: `EM-${cuenta.id.slice(0, 8).toUpperCase()}`, paciente: nombrePaciente(cuenta), documento: cuenta.identidad?.documento || 'Sin documento', origen: 'Emergencias', fecha: cuenta.inicio, saldo: total, total, estado: cuenta.fin ? 'Cerrada' : total ? 'Pendiente' : 'Pendiente', destino: 'emergencias' as const }; });
    const deInternacion = [...cuentasIniciales, ...internaciones.filter(item => item.estado === 'confirmada').map(item => ({ id: `CTA-${item.id}`, paciente: item.paciente, historia: 'Cuenta de internación', ubicacion: `Sala ${item.sala} · Cama ${item.cama}`, ingreso: item.fecha, responsable: 'Por registrar', total: 0, pagado: 0, estado: 'Pendiente' as EstadoCuenta, consumos: [] }))].map(cuenta => ({ id: cuenta.id, paciente: cuenta.paciente, documento: cuenta.historia, origen: 'Internación', fecha: cuenta.ingreso, saldo: cuenta.total - cuenta.pagado, total: cuenta.total, estado: cuenta.total === cuenta.pagado ? 'Cerrada' : cuenta.estado, destino: 'internacion' as const }));
    return [...deEmergencias, ...deInternacion];
  }, [emergencias, internaciones]);
  const visibles = cuentas.filter(cuenta => { const texto = `${cuenta.id} ${cuenta.paciente} ${cuenta.documento} ${cuenta.origen}`.toLocaleLowerCase(); const coincide = !busqueda.trim() || texto.includes(busqueda.trim().toLocaleLowerCase()); const filtroActivo = filtro === 'Todas' || (filtro === 'Emergencias' && cuenta.origen === 'Emergencias') || (filtro === 'Internaciones' && cuenta.origen === 'Internación') || (filtro === 'Deudas' && cuenta.saldo > 0) || (filtro === 'Cerradas' && cuenta.estado === 'Cerrada'); return coincide && filtroActivo; });
  const gruposPorServicio = filtro === 'Todas' ? Array.from(visibles.reduce((grupos, cuenta) => { const grupo = grupos.get(cuenta.origen) || []; grupo.push(cuenta); grupos.set(cuenta.origen, grupo); return grupos; }, new Map<string, typeof visibles>())) : [];
  const filaCuenta = (cuenta: typeof visibles[number]) => <article key={`${cuenta.origen}-${cuenta.id}`}><strong>{cuenta.id}</strong><strong>{cuenta.paciente}</strong><span>{cuenta.documento}</span><span>{cuenta.origen}</span><span>{new Date(cuenta.fecha).toLocaleDateString('es-BO')}</span><b>{dinero(cuenta.saldo)}</b><em className={cuenta.estado.toLocaleLowerCase().replace(' ', '-')}>{cuenta.estado}</em><span>{dinero(cuenta.total)}</span><button type="button" onClick={() => onCambiarVista(cuenta.destino)}><Icon name="eye" size={15}/> Ver</button></article>;
  return <section className="cuentas-todas" aria-label="Todas las cuentas"><div className="cuentas-todas-herramientas"><label><Icon name="search" size={17}/><input value={busqueda} onChange={evento => setBusqueda(evento.target.value)} placeholder="Buscar por paciente, CI o número de cuenta"/></label></div><div className="cuentas-todas-control"><nav>{(['Todas', 'Emergencias', 'Internaciones', 'Deudas', 'Cerradas'] as const).map(item => <button type="button" key={item} className={filtro === item ? 'activo' : ''} onClick={() => setFiltro(item)}>{item}</button>)}</nav><small>{visibles.length} de {cuentas.length} cuentas</small></div><div className="cuentas-todas-tabla"><div className="cuentas-todas-cabecera"><span>Cuenta</span><span>Paciente</span><span>CI / H.C.</span><span>Origen</span><span>Fecha</span><span>Saldo pendiente</span><span>Estado</span><span>Total</span><span>Acciones</span></div>{gruposPorServicio.length ? gruposPorServicio.map(([servicio, cuentasServicio]) => <section className="cuentas-todas-grupo" key={servicio}><header><strong>{servicio}</strong><span>{cuentasServicio.length} {cuentasServicio.length === 1 ? 'cuenta' : 'cuentas'}</span></header>{cuentasServicio.map(filaCuenta)}</section>) : visibles.map(filaCuenta)}{!visibles.length && <p>No se encontraron cuentas con esos criterios.</p>}</div></section>;
}

function CuentasTratamientosView() {
  return <section className="cuentas-tratamientos" aria-label="Cuentas de procedimientos y tratamientos"><span>RECEPCIÓN · CUENTAS</span><h2>Procedimientos y tratamientos</h2></section>;
}

function CuentasInternacionView() {
  const [cuentaModal, setCuentaModal] = useState<CuentaPaciente | null>(null);
  const internaciones = useSyncExternalStore(suscribirInternaciones, leerInternaciones, leerInternaciones);
  const preinternaciones = internaciones.filter((internacion) => internacion.estado === 'preinternacion');
  const cuentasConInternacion = useMemo(() => [
    ...cuentasIniciales,
    ...internaciones.filter((internacion) => internacion.estado === 'confirmada').map((internacion): CuentaPaciente => ({
      id: `CTA-${internacion.id}`, paciente: internacion.paciente, historia: 'Cuenta de internación', ubicacion: `Sala ${internacion.sala} · Cama ${internacion.cama} · ${internacion.tipoSala}`,
      ingreso: internacion.fecha, responsable: 'Por registrar', total: 0, pagado: 0, estado: 'Pendiente', consumos: [],
    })),
  ], [internaciones]);
  const cuentas = cuentasConInternacion;
  const pendiente = cuentasConInternacion.reduce(
    (total, cuenta) => total + cuenta.total - cuenta.pagado,
    0,
  );
  const parcial = cuentasConInternacion.filter(
    (cuenta) => cuenta.estado === 'Parcial',
  ).length;

  if (Boolean(cuentaModal)) return <DetalleCuentaContable cuenta={cuentaModal!} onVolver={() => setCuentaModal(null)} />;

  return (
    <section
      className="cuentas-recepcion"
      aria-label="Cuentas de pacientes internados"
    >
      <div className="cuentas-superficie">
      <div className="cuentas-kpis-clinica">
        <article>
          <span className="cuenta-icono azul">
            <Icon name="fileText" size={18} />
          </span>
          <div>
            <small>Cuentas activas</small>
            <strong>{cuentasConInternacion.length}</strong>
          </div>
        </article>
        <article>
          <span className="cuenta-icono naranja">
            <Icon name="audit" size={18} />
          </span>
          <div>
            <small>Saldo pendiente</small>
            <strong>{dinero(pendiente)}</strong>
          </div>
        </article>
        <article>
          <span className="cuenta-icono verde">
            <Icon name="check" size={18} />
          </span>
          <div>
            <small>Al día</small>
            <strong>
              {
                cuentasConInternacion.filter((cuenta) => cuenta.estado === 'Al día')
                  .length
              }
            </strong>
          </div>
        </article>
        <article>
          <span className="cuenta-icono violeta">
            <Icon name="patient" size={18} />
          </span>
          <div>
            <small>Pagos parciales</small>
            <strong>{parcial}</strong>
          </div>
        </article>
      </div>

      {preinternaciones.length > 0 && <section className="cuentas-preinternaciones" aria-label="Preinternaciones pendientes"><div><strong>Preinternaciones pendientes</strong><small>Estas órdenes médicas aún no generan cuenta. La cuenta se abrirá cuando Enfermería asigne sala y cama.</small></div>{preinternaciones.map((internacion) => <article key={internacion.id}><Icon name="patient" size={16} /><span><b>{internacion.paciente}</b><small>CI {internacion.ci} · Orden de {internacion.medico}</small></span><em>Sin cuenta</em></article>)}</section>}

      <div className="cuentas-contenido">
        <section className="panel cuentas-listado">
          <div className="cuentas-tabla-wrap">
            <table className="cuentas-tabla">
              <caption className="cuentas-tabla-descripcion">
                Cuentas de pacientes internados
              </caption>
              <colgroup>
                <col className="col-paciente" />
                <col className="col-ubicacion" />
                <col className="col-ingreso" />
                <col className="col-monto" />
                <col className="col-monto" />
                <col className="col-acciones" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Paciente</th>
                  <th scope="col">Ubicación</th>
                  <th scope="col">Ingreso</th>
                  <th scope="col" className="cuentas-monto">Total</th>
                  <th scope="col" className="cuentas-monto">Saldo</th>
                  <th scope="col" className="cuentas-acciones">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.map((cuenta) => (
                  <tr
                    key={cuenta.id}
                  >
                    <td className="cuenta-paciente">
                      <strong>{cuenta.paciente}</strong>
                      <small>
                        {cuenta.historia} · {cuenta.id}
                      </small>
                    </td>
                    <td className="cuenta-ubicacion">{cuenta.ubicacion}</td>
                    <td className="cuenta-ingreso">{cuenta.ingreso}</td>
                    <td className="cuentas-monto">{dinero(cuenta.total)}</td>
                    <td className="cuentas-monto cuenta-saldo">
                      <b>{dinero(cuenta.total - cuenta.pagado)}</b>
                    </td>
                    <td className="cuentas-acciones">
                      <button
                        type="button"
                        onClick={() => setCuentaModal(cuenta)}
                        aria-label={`Ver detalle de la cuenta de ${cuenta.paciente}`}
                      >
                        <Icon name="eye" size={14} />
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cuentas.length === 0 && (
              <div className="cuentas-vacio">
                <Icon name="search" size={20} />
                <strong>No encontramos cuentas</strong>
                <small>Aún no hay cuentas de internación.</small>
              </div>
            )}
          </div>
        </section>

        {cuentaModal && <div className="cuenta-modal-fondo" role="presentation" onMouseDown={() => setCuentaModal(null)}>
        <aside className="panel cuenta-detalle-clinica" role="dialog" aria-modal="true" aria-label="Detalle de cuenta" onMouseDown={(event) => event.stopPropagation()}>
          <button type="button" className="cuenta-modal-cerrar" onClick={() => setCuentaModal(null)} aria-label="Cerrar detalle de cuenta"><Icon name="close" size={18} /></button>
          {cuentaModal ? (
            <>
              <div className="panel-cabecera">
                <div>
                  <span>DETALLE DE CUENTA</span>
                  <h3>{cuentaModal.id}</h3>
                </div>
                <em
                  className={`estado-cuenta ${cuentaModal.estado.toLocaleLowerCase().replace(' ', '-')}`}
                >
                  {cuentaModal.estado}
                </em>
              </div>
              <div className="cuenta-paciente-resumen">
                <span>
                  <Icon name="patient" size={17} />
                </span>
                <div>
                  <strong>{cuentaModal.paciente}</strong>
                  <small>
                    {cuentaModal.historia} · Responsable:{' '}
                    {cuentaModal.responsable}
                  </small>
                  <small>{cuentaModal.ubicacion}</small>
                </div>
              </div>
              <div className="cuenta-consumos">
                <header>
                  <strong>Consumos registrados</strong>
                  <small>Origen: internación</small>
                </header>
                {cuentaModal.consumos.map((consumo) => (
                  <article key={consumo.concepto}>
                    <div>
                      <strong>{consumo.concepto}</strong>
                      <small>{consumo.fecha}</small>
                    </div>
                    <b>{dinero(consumo.importe)}</b>
                  </article>
                ))}
              </div>
              <div className="cuenta-totales">
                <div>
                  <span>Total consumido</span>
                  <strong>{dinero(cuentaModal.total)}</strong>
                </div>
                <div>
                  <span>Adelantos aplicados</span>
                  <strong className="pagado">
                    − {dinero(cuentaModal.pagado)}
                  </strong>
                </div>
                <div className="saldo">
                  <span>Saldo pendiente</span>
                  <strong>
                    {dinero(cuentaModal.total - cuentaModal.pagado)}
                  </strong>
                </div>
              </div>
              <div className="cuenta-adelantos">
                <span>Adelantos de pago registrados</span>
                <strong>{cuentaModal.pagado > 0 ? dinero(cuentaModal.pagado) : 'Sin adelantos'}</strong>
              </div>
              <small className="cuenta-pie">
                La sincronización con Contabilidad se habilitará desde la API de
                consumos.
              </small>
            </>
          ) : (
            <div className="cuentas-vacio">
              <Icon name="fileText" size={24} />
              <strong>Selecciona una cuenta</strong>
            </div>
          )}
        </aside>
        </div>}
      </div>
      </div>
    </section>
  );
}

function DetalleCuentaContable({ cuenta, onVolver }: { cuenta: CuentaPaciente; onVolver: () => void }) {
  const saldo = cuenta.total - cuenta.pagado;
  return <section className="cuenta-contable-detalle" aria-label={`Detalle de la cuenta ${cuenta.id}`}><header><button type="button" onClick={onVolver}><Icon name="chevronLeft" size={16}/> Volver a cuentas</button><span>CUENTA · {cuenta.id}</span><h2>{cuenta.paciente}</h2><small>{cuenta.historia} · {cuenta.ubicacion} · Saldo pendiente: {dinero(saldo)}</small></header><div className="cuenta-contable-cuerpo"><section className="cuenta-contable-consumos"><header><div><span>CONSUMOS REGISTRADOS</span><h3>Detalle de la cuenta</h3></div><b>{cuenta.consumos.length} {cuenta.consumos.length === 1 ? 'ítem' : 'ítems'}</b></header><div className="cuenta-contable-tabla"><div><span>Concepto</span><span>Fecha</span><span>Cant.</span><span>Importe</span></div>{cuenta.consumos.length ? cuenta.consumos.map((consumo, indice) => <article key={`${consumo.concepto}-${indice}`}><strong>{consumo.concepto}</strong><span>{consumo.fecha}</span><span>1</span><b>{dinero(consumo.importe)}</b></article>) : <p>Esta cuenta todavía no tiene consumos registrados.</p>}<footer><strong>Total registrado</strong><b>{dinero(cuenta.total)}</b></footer></div></section><aside className="cuenta-contable-operacion"><nav><button className="activo" type="button"><Icon name="plus" size={15}/> Cargar</button><button type="button"><Icon name="audit" size={15}/> Cobrar</button></nav><small>Cuenta de {cuenta.ubicacion}. Los cargos se sincronizan con el servicio correspondiente.</small><label>Buscar producto, insumo o servicio<input placeholder="Nombre o categoría"/></label><section><header><strong>Consumos por cargar</strong><small>0 ítems</small></header><p>Selecciona elementos del buscador.</p></section><b>Total por cargar: {dinero(0)}</b><div><button disabled type="button">Cargar</button><button type="button" onClick={onVolver}>Cancelar</button></div><footer><h4>Historial de pagos</h4><p>{cuenta.pagado ? `Adelanto registrado: ${dinero(cuenta.pagado)}` : 'Sin pagos registrados en esta cuenta.'}</p></footer></aside></div></section>;
}
