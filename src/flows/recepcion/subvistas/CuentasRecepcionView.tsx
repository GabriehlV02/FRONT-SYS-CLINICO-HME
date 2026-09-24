import { useMemo, useState } from 'react';
import Icon from '../../../radius/componentes/Icono';

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

export function CuentasRecepcionView() {
  const [busqueda, setBusqueda] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState<
    'Internados' | 'Deudas' | 'Cirugías'
  >('Internados');
  const [cuentaActiva, setCuentaActiva] = useState<string | null>(
    cuentasIniciales[0].id,
  );
  const cuentas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase();
    return cuentasIniciales.filter(
      (cuenta) =>
        !termino ||
          `${cuenta.paciente} ${cuenta.historia} ${cuenta.id} ${cuenta.ubicacion}`
            .toLocaleLowerCase()
            .includes(termino),
    );
  }, [busqueda]);
  const seleccionada =
    cuentasIniciales.find((cuenta) => cuenta.id === cuentaActiva) ?? null;
  const pendiente = cuentasIniciales.reduce(
    (total, cuenta) => total + cuenta.total - cuenta.pagado,
    0,
  );
  const parcial = cuentasIniciales.filter(
    (cuenta) => cuenta.estado === 'Parcial',
  ).length;

  return (
    <section
      className="cuentas-recepcion"
      aria-label="Cuentas de pacientes internados"
    >
      <div className="cuentas-kpis-clinica">
        <article>
          <span className="cuenta-icono azul">
            <Icon name="fileText" size={18} />
          </span>
          <div>
            <small>Cuentas activas</small>
            <strong>{cuentasIniciales.length}</strong>
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
                cuentasIniciales.filter((cuenta) => cuenta.estado === 'Al día')
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

      <div className="cuentas-filtros-clinica">
        <label className="buscador-local">
          <Icon name="search" size={16} />
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por paciente, historia o cuenta"
          />
        </label>
        <div
          className="cuentas-tipo-switch"
          role="group"
          aria-label="Tipo de cuentas"
        >
          {(['Internados', 'Deudas', 'Cirugías'] as const).map((tipo) => (
            <button
              type="button"
              className={tipoCuenta === tipo ? 'activo' : ''}
              onClick={() => setTipoCuenta(tipo)}
              key={tipo}
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      <div className="cuentas-contenido">
        <section className="panel cuentas-listado">
          <div className="panel-cabecera">
            <div>
              <span>CUENTAS ABIERTAS</span>
              <h3>Pacientes internados</h3>
            </div>
            <small>
              {cuentas.length} registro{cuentas.length === 1 ? '' : 's'}
            </small>
          </div>
          <div className="cuentas-tabla-wrap">
            <table className="cuentas-tabla">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Ubicación</th>
                  <th>Ingreso</th>
                  <th>Total</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.map((cuenta) => (
                  <tr
                    key={cuenta.id}
                    className={cuentaActiva === cuenta.id ? 'seleccionada' : ''}
                    onClick={() => setCuentaActiva(cuenta.id)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ')
                        setCuentaActiva(cuenta.id);
                    }}
                  >
                    <td>
                      <strong>{cuenta.paciente}</strong>
                      <small>
                        {cuenta.historia} · {cuenta.id}
                      </small>
                    </td>
                    <td>{cuenta.ubicacion}</td>
                    <td>{cuenta.ingreso}</td>
                    <td>{dinero(cuenta.total)}</td>
                    <td>
                      <b>{dinero(cuenta.total - cuenta.pagado)}</b>
                    </td>
                    <td>
                      <em
                        className={`estado-cuenta ${cuenta.estado.toLocaleLowerCase().replace(' ', '-')}`}
                      >
                        {cuenta.estado}
                      </em>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cuentas.length === 0 && (
              <div className="cuentas-vacio">
                <Icon name="search" size={20} />
                <strong>No encontramos cuentas</strong>
                <small>Ajusta la búsqueda o el estado seleccionado.</small>
              </div>
            )}
          </div>
        </section>

        <aside className="panel cuenta-detalle-clinica">
          {seleccionada ? (
            <>
              <div className="panel-cabecera">
                <div>
                  <span>DETALLE DE CUENTA</span>
                  <h3>{seleccionada.id}</h3>
                </div>
                <em
                  className={`estado-cuenta ${seleccionada.estado.toLocaleLowerCase().replace(' ', '-')}`}
                >
                  {seleccionada.estado}
                </em>
              </div>
              <div className="cuenta-paciente-resumen">
                <span>
                  <Icon name="patient" size={17} />
                </span>
                <div>
                  <strong>{seleccionada.paciente}</strong>
                  <small>
                    {seleccionada.historia} · Responsable:{' '}
                    {seleccionada.responsable}
                  </small>
                  <small>{seleccionada.ubicacion}</small>
                </div>
              </div>
              <div className="cuenta-consumos">
                <header>
                  <strong>Consumos registrados</strong>
                  <small>Origen: internación</small>
                </header>
                {seleccionada.consumos.map((consumo) => (
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
                  <strong>{dinero(seleccionada.total)}</strong>
                </div>
                <div>
                  <span>Pagos registrados</span>
                  <strong className="pagado">
                    − {dinero(seleccionada.pagado)}
                  </strong>
                </div>
                <div className="saldo">
                  <span>Saldo pendiente</span>
                  <strong>
                    {dinero(seleccionada.total - seleccionada.pagado)}
                  </strong>
                </div>
              </div>
              <button className="primario cuenta-accion" type="button">
                <Icon name="arrowRight" size={16} /> Registrar pago
              </button>
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
      </div>
    </section>
  );
}
