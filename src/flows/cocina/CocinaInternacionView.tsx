import { useInternacionesVinculadas } from "../internacion/useInternacionesVinculadas";
import { useMemo, useState, type FormEvent } from "react";
import Icon from "../../radius/componentes/Icono";
import { HorizontalSubvistaNav } from "../../ui/components/HorizontalSubvistaNav";
import "./CocinaInternacionView.css";

type Vista = "pacientes" | "dietas" | "reportes";
export type Dieta = {
  id: number;
  nombre: string;
  tipo: string;
  descripcion: string;
  consistencia: string;
  restricciones: string;
  estado: "Activa" | "Inactiva";
};

export const DIETAS_INICIALES: Dieta[] = [
  {
    id: 1,
    nombre: "Dieta normal",
    tipo: "General",
    descripcion: "Alimentación completa sin restricciones específicas.",
    consistencia: "Sólida",
    restricciones: "Ninguna",
    estado: "Activa",
  },
  {
    id: 2,
    nombre: "Dieta blanda",
    tipo: "Terapéutica",
    descripcion: "Preparaciones suaves y de fácil digestión.",
    consistencia: "Blanda",
    restricciones: "Evitar frituras y condimentos",
    estado: "Activa",
  },
  {
    id: 3,
    nombre: "Dieta líquida",
    tipo: "Transición",
    descripcion: "Líquidos claros y preparaciones coladas.",
    consistencia: "Líquida",
    restricciones: "Sin sólidos",
    estado: "Activa",
  },
  {
    id: 4,
    nombre: "Dieta hiposódica",
    tipo: "Terapéutica",
    descripcion: "Alimentación con contenido reducido de sodio.",
    consistencia: "Sólida",
    restricciones: "Sodio controlado",
    estado: "Activa",
  },
  {
    id: 5,
    nombre: "Dieta para diabético",
    tipo: "Terapéutica",
    descripcion: "Control de carbohidratos simples y porciones.",
    consistencia: "Sólida",
    restricciones: "Sin azúcar añadida",
    estado: "Activa",
  },
];
const CLAVE_DIETAS = "hme:cocina:dietas:v1";
export const leerCatalogoDietas = (): Dieta[] => {
  try {
    const guardadas = window.localStorage.getItem(CLAVE_DIETAS);
    if (guardadas) return JSON.parse(guardadas) as Dieta[];
    window.localStorage.setItem(CLAVE_DIETAS, JSON.stringify(DIETAS_INICIALES));
  } catch { /* Usa el catálogo base si el almacenamiento no está disponible. */ }
  return DIETAS_INICIALES;
};

