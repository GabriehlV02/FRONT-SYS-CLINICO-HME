import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useEstudiosPacientes } from "./pacientes/useEstudiosPacientes";
import { apiFetch } from "../api";
import Icon from "../componentes/Icono";
import "./AgendaImagenologiaView.css";

type Modalidad =
  | "Tomografía"
  | "Radiografía"
  | "Ecografía"
  | "Ecocardiograma"
  | "Electrocardiograma"
  | "Holter";
type EstudioAgendado = {
  id: string;
  hora: string;
  paciente: string;
  ci: string;
  modalidad: Modalidad;
  estudio: string;
  preparacion: string;
  estado: "SOLICITADO" | "EN_PROCESO";
};

const modalidadClase = (modalidad: Modalidad) =>
  modalidad
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "-");

export default function AgendaImagenologiaView() {
  const { estudios, errorEstudios } = useEstudiosPacientes();
  const archivoRef = useRef<HTMLInputElement>(null);
  const [objetivoArchivo, setObjetivoArchivo] = useState<string | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState("");
  const estudiosIniciales: EstudioAgendado[] = estudios.map((e) => ({
    id: e.id,
    hora: e.solicitado_en.slice(11, 16),
    paciente: [e.nombres, e.apellido_paterno, e.apellido_materno].join(" "),
    ci: e.ci,
    modalidad:
      (
        {
          TOMOGRAFIA: "Tomografía",
          ECOGRAFIA: "Ecografía",
          ECOCARDIOGRAMA: "Ecocardiograma",
          RADIOGRAFIA: "Radiografía",
          ELECTROCARDIOGRAMA: "Electrocardiograma",
          HOLTER: "Holter",
        } as Record<string, Modalidad>
      )[e.tipo] || "Radiografía",
    estudio: e.nombre,
    preparacion: e.indicaciones || "Sin indicaciones registradas",
    estado: e.estado === "EN_PROCESO" ? "EN_PROCESO" : "SOLICITADO",
  }));
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"Todos" | Modalidad>("Todos");
  const pendientes = useMemo(
    () =>
      estudiosIniciales.filter((estudio) => {
        const texto =
          `${estudio.paciente} ${estudio.ci} ${estudio.modalidad} ${estudio.estudio}`.toLocaleLowerCase();
        return (
          (filtro === "Todos" || estudio.modalidad === filtro) &&
          texto.includes(busqueda.trim().toLocaleLowerCase())
        );
      }),
    [busqueda, filtro, estudios],
  );
  const iniciados = estudiosIniciales.filter((estudio) => estudio.estado === "EN_PROCESO");
  const modalidades = Array.from(
    new Set(estudiosIniciales.map((estudio) => estudio.modalidad)),
  );

  const iniciarToma = async (id: string) => {
    setErrorAccion("");
    setCargando(id);
    try {
      const respuesta = await apiFetch(`/api/v1/estudios/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ estado: "EN_PROCESO" }),
      });
      if (!respuesta.ok) throw new Error("No se pudo iniciar la toma.");
      window.dispatchEvent(new Event("pacientes:actualizados"));
    } catch (causa) {
      setErrorAccion(causa instanceof Error ? causa.message : "No se pudo iniciar la toma.");
    } finally {
      setCargando(null);
    }
  };

  const elegirArchivo = (id: string) => {
    setObjetivoArchivo(id);
    archivoRef.current?.click();
  };

  const cargarImagen = async (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    const id = objetivoArchivo;
    evento.target.value = "";
    setObjetivoArchivo(null);
    if (!archivo || !id) return;
    setErrorAccion("");
    setCargando(id);
    try {
      const formulario = new FormData();
      formulario.append("archivo", archivo);
      const respuesta = await apiFetch(`/api/v1/estudios/${id}/archivo`, {
        method: "POST",
        body: formulario,
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.message || "No se pudo guardar la imagen.");
      window.dispatchEvent(new Event("pacientes:actualizados"));
    } catch (causa) {
      setErrorAccion(causa instanceof Error ? causa.message : "No se pudo guardar la imagen.");
    } finally {
      setCargando(null);
    }
  };

  return (
    <section
      className="agenda-imagenologia"
      aria-label="Agenda de estudios de imagenología"
    >
      {errorEstudios && <p role="alert">{errorEstudios}</p>}
      {errorAccion && <p className="agenda-imagenologia-error" role="alert">{errorAccion}</p>}
      <header className="agenda-imagenologia-cabecera">
        <div>
          <span>AGENDA DIAGNÓSTICA</span>
          <h2>Estudios programados para hoy</h2>
          <p>
            Identifica la modalidad, el protocolo y la preparación antes de
            iniciar cada toma.
          </p>
        </div>
        <div
          className="agenda-imagenologia-resumen"
          aria-label="Resumen de la jornada"
        >
          <strong>
            {estudiosIniciales.length}
            <small>programados</small>
          </strong>
          <strong>
            {pendientes.length}
            <small>por realizar</small>
          </strong>
          <strong>
            {iniciados.length}
            <small>en toma</small>
          </strong>
        </div>
      </header>

      <div className="agenda-imagenologia-filtros">
        <label>
          <Icon name="search" size={17} />
          <input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar paciente, CI o estudio"
          />
        </label>
        <div className="agenda-modalidades" aria-label="Filtrar por modalidad">
          {(["Todos", ...modalidades] as const).map((modalidad) => (
            <button
              type="button"
              key={modalidad}
              className={filtro === modalidad ? "activo" : ""}
              onClick={() => setFiltro(modalidad)}
            >
              {modalidad}
            </button>
          ))}
        </div>
      </div>

      <div className="agenda-imagenologia-contenido">
        <section className="agenda-estudios-lista">
          <header>
            <span>HORA</span>
            <span>PACIENTE</span>
            <span>TIPO DE ESTUDIO</span>
            <span>PARTE / PIEZA</span>
            <span>PREPARACIÓN</span>
            <span>ESTADO</span>
            <span>ACCIÓN</span>
          </header>
          {pendientes.length ? (
            pendientes.map((estudio) => (
              <article key={estudio.id}>
                <time>{estudio.hora}</time>
                <div className="agenda-estudio-paciente">
                  <i>
                    {estudio.paciente
                      .split(" ")
                      .map((parte) => parte[0])
                      .slice(0, 2)
                      .join("")}
                  </i>
                  <span>
                    <strong>{estudio.paciente}</strong>
                    <small>CI {estudio.ci}</small>
                  </span>
                </div>
                <div className="agenda-estudio-modalidad">
                  <b className={modalidadClase(estudio.modalidad)}>
                    <Icon
                      name={
                        estudio.modalidad === "Electrocardiograma" ||
                        estudio.modalidad === "Holter"
                          ? "audit"
                          : "image"
                      }
                      size={16}
                    />
                    {estudio.modalidad}
                  </b>
                </div>
                <div className="agenda-estudio-parte">
                  <strong>{estudio.estudio}</strong>
                </div>
                <div className="agenda-estudio-preparacion">
                  <Icon name="fileText" size={16} />
                  <span>{estudio.preparacion}</span>
                </div>
                <span className={`agenda-estudio-estado ${estudio.estado === "SOLICITADO" ? "confirmado" : "preparacion"}`}>
                  {estudio.estado === "SOLICITADO" ? "Programado" : "En toma"}
                </span>
                {estudio.estado === "SOLICITADO" ? (
                  <button type="button" disabled={cargando === estudio.id} onClick={() => void iniciarToma(estudio.id)}>
                    <Icon name="camera" size={15} /> {cargando === estudio.id ? "Iniciando…" : "Iniciar toma"}
                  </button>
                ) : (
                  <button type="button" disabled={cargando === estudio.id} onClick={() => elegirArchivo(estudio.id)}>
                    <Icon name="plus" size={15} /> {cargando === estudio.id ? "Guardando…" : "Cargar imagen"}
                  </button>
                )}
              </article>
            ))
          ) : (
            <div className="agenda-estudios-vacio">
              <Icon name="image" size={28} />
              <strong>No hay estudios pendientes</strong>
              <small>
                Cambia los filtros o revisa los estudios completados.
              </small>
            </div>
          )}
        </section>

        <aside className="agenda-imagenologia-lateral">
          <header>
            <div>
              <span>TOMAS EN CURSO</span>
              <strong>Tomas iniciadas</strong>
            </div>
            <b>{iniciados.length}</b>
          </header>
          {iniciados.length ? (
            iniciados.map((estudio) => (
              <article key={estudio.id}>
                <i className={modalidadClase(estudio.modalidad)}>
                  <Icon name="check" size={15} />
                </i>
                <div>
                  <strong>{estudio.paciente}</strong>
                  <small>{estudio.modalidad}</small>
                  <small>
                    {estudio.estudio} · {estudio.hora}
                  </small>
                </div>
              </article>
            ))
          ) : (
            <div className="agenda-imagenologia-sin-realizados">
              <Icon name="camera" size={24} />
              <p>Aún no se han iniciado tomas.</p>
            </div>
          )}
          <footer>
            <Icon name="check" size={15} />
            <span>Al cargar la imagen, el estudio pasará a interpretación.</span>
          </footer>
        </aside>
      </div>
      <input
        ref={archivoRef}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp,application/dicom,.dcm,.dicom,.zip,.rar"
        onChange={(evento) => void cargarImagen(evento)}
      />
    </section>
  );
}