export function CocinaInternacionView() {
  const [vista, setVista] = useState<Vista>("pacientes");
  const [dietas, setDietas] = useState<Dieta[]>(leerCatalogoDietas);
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState(false);
  const formularioInicial: Omit<Dieta, "id"> = {
    nombre: "",
    tipo: "General",
    descripcion: "",
    consistencia: "Sólida",
    restricciones: "",
    estado: "Activa",
  };
  const [nuevaDieta, setNuevaDieta] =
    useState<Omit<Dieta, "id">>(formularioInicial);
  const dietasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    if (!termino) return dietas;
    return dietas.filter((dieta) =>
      [
        dieta.nombre,
        dieta.tipo,
        dieta.descripcion,
        dieta.consistencia,
      ].some((valor) => valor.toLocaleLowerCase("es").includes(termino)),
    );
  }, [busqueda, dietas]);

  const crearDieta = (event: FormEvent) => {
    event.preventDefault();
    setDietas((actuales) => {
      const actualizadas: Dieta[] = [
        ...actuales,
        { id: Date.now(), ...nuevaDieta, estado: "Activa" },
      ];
      try {
        window.localStorage.setItem(CLAVE_DIETAS, JSON.stringify(actualizadas));
      } catch {
        // La vista sigue funcionando en memoria si el almacenamiento no está disponible.
      }
      return actualizadas;
    });
    setNuevaDieta(formularioInicial);
    setCreando(false);
  };

  return (
    <section className="cocina-internacion">
      <HorizontalSubvistaNav
        className="recepcion-subvistas cocina-internacion-subvistas"
        ariaLabel="Subvistas de cocina internación"
      >
        {(
          [
            [
              "pacientes",
              "Pacientes internados",
              "patient",
              "Dietas y entregas del turno",
            ],
            ["dietas", "Dietas", "utensils", "Catálogo de dietas disponibles"],
            [
              "reportes",
              "Reportes",
              "audit",
              "Consumo y entregas de alimentación",
            ],
          ] as const
        ).map(([id, nombre, icono, descripcion]) => (
          <button
            key={id}
            type="button"
            className={vista === id ? "activo" : ""}
            onClick={() => setVista(id)}
          >
            <span>
              <Icon name={icono} size={17} />
            </span>
            <strong>{nombre}</strong>
            <small>{descripcion}</small>
          </button>
        ))}
      </HorizontalSubvistaNav>

      {vista === "pacientes" && <PacientesInternados />}
      {vista === "dietas" && (
        <div className="cocina-internacion-panel dietas-panel">
          <header>
            <div>
              <p>CATÁLOGO NUTRICIONAL</p>
              <h3>Dietas disponibles</h3>
              <small>
                Consulta y administra las dietas que pueden recetarse o
                asignarse a un paciente.
              </small>
            </div>
            <button type="button" onClick={() => setCreando(true)}>
              <Icon name="plus" size={16} /> Crear dieta
            </button>
          </header>
          <div className="dietas-herramientas">
            <label>
              <Icon name="search" size={17} />
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por nombre, consistencia o indicación"
              />
            </label>
            <span>
              {dietasFiltradas.length} dieta
              {dietasFiltradas.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="dietas-tabla-contenedor">
            <div className="cocina-tabla-desplazable" tabIndex={0} role="region" aria-label="Tabla de cocina, desplazamiento horizontal"><table>
              <thead>
                <tr>
                  <th>Dieta</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Consistencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {dietasFiltradas.map((dieta) => (
                  <tr key={dieta.id}>
                    <td>
                      <strong>{dieta.nombre}</strong>
                    </td>
                    <td>{dieta.tipo}</td>
                    <td>{dieta.descripcion}</td>
                    <td>
                      <span className="dieta-consistencia">
                        {dieta.consistencia}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`dieta-estado ${dieta.estado.toLowerCase()}`}
                      >
                        {dieta.estado}
                      </span>
                    </td>
                  </tr>
                ))}
                {dietasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="cocina-internacion-vacio">
                        <Icon name="search" size={27} />
                        <strong>No encontramos dietas</strong>
                        <small>
                          Prueba con otro nombre, consistencia o indicación.
                        </small>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table></div>
          </div>
        </div>
      )}
      {vista === "reportes" && <Reportes />}

      {creando && (
        <div
          className="dieta-modal-fondo"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreando(false);
          }}
        >
          <form
            className="dieta-modal"
            onSubmit={crearDieta}
            aria-label="Crear dieta"
          >
            <header>
              <div>
                <p>NUEVA DIETA</p>
                <h3>Crear dieta</h3>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setCreando(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="dieta-modal-fila dieta-modal-datos-principales">
              <label>
                Nombre de la dieta
                <input
                  required
                  autoFocus
                  value={nuevaDieta.nombre}
                  onChange={(event) =>
                    setNuevaDieta({ ...nuevaDieta, nombre: event.target.value })
                  }
                  placeholder="Ej. Dieta renal"
                />
              </label>
              <label>
                Tipo
                <select
                  value={nuevaDieta.tipo}
                  onChange={(event) =>
                    setNuevaDieta({ ...nuevaDieta, tipo: event.target.value })
                  }
                >
                  <option>General</option>
                  <option>Terapéutica</option>
                  <option>Transición</option>
                  <option>Pediátrica</option>
                  <option>Especial</option>
                </select>
              </label>
              <label>
                Consistencia
                <select
                  value={nuevaDieta.consistencia}
                  onChange={(event) =>
                    setNuevaDieta({
                      ...nuevaDieta,
                      consistencia: event.target.value,
                    })
                  }
                >
                  <option>Sólida</option>
                  <option>Blanda</option>
                  <option>Líquida</option>
                  <option>Semilíquida</option>
                  <option>Mixta</option>
                </select>
              </label>
            </div>
            <label>
              Descripción
              <textarea
                required
                value={nuevaDieta.descripcion}
                onChange={(event) =>
                  setNuevaDieta({
                    ...nuevaDieta,
                    descripcion: event.target.value,
                  })
                }
                placeholder="Describe brevemente la composición de la dieta"
              />
            </label>
            <div className="dieta-modal-fila">
              <label>
                Restricciones
                <input
                  required
                  value={nuevaDieta.restricciones}
                  onChange={(event) =>
                    setNuevaDieta({
                      ...nuevaDieta,
                      restricciones: event.target.value,
                    })
                  }
                  placeholder="Ej. Sin sodio añadido"
                />
              </label>
            </div>
            <footer>
              <button type="button" onClick={() => setCreando(false)}>
                Cancelar
              </button>
              <button type="submit">
                <Icon name="plus" size={16} /> Crear dieta
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}

function PacientesInternados() {
  const internados = useInternacionesVinculadas().filter(
    (r) => r.estado === "confirmada",
  );
  const [buscar, setBuscar] = useState("");
  const visibles = internados.filter((p) =>
    `${p.paciente} ${p.ci} ${p.sala} ${p.cama}`
      .toLocaleLowerCase("es")
      .includes(buscar.toLocaleLowerCase("es")),
  );
  return (
    <div className="cocina-internacion-panel">
      <header>
        <div>
          <p>PACIENTES INTERNADOS</p>
          <h3>Pacientes para alimentación</h3>
        </div>
      </header>
      <div className="cocina-internacion-filtros">
        <input
          aria-label="Buscar paciente internado"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar paciente, CI o cama"
        />
      </div>
      <div className="cocina-tabla-desplazable" tabIndex={0} role="region" aria-label="Tabla de cocina, desplazamiento horizontal"><table>
        <thead>
          <tr>
            <th>Paciente</th>
            <th>CI</th>
            <th>Habitación / cama</th>
            <th>Dieta indicada</th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((p) => (
            <tr key={p.id}>
              <td>{p.paciente}</td>
              <td>{p.ci}</td>
              <td>{[p.sala, p.cama].filter(Boolean).join(" / ")}</td>
              <td>Sin indicación nutricional registrada</td>
            </tr>
          ))}
          {!visibles.length && (
            <tr>
              <td colSpan={4}>
                No hay pacientes internados con estos criterios.
              </td>
            </tr>
          )}
        </tbody>
      </table></div>
    </div>
  );
}

function Reportes() {
  return (
    <div className="cocina-internacion-panel">
      <header>
        <div>
          <p>REPORTES DE INTERNACIÓN</p>
          <h3>Consumo y entregas de alimentación</h3>
        </div>
        <button>Exportar reporte</button>
      </header>
      <div className="cocina-internacion-kpis">
        <article>
          <small>Raciones entregadas hoy</small>
          <b>0</b>
        </article>
        <article>
          <small>Pacientes atendidos</small>
          <b>0</b>
        </article>
        <article>
          <small>Entregas pendientes</small>
          <b>0</b>
        </article>
      </div>
      <p className="cocina-internacion-ayuda">
        El reporte consolidará raciones por fecha, turno, tipo de dieta y
        paciente internado.
      </p>
    </div>
  );
}
