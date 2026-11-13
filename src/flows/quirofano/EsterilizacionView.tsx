import { exportarInstrumentalPdf } from "./exportarInstrumentalPdf";
import { apiFetch } from "../../radius/api";
﻿import { AvisoTemporal } from "../../radius/componentes/AvisoTemporal";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Icon from "../../radius/componentes/Icono";
import { HorizontalSubvistaNav } from "../../ui/components/HorizontalSubvistaNav";
import { RoperiaView } from "./RoperiaView";
import { PaquetesQuirurgicosView } from "./PaquetesQuirurgicosView";
import "../recepcion/RecepcionView.css";
import "../cocina/CocinaVentasView.css";
import { leerCronograma, type CirugiaProgramada } from "./cronogramaQuirofano";
import {
  ETIQUETAS_ESTADO,
  SIGUIENTES_ESTADOS,
  guardarEsterilizacion,
  leerEsterilizacion,
  type EstadoEsterilizacion,
  type EstadoMaterial,
  type KitEsteril,
  type MaterialEsteril,
  type RecepcionMaterialSucio,
} from "./almacenEsterilizacion";
import "./EsterilizacionView.css";
import "./EsterilizacionNotificacion.css";
import "./EsterilizacionImagenMaterial.css";
import "./EsterilizacionInventario.css";
import "./KitsEsterilizacion.css";
import "./KitInstrumentosImagenes.css";
import "./EsterilizacionSolicitudes.css";
import "./AreasEsterilizacion.css";

const MATERIAL_VACIO = {
  codigo: "",
  nombre: "",
  lote: "",
  medida: "",
  cuentaConLogo: false,
  cantidad: "1",
  descripcion: "",
  imagen: "",
};

const normalizarCodigoMaterial = (codigo: string) =>
  codigo.normalize("NFKC").replace(/\s+/g, "").toLocaleUpperCase("es");
const KIT_VACIO = { nombre: "", descripcion: "" };

function PaginacionInventario({ pagina, totalPaginas, total, inicio, cantidad, onCambiar }: {
  pagina: number;
  totalPaginas: number;
  total: number;
  inicio: number;
  cantidad: number;
  onCambiar: (pagina: number) => void;
}) {
  return (
    <nav className="est-paginacion-inventario" aria-label="Paginación del inventario">
      <span aria-live="polite">
        {total ? `Mostrando ${inicio + 1}–${inicio + cantidad} de ${total} materiales` : "Sin materiales para mostrar"}
      </span>
      <div className="est-paginacion-controles">
        <button type="button" onClick={() => onCambiar(pagina - 1)} disabled={pagina <= 1}>Anterior</button>
        <span>Página <strong>{pagina}</strong> de {totalPaginas}</span>
        <button type="button" onClick={() => onCambiar(pagina + 1)} disabled={pagina >= totalPaginas}>Siguiente</button>
      </div>
    </nav>
  );
}
const estadoKit = (kit: KitEsteril, materiales: MaterialEsteril[]) => {
  const piezas = kit.materialIds.map((id) =>
    materiales.find((item) => item.id === id),
  );
  if (!piezas.length || piezas.some((item) => !item)) return "incompleto";
  if (
    piezas.some(
      (item) => item?.estado === "cirugia" || item?.estado === "reservado",
    )
  )
    return "ocupado";
  if (
    piezas.some(
      (item) => item?.estado === "sucio" || item?.estado === "pendiente",
    )
  )
    return "sucio";
  return piezas.every((item) => item?.estado === "limpio")
    ? "disponible"
    : "proceso";
};
const ETIQUETAS_KIT: Record<string, string> = {
  disponible: "Disponible",
  ocupado: "Ocupado",
  sucio: "Sucio / pendiente",
  proceso: "En proceso",
  incompleto: "Incompleto",
};
const etiquetaCirugia = (cirugia: CirugiaProgramada) =>
  `${cirugia.fecha} ${cirugia.hora} · ${cirugia.quirofano} · ${cirugia.paciente}`;
const fechaDemo = (diasDesdeHoy: number) => {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  fecha.setDate(fecha.getDate() + diasDesdeHoy);
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
};
const CIRUGIAS_DEMO: CirugiaProgramada[] = [
  {
    id: "demo-cirugia-cesarea",
    cuenta: "DEMO-QX-001",
    paciente: "Paciente de demostración A",
    ci: "DEMO-001",
    medico: "Dra. María Salazar",
    tipo: "Cesárea",
    quirofano: "Quirófano 1",
    fecha: fechaDemo(1),
    hora: "08:00",
  },
  {
    id: "demo-cirugia-general",
    cuenta: "DEMO-QX-002",
    paciente: "Paciente de demostración B",
    ci: "DEMO-002",
    medico: "Dr. Pablo Rojas",
    tipo: "Colecistectomía",
    quirofano: "Quirófano 2",
    fecha: fechaDemo(2),
    hora: "10:30",
  },
  {
    id: "demo-cirugia-actual",
    cuenta: "DEMO-QX-003",
    paciente: "Paciente de demostración C",
    ci: "DEMO-003",
    medico: "Dr. Ever Luizaga",
    tipo: "Hernioplastia",
    quirofano: "Quirófano 1",
    fecha: fechaDemo(0),
    hora: "11:00",
  },
];
const leerCirugiasEsterilizacion = () => {
  const programadas = leerCronograma();
  return programadas;
};

type SubvistaEsterilizacion =
  | "sala"
  | "entrega"
  | "seguimiento"
  | "inventario"
  | "kits"
  | "paquetes"
  | "roperia"
  | "solicitudes"
  | "cronograma"
  | "area-roja"
  | "area-azul"
  | "area-verde";
type SubvistaEsterilizacionConfig = {
  id: SubvistaEsterilizacion;
  icono:
    "lab" | "check" | "search" | "package" | "asset" | "fileText" | "calendar";
  titulo: string;
  descripcion: string;
};
const SUBVISTAS: SubvistaEsterilizacionConfig[] = [
  {
    id: "sala",
    icono: "lab",
    titulo: "Recepción sucio",
    descripcion: "Ingreso de material para reprocesar.",
  },
  {
    id: "entrega",
    icono: "check",
    titulo: "Entrega de material estéril",
    descripcion: "Piezas limpias disponibles para entregar.",
  },
  {
    id: "seguimiento",
    icono: "search",
    titulo: "Seguimiento de esterilización",
    descripcion: "Ubicación y estado de cada pieza.",
  },
  {
    id: "inventario",
    icono: "package",
    titulo: "Inventario",
    descripcion: "Registro individual de material estéril.",
  },
  {
    id: "kits",
    icono: "package",
    titulo: "Cajas quirúrgicas",
    descripcion: "Grupos, reservas y preparación quirúrgica.",
  },
  {
    id: "paquetes",
    icono: "package",
    titulo: "Paquetes quirúrgicos",
    descripcion: "Agrupación de recursos para cirugías.",
  },
  {
    id: "roperia",
    icono: "asset",
    titulo: "Ropería",
    descripcion: "Control de ropa hospitalaria.",
  },
  {
    id: "solicitudes",
    icono: "fileText",
    titulo: "Solicitudes",
    descripcion: "Requerimientos de material para cirugía.",
  },
  {
    id: "cronograma",
    icono: "calendar",
    titulo: "Cronograma de cirugías",
    descripcion: "Agenda y preparación de procedimientos.",
  },
  {
    id: "area-roja",
    icono: "lab",
    titulo: "Área roja",
    descripcion: "Recepción, lavado y descontaminación.",
  },
  {
    id: "area-azul",
    icono: "asset",
    titulo: "Área azul",
    descripcion: "Preparación y esterilización.",
  },
  {
    id: "area-verde",
    icono: "package",
    titulo: "Área verde",
    descripcion: "Almacén estéril disponible para uso.",
  },
];

export function EsterilizacionView({
  titulo = "Control de material estéril",
  subvistaInicial = "inventario",
  subvistasVisibles = SUBVISTAS.map((item) => item.id),
}: {
  titulo?: string;
  subvistaInicial?: SubvistaEsterilizacion;
  subvistasVisibles?: SubvistaEsterilizacion[];
}) {
  const [subvista, setSubvista] =
    useState<SubvistaEsterilizacion>(subvistaInicial);
  const [datos, setDatos] = useState<EstadoEsterilizacion>(leerEsterilizacion);
  const [cirugias, setCirugias] = useState(leerCirugiasEsterilizacion);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroSector, setFiltroSector] = useState("");
  const [paginaInventario, setPaginaInventario] = useState(1);
  const [modal, setModal] = useState<
    "material" | "kit" | "agregar" | "estado" | "recepcion" | "etiqueta" | null
  >(null);
  const [formMaterial, setFormMaterial] = useState(MATERIAL_VACIO);
  const [guardandoMaterial, setGuardandoMaterial] = useState(false);
  const [exportandoInventario, setExportandoInventario] = useState(false);
  const [materialEditando, setMaterialEditando] = useState<MaterialEsteril | null>(null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const edicionActiva = useRef<string | null>(null);
  const abrirEdicionMaterial = (material: MaterialEsteril) => {
    edicionActiva.current = material.id;
    setMaterialEditando(material);
    setQuitarImagen(false);
    setError("");
    setFormMaterial({ codigo: material.codigo, nombre: material.nombre, lote: material.lote || "", medida: material.medida || "", cuentaConLogo: Boolean(material.cuentaConLogo), cantidad: String(material.cantidad ?? 0), descripcion: material.descripcion || "", imagen: material.imagen || "" });
    setModal("material");
    if (material.tieneImagen && !material.imagen) {
      apiFetch(`/api/v1/instrumental/${encodeURIComponent(material.id)}/imagen`)
        .then((respuesta) => { if (!respuesta.ok) throw new Error(); return respuesta.blob(); })
        .then((imagen) => { if (edicionActiva.current === material.id) setFormMaterial((actual) => actual.imagen ? actual : { ...actual, imagen: URL.createObjectURL(imagen) }); })
        .catch(() => { if (edicionActiva.current === material.id) setError("No se pudo cargar la vista previa de la imagen. La imagen guardada se conservará."); });
    }
  };
  const [formKit, setFormKit] = useState(KIT_VACIO);
  const ampliarImagenDialog = useRef<HTMLDialogElement>(null);
  const inputCamaraMaterial = useRef<HTMLInputElement>(null);
  const inputArchivoMaterial = useRef<HTMLInputElement>(null);
  const videoMaterialRef = useRef<HTMLVideoElement>(null);
  const camaraStreamRef = useRef<MediaStream | null>(null);
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [espejoCamara, setEspejoCamara] = useState(false);
  const [errorCamara, setErrorCamara] = useState("");
  const [materialesKit, setMaterialesKit] = useState<string[]>([]);
  const [busquedaAsociar, setBusquedaAsociar] = useState("");
  const [busquedaKit, setBusquedaKit] = useState("");
  const [filtroKitEstado, setFiltroKitEstado] = useState("");
  const [kitAbierto, setKitAbierto] = useState<string | null>(null);
  const [inspeccionKitAbierta, setInspeccionKitAbierta] = useState(false);
  const inspeccionKitDialog = useRef<HTMLDialogElement>(null);
  const [materialAbierto, setMaterialAbierto] = useState<string | null>(null);
  const [seguimientoAbierto, setSeguimientoAbierto] = useState(false);
  const seguimientoDialog = useRef<HTMLDialogElement>(null);
  const [destino, setDestino] = useState<EstadoMaterial | "">("");
  const [cirugiaId, setCirugiaId] = useState("");
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");

  const detenerCamaraMaterial = () => {
    camaraStreamRef.current?.getTracks().forEach((pista) => pista.stop());
    camaraStreamRef.current = null;
    if (videoMaterialRef.current) videoMaterialRef.current.srcObject = null;
    setCamaraAbierta(false);
  };

  const cerrarModal = () => {
    edicionActiva.current = null;
    detenerCamaraMaterial();
    setErrorCamara("");
    setModal(null);
  };

  useEffect(() => {
    if (!aviso) return;
    const temporizador = window.setTimeout(() => setAviso(""), 3000);
    return () => window.clearTimeout(temporizador);
  }, [aviso]);
  const [entregadoPor, setEntregadoPor] = useState("");
  const [usoMaterial, setUsoMaterial] = useState("");
  const [materialesRecibidos, setMaterialesRecibidos] = useState<string[]>([]);
  const [busquedaRecepcion, setBusquedaRecepcion] = useState("");
  const [materialEtiqueta, setMaterialEtiqueta] =
    useState<MaterialEsteril | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch('/api/v1/instrumental', { signal: controller.signal }).then(async respuesta => {
      if (respuesta.status === 401) throw new Error('La sesi?n de demostraci?n no permite acceder al inventario. Cierra sesi?n e ingresa con una cuenta registrada.');
      if (respuesta.status === 403) throw new Error('Tu cuenta no tiene acceso al inventario de instrumental.');
      if (!respuesta.ok) throw new Error('No se pudo cargar el instrumental del servidor.');
      const resultado = await respuesta.json() as { data: Array<{ id: string; codigo: string; nombre: string; lote: string | null; medida: string | null; cuenta_con_logo: boolean; imagen_ruta: string | null; cantidad: number; descripcion: string | null; ubicacion: string; estado: EstadoMaterial; updated_at: string }> };
      setDatos(actual => {
        const materiales = resultado.data.map(item => ({ id: item.id, codigo: item.codigo, nombre: item.nombre, lote: item.lote || '', medida: item.medida || '', cuentaConLogo: Boolean(item.cuenta_con_logo), tieneImagen: Boolean(item.imagen_ruta), cantidad: item.cantidad, descripcion: item.descripcion || '', sector: item.ubicacion, estado: item.estado, actualizadoEn: item.updated_at, imagen: '', tipo: 'Instrumento', marca: '', serie: '', cirugiaId: '' }));
        const ids = new Set(materiales.map(item => item.id));
        return { ...actual, materiales: [...actual.materiales.filter(item => !ids.has(item.id)), ...materiales] };
      });
    }).catch((causa: unknown) => { if (!controller.signal.aborted) setError(causa instanceof Error ? causa.message : 'No se pudo cargar el instrumental del servidor.'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const actualizar = () => {
      setDatos(leerEsterilizacion());
      setCirugias(leerCirugiasEsterilizacion());
    };
    window.addEventListener("storage", actualizar);
    return () => window.removeEventListener("storage", actualizar);
  }, []);

  useEffect(() => {
    setSubvista(subvistaInicial);
  }, [subvistaInicial]);

  useEffect(() => {
    if (!seguimientoAbierto || !materialAbierto) return;
    const material = datos.materiales.find(item => item.id === materialAbierto);
    if (!material || material.imagen || !/^[0-9a-f]{8}-/i.test(material.id)) return;
    const controller = new AbortController();
    apiFetch(`/api/v1/instrumental/${encodeURIComponent(material.id)}/imagen`, { signal: controller.signal })
      .then(respuesta => respuesta.ok ? respuesta.blob() : null)
      .then(blob => { if (!blob || controller.signal.aborted) return; const url = URL.createObjectURL(blob); setDatos(actual => ({ ...actual, materiales: actual.materiales.map(item => item.id === material.id ? { ...item, imagen: url } : item) })); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [seguimientoAbierto, materialAbierto]);

  useEffect(() => {
    const dialogo = seguimientoDialog.current;
    if (seguimientoAbierto && dialogo && !dialogo.open) dialogo.showModal();
  }, [seguimientoAbierto]);

  useEffect(() => {
    const dialogo = inspeccionKitDialog.current;
    if (inspeccionKitAbierta && dialogo && !dialogo.open) dialogo.showModal();
  }, [inspeccionKitAbierta]);

  useEffect(() => {
    if (!camaraAbierta) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorCamara('La c?mara en vivo requiere una conexi?n segura (HTTPS). Puedes tomar una foto con el dispositivo o cargar una imagen.');
      return;
    }
    let activo = true;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } } })
      .then((medio) => {
        if (!activo) {
          medio.getTracks().forEach((pista) => pista.stop());
          return;
        }
        stream = medio;
        camaraStreamRef.current = medio;
        setEspejoCamara(
          medio.getVideoTracks()[0]?.getSettings().facingMode === "user",
        );
        if (videoMaterialRef.current) {
          videoMaterialRef.current.srcObject = medio;
          void videoMaterialRef.current.play().catch(() => undefined);
        }
      })
      .catch(() => {
        if (activo) setErrorCamara("No se pudo abrir la cámara. Puedes cargar una imagen o usar la cámara del dispositivo.");
      });
    return () => {
      activo = false;
      stream?.getTracks().forEach((pista) => pista.stop());
      camaraStreamRef.current?.getTracks().forEach((pista) => pista.stop());
      camaraStreamRef.current = null;
      if (videoMaterialRef.current) videoMaterialRef.current.srcObject = null;
    };
  }, [camaraAbierta]);

  const guardar = (nuevos: EstadoEsterilizacion, mensaje: string) => {
    try {
      guardarEsterilizacion(nuevos);
      setDatos(nuevos);
      setAviso(mensaje);
      setError("");
      cerrarModal();
      return true;
    } catch {
      setError(
        "No se pudo guardar. Revisa que el almacenamiento de este navegador esté disponible.",
      );
      return false;
    }
  };
  const sectores = [
    ...new Set(datos.materiales.map((item) => item.sector)),
  ].sort();
  const materialesVisibles = useMemo(
    () =>
      datos.materiales
        .filter((item) => {
          const texto =
            `${item.codigo} ${item.nombre} ${item.lote || ""} ${item.descripcion} ${item.tipo} ${item.marca} ${item.serie}`.toLowerCase();
          return (
            texto.includes(busqueda.toLowerCase()) &&
            (!filtroEstado || item.estado === filtroEstado) &&
            (!filtroSector ||
              (subvista === "inventario"
                ? ubicacionMaterial(item, cirugias)
                : item.sector) === filtroSector)
          );
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [
      datos.materiales,
      busqueda,
      filtroEstado,
      filtroSector,
      subvista,
      cirugias,
    ],
  );
  const materialesPorPagina = 10;
  const totalPaginasInventario = Math.max(1, Math.ceil(materialesVisibles.length / materialesPorPagina));
  const paginaActualInventario = Math.min(paginaInventario, totalPaginasInventario);
  const inicioInventario = (paginaActualInventario - 1) * materialesPorPagina;
  const materialesPagina = materialesVisibles.slice(inicioInventario, inicioInventario + materialesPorPagina);
  useEffect(() => {
    setPaginaInventario((pagina) => Math.min(pagina, totalPaginasInventario));
  }, [totalPaginasInventario]);
  const kitsVisibles = datos.kits.filter(
    (item) =>
      `${item.nombre} ${item.descripcion}`
        .toLowerCase()
        .includes(busquedaKit.toLowerCase()) &&
      (!filtroKitEstado ||
        estadoKit(item, datos.materiales) === filtroKitEstado),
  );
  const kitSeleccionado = datos.kits.find((item) => item.id === kitAbierto);
  const materialSeleccionado = datos.materiales.find(
    (item) => item.id === materialAbierto,
  );
  const movimientos = datos.movimientos
    .filter((item) => item.materialId === materialAbierto)
    .slice()
    .reverse();
  const cirugiaAsignadaMaterial = materialSeleccionado?.cirugiaId
    ? cirugias.find((item) => item.id === materialSeleccionado.cirugiaId)
    : undefined;
  const ultimoMovimientoConCirugia = movimientos.find(
    (item) =>
      item.cirugiaId &&
      item.cirugiaId !== materialSeleccionado?.cirugiaId &&
      cirugias.some((cirugia) => cirugia.id === item.cirugiaId),
  );
  const ultimaRecepcionMaterial = datos.recepciones
    .filter((item) => item.materialId === materialAbierto)
    .slice()
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const cirugiasOrdenadas = [...cirugias].sort((a, b) =>
    `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`),
  );
  const cirugiasConMaterial = cirugiasOrdenadas.filter(
    (cirugia) =>
      datos.materiales.some((item) => item.cirugiaId === cirugia.id) ||
      datos.movimientos.some(
        (movimiento) => movimiento.cirugiaId === cirugia.id,
      ),
  );
  const recepcionesOrdenadas = [...datos.recepciones].sort((a, b) =>
    b.fecha.localeCompare(a.fecha),
  );
  const materialesEntregables = datos.materiales.filter((item) =>
    ["limpio", "reservado", "cirugia"].includes(item.estado),
  );
  const materialesFiltradosRecepcion = materialesEntregables.filter((item) =>
    `${item.codigo} ${item.nombre} ${item.serie}`
      .toLowerCase()
      .includes(busquedaRecepcion.toLowerCase()),
  );
  const codigoMaterialNormalizado = normalizarCodigoMaterial(formMaterial.codigo);
  const codigoMaterialDuplicado = Boolean(
    codigoMaterialNormalizado && datos.materiales.some(
      (item) => item.id !== materialEditando?.id && normalizarCodigoMaterial(item.codigo) === codigoMaterialNormalizado,
    ),
  );

  const crearMaterial = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const codigo = formMaterial.codigo.trim();
    const materialesActuales = leerEsterilizacion().materiales;
    if (
      materialesActuales.some(
        (item) => item.id !== materialEditando?.id && normalizarCodigoMaterial(item.codigo) === normalizarCodigoMaterial(codigo),
      )
    ) {
      setError("Ya existe un material con ese código único. Ingresa uno diferente.");
      return;
    }
    if (guardandoMaterial) return;
    setGuardandoMaterial(true);
    setError('');
    try {
      const cuerpo = new FormData();
      cuerpo.set('codigo', codigo);
      cuerpo.set('nombre', formMaterial.nombre.trim());
      cuerpo.set('lote', formMaterial.lote.trim());
      cuerpo.set('medida', formMaterial.medida.trim());
      cuerpo.set('cuenta_con_logo', formMaterial.cuentaConLogo ? '1' : '0');
      cuerpo.set('cantidad', formMaterial.cantidad);
      cuerpo.set('descripcion', formMaterial.descripcion.trim());
      if (formMaterial.imagen && (!materialEditando || formMaterial.imagen.startsWith('data:'))) cuerpo.set('imagen', await (await fetch(formMaterial.imagen)).blob(), 'instrumental.jpg');
      if (materialEditando) { cuerpo.set('_method', 'PATCH'); cuerpo.set('eliminar_imagen', quitarImagen ? '1' : '0'); }
      const respuesta = await apiFetch(materialEditando ? `/api/v1/instrumental/${encodeURIComponent(materialEditando.id)}` : '/api/v1/instrumental', { method: 'POST', body: cuerpo });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(Object.values(resultado.errors || {}).flat()[0] as string || resultado.message || 'No se pudo registrar el material.');
      const registro = resultado.data;
      const material: MaterialEsteril = { ...materialEditando, id: registro.id, codigo: registro.codigo, nombre: registro.nombre, lote: registro.lote || '', medida: registro.medida || '', cuentaConLogo: Boolean(registro.cuenta_con_logo), tieneImagen: Boolean(registro.imagen_ruta), cantidad: registro.cantidad, imagen: formMaterial.imagen, descripcion: registro.descripcion || '', tipo: materialEditando?.tipo || 'Instrumento', marca: materialEditando?.marca || '', serie: materialEditando?.serie || '', sector: registro.ubicacion, estado: registro.estado, cirugiaId: materialEditando?.cirugiaId || '', actualizadoEn: registro.updated_at };
      setDatos(actual => ({ ...actual, materiales: materialEditando ? actual.materiales.map(item => item.id === material.id ? material : item) : [...actual.materiales, material] }));
      setFormMaterial(MATERIAL_VACIO);
      cerrarModal();
      setAviso(materialEditando ? 'Material actualizado correctamente.' : 'Material registrado correctamente.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo registrar el material.');
    } finally { setGuardandoMaterial(false); }
  };

  const cargarImagenMaterial = async (archivo?: File) => {
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen valido.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(archivo);
      const lado = Math.min(bitmap.width, bitmap.height, 1200);
      const origenX = Math.round((bitmap.width - lado) / 2);
      const origenY = Math.round((bitmap.height - lado) / 2);
      const canvas = document.createElement("canvas");
      canvas.width = lado;
      canvas.height = lado;
      const contexto = canvas.getContext("2d");
      if (!contexto) throw new Error("No se pudo preparar la imagen.");
      contexto.drawImage(bitmap, origenX, origenY, lado, lado, 0, 0, lado, lado);
      bitmap.close();
      setFormMaterial((actual) => ({ ...actual, imagen: canvas.toDataURL("image/jpeg", 0.8) }));
      setError("");
    } catch {
      setError("No se pudo abrir la imagen seleccionada.");
    }
  };

  const capturarImagenMaterial = () => {
    const video = videoMaterialRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setErrorCamara("La cámara todavía se está preparando.");
      return;
    }
    const ladoOrigen = Math.min(video.videoWidth, video.videoHeight);
    const origenX = Math.round((video.videoWidth - ladoOrigen) / 2);
    const origenY = Math.round((video.videoHeight - ladoOrigen) / 2);
    const lado = Math.min(ladoOrigen, 1200);
    const canvas = document.createElement("canvas");
    canvas.width = lado;
    canvas.height = lado;
    const contexto = canvas.getContext("2d");
    if (!contexto) {
      setErrorCamara("No se pudo capturar la imagen.");
      return;
    }
    if (espejoCamara) {
      contexto.translate(lado, 0);
      contexto.scale(-1, 1);
    }
    contexto.drawImage(video, origenX, origenY, ladoOrigen, ladoOrigen, 0, 0, lado, lado);
    setFormMaterial((actual) => ({ ...actual, imagen: canvas.toDataURL("image/jpeg", 0.8) }));
    setCamaraAbierta(false);
    setErrorCamara("");
    setError("");
  };

  const crearKit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!materialesKit.length) {
      setError("Selecciona al menos un material para la caja quirúrgica.");
      return;
    }
    if (
      datos.kits.some(
        (item) =>
          item.nombre.toLowerCase() === formKit.nombre.trim().toLowerCase(),
      )
    ) {
      setError("Ya existe una caja con ese nombre.");
      return;
    }
    const kit: KitEsteril = {
      id: crypto.randomUUID(),
      nombre: formKit.nombre.trim(),
      descripcion: formKit.descripcion.trim(),
      especialidades: [],
      materialIds: materialesKit,
    };
    if (
      guardar(
        { ...datos, kits: [...datos.kits, kit] },
        `Caja quirúrgica ${kit.nombre} creada con ${kit.materialIds.length} materiales.`,
      )
    ) {
      setFormKit(KIT_VACIO);
      setMaterialesKit([]);
      setKitAbierto(kit.id);
    }
  };

  const agregarMateriales = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!kitSeleccionado || !materialesKit.length) {
      setError("Selecciona al menos un material nuevo para añadir.");
      return;
    }
    const nuevosIds = [
      ...new Set([...kitSeleccionado.materialIds, ...materialesKit]),
    ];
    guardar(
      {
        ...datos,
        kits: datos.kits.map((item) =>
          item.id === kitSeleccionado.id
            ? { ...item, materialIds: nuevosIds }
            : item,
        ),
      },
      `${materialesKit.length} materiales añadidos al kit ${kitSeleccionado.nombre}.`,
    );
    setMaterialesKit([]);
  };

  const cambiarEstado = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const material = materialSeleccionado;
    if (
      !material ||
      !destino ||
      !SIGUIENTES_ESTADOS[material.estado].includes(destino)
    )
      return;
    const cirugiaAsignada =
      destino === "reservado"
        ? cirugiaId
        : destino === "cirugia"
          ? material.cirugiaId
          : "";
    if (
      (destino === "reservado" || destino === "cirugia") &&
      !cirugiaAsignada
    ) {
      setError("Selecciona una cirugía programada para asignar el material.");
      return;
    }
    const fecha = new Date().toISOString();
    const actualizados = datos.materiales.map((item) =>
      item.id === material.id
        ? {
            ...item,
            estado: destino,
            cirugiaId: cirugiaAsignada,
            actualizadoEn: fecha,
          }
        : item,
    );
    guardar(
      {
        ...datos,
        materiales: actualizados,
        movimientos: [
          ...datos.movimientos,
          {
            id: crypto.randomUUID(),
            materialId: material.id,
            desde: material.estado,
            hacia: destino,
            cirugiaId: material.cirugiaId || cirugiaAsignada,
            fecha,
          },
        ],
      },
      `${material.nombre}: ${ETIQUETAS_ESTADO[destino]}.`,
    );
  };

  const abrirRecepcion = () => {
    setEntregadoPor("");
    setUsoMaterial("");
    setMaterialesRecibidos([]);
    setBusquedaRecepcion("");
    setError("");
    setModal("recepcion");
  };
  const leerCodigoBarras = () => {
    const codigo = window.prompt(
      "Ingresa o pega el código de barras del material.",
    );
    if (!codigo?.trim()) return;
    const valor = codigo.trim();
    setBusquedaRecepcion(valor);
    const material = materialesEntregables.find(
      (item) => item.codigo.toLowerCase() === valor.toLowerCase(),
    );
    if (!material) {
      setError(`No se encontró una pieza disponible con el código ${valor}.`);
      return;
    }
    setMaterialesRecibidos((actual) =>
      actual.includes(material.id) ? actual : [...actual, material.id],
    );
    setError("");
  };
  const registrarRecepcion = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!entregadoPor.trim()) {
      setError("Indica quién entrega el material.");
      return;
    }
    if (!usoMaterial.trim()) {
      setError("Indica dónde fue utilizado el material.");
      return;
    }
    if (!materialesRecibidos.length) {
      setError("Selecciona al menos una pieza recibida.");
      return;
    }
    const fecha = new Date().toISOString();
    const kitDe = (materialId: string) =>
      datos.kits.find((kit) => kit.materialIds.includes(materialId))?.id || "";
    const recepciones: RecepcionMaterialSucio[] = materialesRecibidos.map(
      (materialId) => ({
        id: crypto.randomUUID(),
        materialId,
        kitId: kitDe(materialId),
        entregadoPor: entregadoPor.trim(),
        uso: usoMaterial.trim(),
        fecha,
      }),
    );
    const ids = new Set(materialesRecibidos);
    const materiales = datos.materiales.map((item) =>
      ids.has(item.id)
        ? {
            ...item,
            estado: "sucio" as const,
            cirugiaId: "",
            sector: "Recepción sucio",
            actualizadoEn: fecha,
          }
        : item,
    );
    const movimientos = datos.movimientos.concat(
      datos.materiales
        .filter((item) => ids.has(item.id))
        .map((item) => ({
          id: crypto.randomUUID(),
          materialId: item.id,
          desde: item.estado,
          hacia: "sucio" as const,
          cirugiaId: item.cirugiaId,
          fecha,
        })),
    );
    guardar(
      {
        ...datos,
        materiales,
        movimientos,
        recepciones: [...datos.recepciones, ...recepciones],
      },
      `${recepciones.length} pieza${recepciones.length === 1 ? "" : "s"} recibida${recepciones.length === 1 ? "" : "s"} como material sucio.`,
    );
  };

  const reservarKit = () => {
    if (!kitSeleccionado || !cirugiaId) {
      setError("Selecciona una cirugía para reservar el kit.");
      return;
    }
    const integrantes = kitSeleccionado.materialIds.map((id) =>
      datos.materiales.find((item) => item.id === id),
    );
    if (integrantes.some((item) => !item || item.estado !== "limpio")) {
      setError(
        "Todos los materiales de la caja deben estar limpios y disponibles para reservarlo.",
      );
      return;
    }
    const fecha = new Date().toISOString();
    const ids = new Set(kitSeleccionado.materialIds);
    const actualizados = datos.materiales.map((item) =>
      ids.has(item.id)
        ? {
            ...item,
            estado: "reservado" as const,
            cirugiaId,
            actualizadoEn: fecha,
          }
        : item,
    );
    guardar(
      {
        ...datos,
        materiales: actualizados,
        movimientos: [
          ...datos.movimientos,
          ...integrantes
            .filter((item): item is MaterialEsteril => Boolean(item))
            .map((item) => ({
              id: crypto.randomUUID(),
              materialId: item.id,
              desde: "limpio" as const,
              hacia: "reservado" as const,
              cirugiaId,
              fecha,
            })),
        ],
      },
      `Caja ${kitSeleccionado.nombre} reservada para la cirug?a seleccionada.`,
    );
  };

  const abrirMovimiento = (id: string) => {
    setMaterialAbierto(id);
    setDestino("");
    setCirugiaId("");
    setError("");
    setModal("estado");
    setCirugias(leerCirugiasEsterilizacion());
  };
  const verSeguimiento = (id: string) => {
    setMaterialAbierto(id);
    setCirugias(leerCirugiasEsterilizacion());
    setSeguimientoAbierto(true);
  };
  const cambiarSubvista = (destinoVista: SubvistaEsterilizacion) => {
    setSubvista(destinoVista);
    setBusqueda("");
    setFiltroEstado("");
    setFiltroSector("");
    setAviso("");
    setError("");
  };
  const abrirAgregar = (id: string) => {
    inspeccionKitDialog.current?.close();
    setKitAbierto(id);
    setMaterialesKit([]);
    setBusquedaAsociar("");
    setError("");
    setModal("agregar");
  };

  const navegacionVisible = SUBVISTAS.filter((item) =>
    subvistasVisibles.includes(item.id),
  );
  return (
    <section
      className="recepcion-vista est-vista esterilizacion-vista"
      aria-label="Esterilización de quirófano"
    >
      <div className="cocina-subvista-cabecera">
        {navegacionVisible.length > 1 && (
          <HorizontalSubvistaNav
            className={`recepcion-subvistas ${navegacionVisible.length === 2 ? "dos-subvistas" : ""} ${navegacionVisible.length === 3 ? "tres-subvistas" : ""} ${navegacionVisible.length === 4 ? "cuatro-subvistas" : ""}`}
            ariaLabel="Subvistas de Esterilización"
          >
            {navegacionVisible.map((item) => (
              <button
                key={item.id}
                type="button"
                className={subvista === item.id ? "activo" : ""}
                aria-current={subvista === item.id ? "page" : undefined}
                onClick={() => cambiarSubvista(item.id)}
              >
                <span>
                  <Icon name={item.icono} size={17} />
                </span>
                <strong>{item.titulo}</strong>
                <small>{item.descripcion}</small>
              </button>
            ))}
          </HorizontalSubvistaNav>
        )}
      </div>
      <header className="est-cabecera">
        <div>
          <p>QUIRÓFANO · ESTERILIZACIÓN</p>
          <h2>{titulo}</h2>
          <small>
            Inventario, cajas quirúrgicas y trazabilidad del material utilizado en cirugía.
          </small>
        </div>
        <span>
          <Icon name="lab" size={20} /> {datos.materiales.length} materiales
          registrados
        </span>
      </header>
      {navegacionVisible.length > 1 && (
        <nav
          className="est-subvistas"
          aria-label="Sub-vistas de esterilización"
        >
          {navegacionVisible.map((item) => (
            <button
              key={item.id}
              type="button"
              className={subvista === item.id ? "activo" : ""}
              onClick={() => cambiarSubvista(item.id)}
            >
              <Icon name={item.icono} size={17} />
              {item.titulo}
            </button>
          ))}
        </nav>
      )}
      {aviso && <AvisoTemporal mensaje={aviso} />}
      {error && !modal && (
        <p className="est-error" role="alert">
          {error}
        </p>
      )}

      {subvista === "sala" && (
        <RecepcionSucio
          recepciones={recepcionesOrdenadas}
          materiales={datos.materiales}
          kits={datos.kits}
          onAbrir={abrirRecepcion}
        />
      )}

      {subvista === "area-roja" && (
        <AreaEsterilizacion
          area="roja"
          materiales={datos.materiales.filter(
            (item) => item.estado === "pendiente" || item.estado === "sucio",
          )}
          cirugias={cirugias}
          onAccion={abrirMovimiento}
          onRecepcion={abrirRecepcion}
        />
      )}
      {subvista === "area-azul" && (
        <AreaEsterilizacion
          area="azul"
          materiales={datos.materiales.filter(
            (item) => item.estado === "esterilizacion",
          )}
          cirugias={cirugias}
          onAccion={abrirMovimiento}
        />
      )}
      {subvista === "area-verde" && (
        <AreaEsterilizacion
          area="verde"
          materiales={datos.materiales.filter(
            (item) => item.estado === "limpio",
          )}
          cirugias={cirugias}
          onAccion={verSeguimiento}
        />
      )}

      {subvista === "entrega" && (
        <section className="est-panel">
          <header>
            <div>
              <h3>Material estéril disponible</h3>
              <small>
                Piezas limpias listas para entregar a un procedimiento o área
                solicitante.
              </small>
            </div>
          </header>
          <TablaMateriales
            materiales={datos.materiales.filter(
              (item) => item.estado === "limpio",
            )}
            cirugias={cirugias}
            onAccion={verSeguimiento}
            accion="Ver"
          />
        </section>
      )}

      {subvista === "solicitudes" && (
        <SolicitudesMateriales
          cirugias={cirugiasOrdenadas}
          materiales={datos.materiales}
          onVerMaterial={verSeguimiento}
        />
      )}

      {subvista === "cronograma" && (
        <CronogramaCirugias
          cirugias={cirugiasOrdenadas}
          materiales={datos.materiales}
          onVerMaterial={verSeguimiento}
        />
      )}

      {subvista === "seguimiento" && (
        <>
          <div className="est-resumen">
            {(
              [
                "pendiente",
                "sucio",
                "esterilizacion",
                "limpio",
                "reservado",
                "cirugia",
              ] as EstadoMaterial[]
            ).map((estado) => (
              <div key={estado}>
                <strong>
                  {
                    datos.materiales.filter((item) => item.estado === estado)
                      .length
                  }
                </strong>
                <small>{ETIQUETAS_ESTADO[estado]}</small>
              </div>
            ))}
          </div>
          <section className="est-panel">
            <div className="est-filtros">
              <label>
                <Icon name="search" size={16} />
                <input
                  aria-label="Buscar material"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, código o serie"
                />
              </label>
              <select
                aria-label="Filtrar por estado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos los estados</option>
                {Object.entries(ETIQUETAS_ESTADO).map(([id, nombre]) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar por sector"
                value={filtroSector}
                onChange={(e) => setFiltroSector(e.target.value)}
              >
                <option value="">Todos los sectores</option>
                {sectores.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <TablaMateriales
              materiales={materialesVisibles}
              cirugias={cirugias}
              onAccion={abrirMovimiento}
              accion="Registrar movimiento"
            />
          </section>
          {materialSeleccionado && (
            <section className="est-panel est-historial">
              <header>
                <div>
                  <h3>Historial · {materialSeleccionado.nombre}</h3>
                  <small>
                    {materialSeleccionado.codigo} · {movimientos.length}{" "}
                    movimientos registrados
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => setMaterialAbierto(null)}
                  aria-label="Cerrar historial"
                >
                  <Icon name="close" size={16} />
                </button>
              </header>
              <div className="est-historial-lista">
                {movimientos.map((item) => (
                  <div key={item.id}>
                    <time>{new Date(item.fecha).toLocaleString("es-BO")}</time>
                    <strong>
                      {item.desde === "registro"
                        ? "Registro inicial"
                        : ETIQUETAS_ESTADO[item.desde]}{" "}
                      → {ETIQUETAS_ESTADO[item.hacia]}
                    </strong>
                    <small>
                      {cirugias.find((c) => c.id === item.cirugiaId)?.cuenta ||
                        "Sin cirugía asignada"}
                    </small>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {subvista === "inventario" && (
        <section className="est-panel">
          <div className="est-filtros est-filtros-inventario">
            <label>
              <Icon name="search" size={16} />
              <input
                aria-label="Buscar material"
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setPaginaInventario(1); }}
                placeholder="Buscar por código o nombre"
              />
            </label>
            <select
              aria-label="Filtrar por ubicación"
              value={filtroSector}
              onChange={(e) => { setFiltroSector(e.target.value); setPaginaInventario(1); }}
            >
              <option value="">Todas las ubicaciones</option>
              {[
                ...new Set(
                  datos.materiales.map((item) =>
                    ubicacionMaterial(item, cirugias),
                  ),
                ),
              ]
                .sort()
                .map((item) => (
                  <option key={item}>{item}</option>
                ))}
            </select>
            <select
              aria-label="Filtrar por estado"
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setPaginaInventario(1); }}
            >
              <option value="">Todos los estados</option>
              {Object.entries(ETIQUETAS_ESTADO).map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
            <button
              className="est-exportar-inventario"
              type="button"
              disabled={exportandoInventario}
              onClick={async () => {
                setExportandoInventario(true);
                setError("");
                setMaterialEditando(null);
                setQuitarImagen(false);
                try {
                  await exportarInstrumentalPdf(datos.materiales, (item) => ubicacionMaterial(item, cirugias));
                  setAviso("Reporte PDF generado correctamente.");
                } catch (causa) {
                  setError(causa instanceof Error ? causa.message : "No se pudo generar el reporte PDF.");
                } finally { setExportandoInventario(false); }
              }}
            >
              <Icon name="download" size={16} /> {exportandoInventario ? "Generando..." : "Reporte PDF"}
            </button>
            <button
              className="est-principal"
              type="button"
              onClick={() => {
                setError("");
                setFormMaterial(MATERIAL_VACIO);
                setModal("material");
              }}
            >
              <Icon name="plus" size={16} /> Registrar nuevo material
            </button>
          </div>
          <PaginacionInventario pagina={paginaActualInventario} totalPaginas={totalPaginasInventario} total={materialesVisibles.length} inicio={inicioInventario} cantidad={materialesPagina.length} onCambiar={setPaginaInventario} />
          <div className="est-tabla-scroll">
            <table className="est-tabla-inventario" aria-label="Inventario de material">
              <thead><tr><th>Código</th><th>Nombre</th><th>Lote</th><th>Cantidad</th><th>Ubicación</th><th>Descripción / observaciones</th><th>Acciones</th></tr></thead>
              <tbody>
                {materialesPagina.map((item) => (
                  <tr key={item.id}>
                    <td>{item.codigo}</td>
                    <td><strong>{item.nombre}</strong></td>
                    <td>{item.lote || "-"}</td>
                    <td>{item.cantidad ?? 1}</td>
                    <td>{ubicacionMaterial(item, cirugias)}</td>
                    <td className="est-descripcion-material">{item.descripcion || "-"}</td>
                    <td><div className="est-acciones-instrumental"><button type="button" title="Ver detalle" aria-label={`Ver detalle de ${item.nombre}`} onClick={() => verSeguimiento(item.id)}><Icon name="eye" size={17} /></button><button type="button" title="Editar material" aria-label={`Editar ${item.nombre}`} onClick={() => abrirEdicionMaterial(item)}><Icon name="edit" size={17} /></button></div></td>
                  </tr>
                ))}
                {!materialesVisibles.length && <tr><td colSpan={7}>No hay materiales que coincidan con la busqueda.</td></tr>}
              </tbody>
            </table>
          </div>
          <PaginacionInventario pagina={paginaActualInventario} totalPaginas={totalPaginasInventario} total={materialesVisibles.length} inicio={inicioInventario} cantidad={materialesPagina.length} onCambiar={setPaginaInventario} />
        </section>
      )}
      {subvista === "kits" && (
        <section className="est-panel est-kits-panel">
          <header>
            <div>
              <h3>Cajas quirúrgicas</h3>
            </div>
          </header>
          <div className="est-filtros">
            <label>
              <Icon name="search" size={16} />
              <input
                aria-label="Buscar caja"
                value={busquedaKit}
                onChange={(e) => setBusquedaKit(e.target.value)}
                placeholder="Buscar caja quirurgica"
              />
            </label>
<select
              aria-label="Filtrar cajas por estado"
              value={filtroKitEstado}
              onChange={(e) => setFiltroKitEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {Object.entries(ETIQUETAS_KIT).map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
            <button
              className="est-principal"
              type="button"
              onClick={() => {
                setError("");
                setFormKit(KIT_VACIO);
                setMaterialesKit([]);
                setBusquedaAsociar("");
                setModal("kit");
              }}
            >
              <Icon name="plus" size={16} /> Crear caja quirúrgica
            </button>
          </div>
          {kitsVisibles.length ? (
            <div className="est-kits est-kits-tarjetas">
              {kitsVisibles.map((kit) => (
                <article
                  key={kit.id}
                  className={
                    kitAbierto === kit.id
                      ? "est-kit-tarjeta activo"
                      : "est-kit-tarjeta"
                  }
                >
                  <div className="est-kit-tarjeta-info">
                    <Icon name="package" size={20} />
                    <span>
                      <strong>{kit.nombre}</strong>
                      <small>{kit.materialIds.length} materiales · {kit.descripcion || "Materiales de la caja"}</small>
                    </span>
                    <b
                      className={`est-kit-estado ${estadoKit(kit, datos.materiales)}`}
                    >
                      {ETIQUETAS_KIT[estadoKit(kit, datos.materiales)]}
                    </b>
                  </div>
                  <div className="est-kit-acciones">
                    <button
                      type="button"
                      onClick={() => {
                        setKitAbierto(kit.id);
                        setCirugiaId("");
                        setError("");
                        setAviso("");
                        setCirugias(leerCirugiasEsterilizacion());
                        setInspeccionKitAbierta(true);
                      }}
                    >
                      Inspeccionar
                    </button>
                    <button type="button" onClick={() => abrirAgregar(kit.id)}>
                      Añadir materiales
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="est-vacio">
              <Icon name="package" size={26} />
              <strong>No hay cajas quirúrgicas con estos filtros</strong>
              <small>Crea una caja o ajusta la búsqueda.</small>
            </div>
          )}
        </section>
      )}
      {subvista === "paquetes" && <PaquetesQuirurgicosView materiales={datos.materiales} cajas={datos.kits} cirugiasProgramadas={cirugias} />}
      {subvista === "roperia" && <RoperiaView />}

      <dialog
        ref={inspeccionKitDialog}
        className="est-modal est-seguimiento-modal est-kit-inspeccion"
        aria-labelledby="inspeccion-kit-titulo"
        onClose={() => setInspeccionKitAbierta(false)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            event.currentTarget.close();
        }}
      >
        <header>
          <div>
             <p>CAJA QUIRÚRGICA</p>
            <h3 id="inspeccion-kit-titulo">
              {kitSeleccionado?.nombre || "Contenido de la caja"}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Cerrar inspección de la caja"
            onClick={() => inspeccionKitDialog.current?.close()}
          >
            <Icon name="close" size={17} />
          </button>
        </header>
        {kitSeleccionado && (
          <div className="est-kit-detalle">
            <div className="est-kit-detalle-cabecera">
              <div>
                <small>
                  {kitSeleccionado.descripcion || "Materiales incluidos en la caja"}</small>
              </div>
              <button
                type="button"
                onClick={() => abrirAgregar(kitSeleccionado.id)}
              >
                + Añadir materiales
              </button>
            </div>
            <ul>
              {kitSeleccionado.materialIds.map((id) => {
                const item = datos.materiales.find(
                  (material) => material.id === id,
                );
                return (
                  <li className="est-kit-instrumento" key={id}>
                    <span className="est-kit-instrumento-imagen">
                      {item?.imagen ? (
                        <img
                          src={item.imagen}
                          alt={`Imagen de ${item.nombre}`}
                        />
                      ) : (
                        <Icon name="asset" size={20} />
                      )}
                    </span>
                    <span className="est-kit-instrumento-datos">
                      {item?.nombre || "Material no disponible"}{" "}
                      <small>
                        {item?.codigo || "Sin código"} ·{" "}
                        {item?.lote || item?.serie || item?.marca ||
                          item?.tipo ||
                          "Sin serie"}
                      </small>
                    </span>
                    <b className={`est-estado ${item?.estado || "pendiente"}`}>
                      {item
                        ? item.estado === "cirugia" ||
                          item.estado === "reservado"
                          ? "Ocupado · " + ETIQUETAS_ESTADO[item.estado]
                          : ETIQUETAS_ESTADO[item.estado]
                        : "Sin registro"}
                    </b>
                  </li>
                );
              })}
            </ul>
            <div className="est-kit-reserva">
              <select
                aria-label="Cirugía para reservar el kit"
                value={cirugiaId}
                onChange={(e) => setCirugiaId(e.target.value)}
              >
                <option value="">Seleccionar cirugía programada</option>
                {cirugiasOrdenadas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {etiquetaCirugia(item)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={reservarKit}
                disabled={!cirugiasOrdenadas.length}
              >
                Reservar caja
              </button>
            </div>
            {error && (
              <p className="est-error" role="alert">
                {error}
              </p>
            )}
            <footer>
              <button
                type="button"
                onClick={() => inspeccionKitDialog.current?.close()}
              >
                Cerrar
              </button>
            </footer>
          </div>
        )}
      </dialog>

      <dialog
        ref={seguimientoDialog}
        className="est-modal est-seguimiento-modal"
        aria-labelledby="seguimiento-material-titulo"
        onClose={() => setSeguimientoAbierto(false)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            event.currentTarget.close();
        }}
      >
        <header>
          <div>
            <p>SEGUIMIENTO DEL MATERIAL</p>
            <h3 id="seguimiento-material-titulo">
              {materialSeleccionado?.nombre || "Historial del material"}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Cerrar seguimiento"
            onClick={() => seguimientoDialog.current?.close()}
          >
            <Icon name="close" size={17} />
          </button>
        </header>
        {materialSeleccionado && (
          <div className="est-seguimiento-contenido">
            <div className="est-modal-identidad">
              <div><small>INSTRUMENTO QUIRÚRGICO</small><strong>{materialSeleccionado.codigo}</strong></div>
              <span className={`est-estado ${materialSeleccionado.estado}`}>
                {ETIQUETAS_ESTADO[materialSeleccionado.estado]}
              </span>
            </div>
            <section
              className="est-ficha-material"
              aria-label="Información y trazabilidad actual del instrumento"
            >
              <div className="est-ficha-datos">
                <div className="est-ficha-identidad">
                  <div>
                    <small>INSTRUMENTO QUIRÚRGICO · CÓDIGO</small>
                    <strong className="est-ficha-codigo">{materialSeleccionado.codigo}</strong>
                    <h4>{materialSeleccionado.nombre}</h4>
                  </div>
                  <span className={`est-estado ${materialSeleccionado.estado}`}>
                    {ETIQUETAS_ESTADO[materialSeleccionado.estado]}
                  </span>
                </div>
                <div className="est-ficha-principal">
                  <div className="est-ficha-imagen">
                    {materialSeleccionado.imagen ? (
                      <img src={materialSeleccionado.imagen} alt={`Imagen de ${materialSeleccionado.nombre}`} />
                    ) : (
                      <div className="est-ficha-sin-imagen"><Icon name="image" size={27} /><span>Sin imagen</span></div>
                    )}
                  </div>
                  <dl>
                    <div><dt>Nombre</dt><dd>{materialSeleccionado.nombre}</dd></div>
                    <div><dt>Medida</dt><dd>{materialSeleccionado.medida || "No registrada"}</dd></div>
                    <div><dt>Cuenta con logo</dt><dd>{materialSeleccionado.cuentaConLogo ? "Sí" : "No"}</dd></div>
                    <div><dt>Lote</dt><dd>{materialSeleccionado.lote || "No registrado"}</dd></div>
                    <div><dt>Cantidad</dt><dd>{materialSeleccionado.cantidad ?? 1} {materialSeleccionado.cantidad === 1 || materialSeleccionado.cantidad == null ? "unidad" : "unidades"}</dd></div>
                  </dl>
                </div>
                <div className="est-ficha-observaciones">
                  <span>Descripción / observaciones</span>
                  <p>{materialSeleccionado.descripcion || "Sin descripción u observaciones."}</p>
                </div>
              </div>
              <div className="est-ficha-situacion">
                <h4>Situación actual</h4>
                <article>
                  <span>
                    <Icon name="package" size={17} />
                  </span>
                  <div>
                    <strong>
                      {ubicacionMaterial(materialSeleccionado, cirugias)}
                    </strong>
                    <small>Ubicación actual del instrumento</small>
                  </div>
                </article>
                <article
                  className={
                    materialSeleccionado.estado === "limpio" ? "disponible" : ""
                  }
                >
                  <span>
                    <Icon
                      name={
                        materialSeleccionado.estado === "reservado"
                          ? "calendar"
                          : "check"
                      }
                      size={17}
                    />
                  </span>
                  <div>
                    <strong>
                      {materialSeleccionado.estado === "reservado" &&
                      cirugiaAsignadaMaterial
                        ? `Reservado · ${etiquetaCirugia(cirugiaAsignadaMaterial)}`
                        : materialSeleccionado.estado === "limpio"
                          ? "Libre para una próxima cirugía"
                          : ETIQUETAS_ESTADO[materialSeleccionado.estado]}
                    </strong>
                    <small>
                      {materialSeleccionado.estado === "reservado"
                        ? "No disponible hasta terminar la cirugía asignada."
                        : materialSeleccionado.estado === "limpio"
                          ? "Puede entregarse o reservarse para un nuevo procedimiento."
                          : "Disponibilidad condicionada por su estado de reprocesamiento."}
                    </small>
                  </div>
                </article>
                <article className="est-ficha-ultimo-uso">
                <h4>Última cirugía o procedimiento</h4>
                {ultimoMovimientoConCirugia ? (
                  <>
                    <strong>
                      {etiquetaCirugia(
                        cirugias.find(
                          (item) =>
                            item.id === ultimoMovimientoConCirugia.cirugiaId,
                        )!,
                      )}
                    </strong>
                    <small>
                      {new Date(
                        ultimoMovimientoConCirugia.fecha,
                      ).toLocaleString("es-BO")}{" "}
                      · {ETIQUETAS_ESTADO[ultimoMovimientoConCirugia.hacia]}
                    </small>
                  </>
                ) : ultimaRecepcionMaterial ? (
                  <>
                    <strong>
                      {ultimaRecepcionMaterial.uso ||
                        "Procedimiento no especificado"}
                    </strong>
                    <small>
                      {new Date(ultimaRecepcionMaterial.fecha).toLocaleString(
                        "es-BO",
                      )}{" "}
                      · Recibido desde quirófano
                    </small>
                  </>
                ) : (
                  <>
                    <strong>Sin uso quirúrgico registrado</strong>
                    <small>
                      El historial aparecerá cuando el material sea asignado o
                      recibido de un procedimiento.
                    </small>
                  </>
                )}
                </article>
              </div>
            </section>
            <h4>Historial de movimientos</h4>
            {movimientos.length ? (
              <div className="est-historial-lista">
                {movimientos.map((item) => (
                  <div key={item.id}>
                    <time>{new Date(item.fecha).toLocaleString("es-BO")}</time>
                    <strong>
                      {item.desde === "registro"
                        ? "Registro inicial"
                        : ETIQUETAS_ESTADO[item.desde]}{" "}
                      → {ETIQUETAS_ESTADO[item.hacia]}
                    </strong>
                    <small>
                      {cirugias.find((c) => c.id === item.cirugiaId)?.cuenta ||
                        "Sin cirugía asignada"}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="est-ayuda">
                Este material todavía no tiene movimientos registrados.
              </p>
            )}
            <footer>
              <button
                type="button"
                onClick={() => seguimientoDialog.current?.close()}
              >
                Cerrar
              </button>
            </footer>
          </div>
        )}
      </dialog>
      {modal && (
        <div
          className="est-modal-fondo"
          role="presentation"
          onMouseDown={cerrarModal}
        >
          <section
            className={modal === "material" ? "est-modal est-modal-material" : "est-modal"}
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "recepcion"
                ? "Recepción de material sucio"
                : modal === "material"
                  ? (materialEditando ? "Editar material estéril" : "Registrar material estéril")
                  : modal === "kit"
                    ? "Crear caja quirúrgica de instrumental"
                    : modal === "agregar"
                      ? "Añadir materiales al kit"
                      : "Registrar movimiento de material"
            }
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <p>ESTERILIZACIÓN</p>
                <h3>
                  {modal === "recepcion"
                    ? "Recepción de material sucio"
                    : modal === "material"
                      ? (materialEditando ? "Editar material" : "Registrar nuevo material")
                      : modal === "kit"
                        ? "Crear caja quirúrgica"
                        : modal === "agregar"
                          ? `Añadir materiales · ${kitSeleccionado?.nombre || ""}`
                          : "Registrar movimiento"}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Cerrar ventana"
                onClick={cerrarModal}
              >
                <Icon name="close" size={17} />
              </button>
            </header>
            {modal === "etiqueta" && materialEtiqueta && (
              <div className="est-etiqueta-vista">
                <EtiquetaCodigo material={materialEtiqueta} />
                <div className="est-etiqueta-acciones">
                  <button type="button" onClick={() => window.print()}>
                    Imprimir
                  </button>
                  <button type="button" onClick={cerrarModal}>
                    Cerrar
                  </button>
                </div>
              </div>
            )}
            {modal === "recepcion" && (
              <form onSubmit={registrarRecepcion}>
                <div className="est-form-grid">
                  <label>
                    Entregado por *
                    <input
                      required
                      value={entregadoPor}
                      onChange={(e) => setEntregadoPor(e.target.value)}
                      placeholder="Nombre del personal que entrega"
                    />
                  </label>
                  <label>
                    Utilizado en / procedencia *
                    <input
                      required
                      list="cirugias-con-material"
                      value={usoMaterial}
                      onChange={(e) => setUsoMaterial(e.target.value)}
                      placeholder="Selecciona una cirugía o escribe la procedencia"
                    />
                    <datalist id="cirugias-con-material">
                      {cirugiasConMaterial.map((cirugia) => (
                        <option
                          key={cirugia.id}
                          value={etiquetaCirugia(cirugia)}
                        />
                      ))}
                    </datalist>
                  </label>
                </div>
                <div className="est-recepcion-selector">
                  <fieldset className="est-recepcion-lista">
                    <legend>Material disponible</legend>
                    <label className="est-recepcion-buscar">
                      <Icon name="search" size={16} />
                      <input
                        value={busquedaRecepcion}
                        onChange={(e) => setBusquedaRecepcion(e.target.value)}
                        placeholder="Buscar por nombre, código o serie"
                      />
                    </label>
                    <button
                      className="est-lector-codigo"
                      type="button"
                      onClick={leerCodigoBarras}
                    >
                      <Icon name="camera" size={16} /> Lector de código de
                      barras
                    </button>
                    {materialesFiltradosRecepcion.length ? (
                      materialesFiltradosRecepcion.map((item) => {
                        const kit = datos.kits.find((grupo) =>
                          grupo.materialIds.includes(item.id),
                        );
                        return (
                          <label key={item.id}>
                            <input
                              type="checkbox"
                              checked={materialesRecibidos.includes(item.id)}
                              onChange={() =>
                                setMaterialesRecibidos((actual) =>
                                  actual.includes(item.id)
                                    ? actual.filter((id) => id !== item.id)
                                    : [...actual, item.id],
                                )
                              }
                            />
                            <span>
                              <strong>{item.nombre}</strong>
                              <small>
                                {item.codigo} · {item.lote || item.serie || item.tipo}
                              </small>
                            </span>
                            <em>{kit?.nombre || "Pieza individual"}</em>
                          </label>
                        );
                      })
                    ) : (
                      <p>No se encontraron piezas disponibles.</p>
                    )}
                  </fieldset>
                  <aside className="est-recepcion-seleccion">
                    <strong>Seleccionado ({materialesRecibidos.length})</strong>
                    {materialesRecibidos.length ? (
                      <ul>
                        {materialesRecibidos.map((id) => {
                          const item = datos.materiales.find(
                            (material) => material.id === id,
                          );
                          return (
                            <li key={id}>
                              <span>
                                {item?.nombre}
                                <small>{item?.codigo}</small>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setMaterialesRecibidos((actual) =>
                                    actual.filter(
                                      (materialId) => materialId !== id,
                                    ),
                                  )
                                }
                                aria-label={`Quitar ${item?.nombre || "material"}`}
                              >
                                <Icon name="close" size={14} />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p>
                        Selecciona las piezas recibidas para revisarlas aquí.
                      </p>
                    )}
                  </aside>
                </div>
                {error && (
                  <p className="est-error" role="alert">
                    {error}
                  </p>
                )}
                <footer>
                  <button type="button" onClick={cerrarModal}>
                    Cancelar
                  </button>
                  <button type="submit">
                    Registrar recepción ({materialesRecibidos.length})
                  </button>
                </footer>
              </form>
            )}
            {modal === "material" && (
              <form onSubmit={crearMaterial}>
                <div className="est-form-material">
                  <div className="est-material-layout">
                    <div className="est-campo-imagen">
                    <span className="est-imagen-titulo">Imagen del material</span>
                    <div className="est-imagen-acciones">
                      <button type="button" onClick={() => { setErrorCamara(""); setCamaraAbierta(true); }}><Icon name="camera" size={16} /> Utilizar cámara</button>
                      <button type="button" onClick={() => inputArchivoMaterial.current?.click()}><Icon name="image" size={16} /> Cargar imagen</button>
                    </div>
                    {!camaraAbierta && !formMaterial.imagen && (
                      <div className="est-imagen-placeholder">
                        <Icon name="image" size={34} />
                        <strong>Imagen del material</strong>
                        <span>La foto se ajustará a un formato cuadrado.</span>
                      </div>
                    )}
                    {camaraAbierta && (
                      <div className="est-camara-vista">
                        {errorCamara ? (
                          <div className="est-camara-error" role="status"><strong>No se pudo iniciar la cámara</strong><span>{errorCamara}</span><small>Revisa el permiso del navegador o toma una foto desde el dispositivo.</small></div>
                        ) : (
                          <video className={espejoCamara ? "est-video-espejo" : undefined} ref={videoMaterialRef} autoPlay playsInline muted aria-label="Vista previa de la cámara" />
                        )}
                        <div>
                          {errorCamara && (
                            <><button type="button" onClick={() => { setCamaraAbierta(false); setErrorCamara(""); window.setTimeout(() => setCamaraAbierta(true), 0); }}>Reintentar cámara</button><button type="button" onClick={() => inputCamaraMaterial.current?.click()}>Tomar foto</button></>
                          )}
                          {!errorCamara && (
                            <>
                              <button type="button" className="est-boton-espejo" aria-pressed={espejoCamara} onClick={() => setEspejoCamara((actual) => !actual)}>{espejoCamara ? "Desactivar espejo" : "Activar espejo"}</button>
                              <button type="button" className="est-boton-captura" onClick={capturarImagenMaterial}>Capturar foto</button>
                            </>
                          )}
                      <button type="button" onClick={() => { detenerCamaraMaterial(); setErrorCamara(""); }}>Cerrar cámara</button>
                        </div>
                      </div>
                    )}
                    <input ref={inputCamaraMaterial} className="est-input-archivo-oculto" type="file" accept="image/*" capture="environment" aria-label="Tomar foto del material" onChange={(e) => { cargarImagenMaterial(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                    <input ref={inputArchivoMaterial} className="est-input-archivo-oculto" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Cargar imagen del material" onChange={(e) => { cargarImagenMaterial(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                    {formMaterial.imagen && (
                      <span className="est-imagen-previsualizacion">
                        <button type="button" className="est-ampliar-imagen" aria-label="Ampliar imagen del material" onClick={() => ampliarImagenDialog.current?.showModal()}>
                          <img src={formMaterial.imagen} alt="Vista previa del material" />
                          <span>Ampliar imagen</span>
                        </button>
                        <dialog ref={ampliarImagenDialog} className="est-imagen-dialogo" aria-label="Imagen ampliada del material" onClick={(evento) => { if (evento.target === evento.currentTarget) evento.currentTarget.close(); }}>
                          <button type="button" onClick={() => ampliarImagenDialog.current?.close()} aria-label="Cerrar imagen ampliada">Cerrar</button>
                          <img src={formMaterial.imagen} alt="Imagen ampliada del material" />
                        </dialog>
                        <button type="button" onClick={() => { setQuitarImagen(true); setFormMaterial({ ...formMaterial, imagen: "" }); }}>Quitar imagen</button>
                      </span>
                    )}
                    </div>
                    <div className="est-material-datos">
                      <label>
                        Código único *
                        <input required value={formMaterial.codigo} aria-invalid={codigoMaterialDuplicado} aria-describedby="material-codigo-ayuda" onChange={(e) => { setFormMaterial({ ...formMaterial, codigo: e.target.value }); setError(""); }} placeholder="Ej. INST-001" />
                        <small id="material-codigo-ayuda" className={codigoMaterialDuplicado ? "est-codigo-ayuda est-codigo-ayuda-error" : "est-codigo-ayuda"} role={codigoMaterialDuplicado ? "alert" : undefined}>
                          {codigoMaterialDuplicado ? "Este código ya está registrado. Usa uno distinto." : "El código debe ser único en el inventario."}
                        </small>
                      </label>
                      <label>
                        Nombre del material *
                        <input required value={formMaterial.nombre} onChange={(e) => setFormMaterial({ ...formMaterial, nombre: e.target.value })} placeholder="Ej. Pinza Kelly" />
                      </label>
                      <label>
                        Medida
                        <input value={formMaterial.medida} maxLength={100} onChange={(e) => setFormMaterial({ ...formMaterial, medida: e.target.value })} placeholder="Ej. 14 cm" />
                      </label>
                      <label>
                        Lote
                        <input value={formMaterial.lote} onChange={(e) => setFormMaterial({ ...formMaterial, lote: e.target.value })} placeholder="Número o referencia del lote" />
                      </label>
                      <label className="est-cuenta-logo">
                        <input type="checkbox" checked={formMaterial.cuentaConLogo} onChange={(e) => setFormMaterial({ ...formMaterial, cuentaConLogo: e.target.checked })} />
                        <span>Cuenta con logo</span>
                      </label>
                      <label>
                        Cantidad *
                        <input required type="number" min={materialEditando ? "0" : "1"} max="1000000" step="1" value={formMaterial.cantidad} onChange={(e) => setFormMaterial({ ...formMaterial, cantidad: e.target.value })} />
                      </label>
                      <label>
                        Descripción / observaciones
                        <textarea value={formMaterial.descripcion} onChange={(e) => setFormMaterial({ ...formMaterial, descripcion: e.target.value })} placeholder="Anota características u observaciones" />
                      </label>
                    </div>
                  </div>
                </div>
                {!materialEditando && <p className="est-ayuda">Ubicación inicial: Almacén esterilización.</p>}
                {error && (
                  <p className="est-error" role="alert">
                    {error}
                  </p>
                )}
                <footer>
                  <button type="button" onClick={cerrarModal}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={codigoMaterialDuplicado || guardandoMaterial}>{guardandoMaterial ? "Guardando..." : materialEditando ? "Guardar cambios" : "Registrar material"}</button>
                </footer>
              </form>
            )}
            {modal === "kit" && (
              <form onSubmit={crearKit}>
                <div className="est-form-grid">
                  <label>
                    Nombre de la caja quirúrgica *
                    <input
                      required
                      value={formKit.nombre}
                      onChange={(e) =>
                        setFormKit({ ...formKit, nombre: e.target.value })
                      }
                      placeholder="Ej. Caja de cesárea"
                    />
                  </label>
                  <label>
                    Descripción
                    <input
                      value={formKit.descripcion}
                      onChange={(e) =>
                        setFormKit({ ...formKit, descripcion: e.target.value })
                      }
                      placeholder="Uso previsto"
                    />
                  </label>
                </div>
<label className="est-buscar-kit">
                  <Icon name="search" size={16} />
                  <input
                    value={busquedaAsociar}
                    onChange={(e) => setBusquedaAsociar(e.target.value)}
                    placeholder="Buscar material para agregar"
                  />
                </label>
                <div className="est-lista-asociar">
                  {datos.materiales
                    .filter((item) =>
                      `${item.codigo} ${item.nombre} ${item.lote || ""}`
                        .toLowerCase()
                        .includes(busquedaAsociar.toLowerCase()),
                    )
                    .map((item) => (
                      <label key={item.id}>
                        <input
                          type="checkbox"
                          checked={materialesKit.includes(item.id)}
                          onChange={() =>
                            setMaterialesKit((actual) =>
                              actual.includes(item.id)
                                ? actual.filter((id) => id !== item.id)
                                : [...actual, item.id],
                            )
                          }
                        />
                        <span>
                          <strong>{item.nombre}</strong>
                          <small>{item.codigo} · Lote {item.lote || "-"} · Cantidad {item.cantidad ?? 1}</small>
                        </span>
                        <b className={`est-estado ${item.estado}`}>
                          {ETIQUETAS_ESTADO[item.estado]}
                        </b>
                      </label>
                    ))}
                  {!datos.materiales.length && (
                    <p>Registra materiales antes de crear una caja.</p>
                  )}
                </div>
                <p className="est-ayuda">Los materiales siguen en el inventario y pueden pertenecer a otras cajas.</p>
                {error && (
                  <p className="est-error" role="alert">
                    {error}
                  </p>
                )}
                <footer>
                  <button type="button" onClick={cerrarModal}>
                    Cancelar
                  </button>
                  <button type="submit">
                    Guardar caja ({materialesKit.length})
                  </button>
                </footer>
              </form>
            )}
            {modal === "agregar" && kitSeleccionado && (
              <form onSubmit={agregarMateriales}>
                <p className="est-ayuda">Selecciona los materiales que quieres incorporar a esta caja quirúrgica.</p>
                <label className="est-buscar-kit">
                  <Icon name="search" size={16} />
                  <input
                    value={busquedaAsociar}
                    onChange={(e) => setBusquedaAsociar(e.target.value)}
                    placeholder="Buscar material por código o nombre"
                  />
                </label>
                <div className="est-lista-asociar">
                  {datos.materiales
                    .filter(
                      (item) =>
                        !kitSeleccionado.materialIds.includes(item.id) &&
                        `${item.codigo} ${item.nombre} ${item.lote || ""}`
                          .toLowerCase()
                          .includes(busquedaAsociar.toLowerCase()),
                    )
                    .map((item) => (
                      <label key={item.id}>
                        <input
                          type="checkbox"
                          checked={materialesKit.includes(item.id)}
                          onChange={() =>
                            setMaterialesKit((actual) =>
                              actual.includes(item.id)
                                ? actual.filter((id) => id !== item.id)
                                : [...actual, item.id],
                            )
                          }
                        />
                        <span>
                          <strong>{item.nombre}</strong>
                          <small>{item.codigo} · Lote {item.lote || "-"} · Cantidad {item.cantidad ?? 1}</small>
                        </span>
                        <b className={`est-estado ${item.estado}`}>
                          {ETIQUETAS_ESTADO[item.estado]}
                        </b>
                      </label>
                    ))}
                  {!datos.materiales.some(
                    (item) => !kitSeleccionado.materialIds.includes(item.id),
                  ) && <p>No hay más instrumentos disponibles para añadir.</p>}
                </div>
                {error && (
                  <p className="est-error" role="alert">
                    {error}
                  </p>
                )}
                <footer>
                  <button type="button" onClick={cerrarModal}>
                    Cancelar
                  </button>
                  <button type="submit">
                    Añadir materiales ({materialesKit.length})
                  </button>
                </footer>
              </form>
            )}
            {modal === "estado" && materialSeleccionado && (
              <form onSubmit={cambiarEstado}>
                <p className="est-modal-identidad">
                  <strong>{materialSeleccionado.nombre}</strong>
                  <small>
                    {materialSeleccionado.codigo} · Estado actual:{" "}
                    {ETIQUETAS_ESTADO[materialSeleccionado.estado]}
                  </small>
                </p>
                <div className="est-form-grid">
                  <label>
                    Nuevo estado *
                    <select
                      required
                      value={destino}
                      onChange={(e) =>
                        setDestino(e.target.value as EstadoMaterial)
                      }
                    >
                      <option value="">Seleccionar estado</option>
                      {SIGUIENTES_ESTADOS[materialSeleccionado.estado].map(
                        (item) => (
                          <option key={item} value={item}>
                            {ETIQUETAS_ESTADO[item]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  {destino === "reservado" && (
                    <label>
                      Cirugía programada *
                      <select
                        required
                        value={cirugiaId}
                        onChange={(e) => setCirugiaId(e.target.value)}
                      >
                        <option value="">Seleccionar cirugía</option>
                        {cirugiasOrdenadas.map((item) => (
                          <option key={item.id} value={item.id}>
                            {etiquetaCirugia(item)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                {destino === "cirugia" && (
                  <p className="est-ayuda">
                    Asignado a{" "}
                    {cirugias.find(
                      (item) => item.id === materialSeleccionado.cirugiaId,
                    )?.cuenta || "la cirugía registrada"}
                    .
                  </p>
                )}
                {destino === "limpio" && (
                  <p className="est-ayuda">
                    Confirma este estado solo cuando el material haya completado
                    el proceso de esterilización.
                  </p>
                )}
                {error && (
                  <p className="est-error" role="alert">
                    {error}
                  </p>
                )}
                <footer>
                  <button type="button" onClick={cerrarModal}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={!destino}>
                    Registrar cambio
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function EtiquetaCodigo({ material }: { material: MaterialEsteril }) {
  const barras = Array.from(material.codigo).flatMap((caracter, indice) => [
    1 + (caracter.charCodeAt(0) % 3),
    1,
    2 + ((caracter.charCodeAt(0) + indice) % 2),
  ]);
  return (
    <div className="est-etiqueta">
      <div
        className="est-etiqueta-barras"
        aria-label={`Código de barras ${material.codigo}`}
      >
        {barras.map((ancho, indice) => (
          <i key={indice} style={{ width: `${ancho}px` }} />
        ))}
      </div>
      <strong>{material.nombre}</strong>
      <span>{material.codigo}</span>
    </div>
  );
}

function RecepcionSucio({
  recepciones,
  materiales,
  kits,
  onAbrir,
}: {
  recepciones: RecepcionMaterialSucio[];
  materiales: MaterialEsteril[];
  kits: KitEsteril[];
  onAbrir: () => void;
}) {
  return (
    <section className="est-panel est-recepcion-panel">
      <header>
        <div>
          <h3>Material recibido</h3>
          <small>
            Registro individual de cada pieza entregada para reprocesamiento.
          </small>
        </div>
        <button className="est-recepcion-boton" type="button" onClick={onAbrir}>
          <Icon name="plus" size={17} /> Recepción de material sucio
        </button>
      </header>
      <div className="est-tabla-scroll">
        <table className="est-recepcion-tabla">
          <thead>
            <tr>
              <th>Material / código</th>
              <th>Kit</th>
              <th>Entregado por</th>
              <th>Utilizado en</th>
              <th>Fecha de recepción</th>
            </tr>
          </thead>
          <tbody>
            {recepciones.map((recepcion) => {
              const material = materiales.find(
                (item) => item.id === recepcion.materialId,
              );
              const kit = kits.find((item) => item.id === recepcion.kitId);
              return (
                <tr key={recepcion.id}>
                  <td>
                    <strong>
                      {material?.nombre || "Material no disponible"}
                    </strong>
                    <small>
                      {material?.codigo || "Sin código"} ·{" "}
                      {material?.serie || material?.tipo || "Sin serie"}
                    </small>
                  </td>
                  <td>{kit?.nombre || "Pieza individual"}</td>
                  <td>{recepcion.entregadoPor}</td>
                  <td>{recepcion.uso}</td>
                  <td>{new Date(recepcion.fecha).toLocaleString("es-BO")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!recepciones.length && (
        <div className="est-vacio">
          <Icon name="package" size={26} />
          <strong>Aún no hay material recibido</strong>
          <small>Registra la primera entrega para verla en este listado.</small>
        </div>
      )}
    </section>
  );
}

function AreaEsterilizacion({
  area,
  materiales,
  cirugias,
  onAccion,
  onRecepcion,
}: {
  area: "roja" | "azul" | "verde";
  materiales: MaterialEsteril[];
  cirugias: CirugiaProgramada[];
  onAccion: (id: string) => void;
  onRecepcion?: () => void;
}) {
  const contenido =
    area === "roja"
      ? {
          titulo: "Área roja · material contaminado",
          detalle:
            "Recepción, clasificación, lavado y descontaminación antes de esterilizar.",
          accion: "Procesar",
          vacio: "No hay material pendiente de limpieza.",
        }
      : area === "azul"
        ? {
            titulo: "Área azul · esterilización",
            detalle:
              "Material en preparación, empaque o ciclo de esterilización.",
            accion: "Finalizar proceso",
            vacio: "No hay material en ciclo de esterilización.",
          }
        : {
            titulo: "Área verde · almacén estéril",
            detalle:
              "Material limpio, liberado y disponible para reservar o entregar.",
            accion: "Ver",
            vacio: "No hay material estéril almacenado.",
          };
  return (
    <section className={`est-panel est-area-esterilizacion ${area}`}>
      <header>
        <div>
          <p>
            {area === "roja"
              ? "ZONA CONTAMINADA"
              : area === "azul"
                ? "ZONA LIMPIA"
                : "ZONA ESTÉRIL"}
          </p>
          <h3>{contenido.titulo}</h3>
          <small>{contenido.detalle}</small>
        </div>
        <div>
          {onRecepcion && (
            <button
              className="est-area-recepcion"
              type="button"
              onClick={onRecepcion}
            >
              <Icon name="plus" size={16} /> Recibir material sucio
            </button>
          )}
          <span>
            {materiales.length} pieza{materiales.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>
      <div className="est-area-flujo">
        <span className={area === "roja" ? "activo" : ""}>Área roja</span>
        <i />
        <span className={area === "azul" ? "activo" : ""}>Área azul</span>
        <i />
        <span className={area === "verde" ? "activo" : ""}>Área verde</span>
      </div>
      {materiales.length ? (
        <TablaMateriales
          materiales={materiales}
          cirugias={cirugias}
          onAccion={onAccion}
          accion={contenido.accion}
        />
      ) : (
        <div className="est-vacio">
          <Icon name={area === "verde" ? "package" : "lab"} size={27} />
          <strong>{contenido.vacio}</strong>
          <small>
            {area === "roja"
              ? "Registra una recepción para iniciar el reprocesamiento."
              : area === "azul"
                ? "Las piezas llegarán aquí al finalizar limpieza y preparación."
                : "Las piezas liberadas de esterilización aparecerán aquí."}
          </small>
        </div>
      )}
    </section>
  );
}

function SolicitudesMateriales({
  cirugias,
  materiales,
  onVerMaterial,
}: {
  cirugias: CirugiaProgramada[];
  materiales: MaterialEsteril[];
  onVerMaterial: (id: string) => void;
}) {
  const solicitudes = cirugias
    .map((cirugia) => ({
      cirugia,
      piezas: materiales.filter(
        (material) =>
          material.cirugiaId === cirugia.id &&
          ["reservado", "cirugia"].includes(material.estado),
      ),
    }))
    .filter((item) => item.piezas.length);
  return (
    <section className="est-panel est-solicitudes">
      <header>
        <div>
          <h3>Solicitudes de material</h3>
          <small>
            Material solicitado o reservado para cada cirugía programada.
          </small>
        </div>
        <span>
          {solicitudes.length} solicitud{solicitudes.length === 1 ? "" : "es"}{" "}
          activa{solicitudes.length === 1 ? "" : "s"}
        </span>
      </header>
      {solicitudes.length ? (
        <div className="est-solicitudes-lista">
          {solicitudes.map(({ cirugia, piezas }) => (
            <article key={cirugia.id}>
              <div className="est-solicitud-fecha">
                <strong>{cirugia.fecha.split("-").reverse().join("/")}</strong>
                <small>{cirugia.hora}</small>
              </div>
              <div>
                <strong>{cirugia.tipo}</strong>
                <small>
                  {cirugia.paciente} · {cirugia.quirofano}
                </small>
              </div>
              <div>
                <b>
                  {piezas.length} pieza{piezas.length === 1 ? "" : "s"}
                </b>
                <small>
                  {piezas.every((item) => item.estado === "reservado")
                    ? "Preparado para entrega"
                    : "Material en uso"}
                </small>
              </div>
              <div className="est-solicitud-materiales">
                {piezas.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => onVerMaterial(item.id)}
                  >
                    {item.nombre}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="est-vacio">
          <Icon name="fileText" size={27} />
          <strong>No hay solicitudes activas</strong>
          <small>
            Las reservas de kits y materiales para cirugía aparecerán aquí.
          </small>
        </div>
      )}
    </section>
  );
}

function CronogramaCirugias({
  cirugias,
  materiales,
  onVerMaterial,
}: {
  cirugias: CirugiaProgramada[];
  materiales: MaterialEsteril[];
  onVerMaterial: (id: string) => void;
}) {
  return (
    <section className="est-panel est-cronograma">
      <header>
        <div>
          <h3>Cronograma de cirugías</h3>
          <small>
            Verifica la preparación de instrumental antes de cada procedimiento.
          </small>
        </div>
        <span>{cirugias.length} cirugías programadas</span>
      </header>
      <div className="est-tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Cirugía / paciente</th>
              <th>Quirófano</th>
              <th>Material preparado</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {cirugias.map((cirugia) => {
              const piezas = materiales.filter(
                (item) => item.cirugiaId === cirugia.id,
              );
              const listas = piezas.filter(
                (item) =>
                  item.estado === "reservado" || item.estado === "cirugia",
              );
              return (
                <tr key={cirugia.id}>
                  <td>
                    <strong>
                      {cirugia.fecha.split("-").reverse().join("/")}
                    </strong>
                    <small>{cirugia.hora}</small>
                  </td>
                  <td>
                    <strong>{cirugia.tipo}</strong>
                    <small>
                      {cirugia.paciente} · {cirugia.cuenta}
                    </small>
                  </td>
                  <td>{cirugia.quirofano}</td>
                  <td>
                    {listas.length ? (
                      <div className="est-cronograma-piezas">
                        <b>
                          {listas.length} pieza{listas.length === 1 ? "" : "s"}{" "}
                          lista{listas.length === 1 ? "" : "s"}
                        </b>
                        {listas.slice(0, 2).map((item) => (
                          <button
                            type="button"
                            onClick={() => onVerMaterial(item.id)}
                            key={item.id}
                          >
                            {item.codigo}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="est-sin-cirugia">Aún sin material</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`est-cronograma-estado ${listas.length ? "preparado" : "pendiente"}`}
                    >
                      {listas.length
                        ? "En preparación"
                        : "Pendiente de solicitud"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TablaMateriales({
  materiales,
  cirugias,
  onAccion,
  accion,
}: {
  materiales: MaterialEsteril[];
  cirugias: CirugiaProgramada[];
  onAccion: (id: string) => void;
  accion: string;
}) {
  return materiales.length ? (
    <div className="est-tabla-scroll">
      <table>
        <thead>
          <tr>
            <th>Material / código</th>
            <th>Tipo y serie</th>
            <th>Sector / ubicación</th>
            <th>Estado</th>
            <th>Cirugía asignada</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {materiales.map((item) => {
            const cirugia = cirugias.find((c) => c.id === item.cirugiaId);
            const ubicacion =
              item.estado === "cirugia"
                ? cirugia?.quirofano
                : item.estado === "esterilizacion"
                  ? "Sala de esterilización"
                  : item.sector;
            return (
              <tr key={item.id}>
                <td>
                  <strong>{item.nombre}</strong>
                  <small>{item.codigo}</small>
                </td>
                <td>
                  {item.tipo}
                  <small>{item.serie || item.marca || "Sin serie"}</small>
                </td>
                <td>
                  {ubicacion || item.sector}
                  <small>Origen: {item.sector}</small>
                </td>
                <td>
                  <span className={`est-estado ${item.estado}`}>
                    {ETIQUETAS_ESTADO[item.estado]}
                  </span>
                </td>
                <td>
                  {cirugia ? (
                    <>
                      <strong>{cirugia.cuenta}</strong>
                      <small>
                        {cirugia.fecha} · {cirugia.hora}
                      </small>
                    </>
                  ) : (
                    <span className="est-sin-cirugia">Sin asignar</span>
                  )}
                </td>
                <td>
                  <button type="button" onClick={() => onAccion(item.id)}>
                    {accion}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="est-vacio">
      <Icon name="package" size={26} />
      <strong>No hay materiales con estos filtros</strong>
      <small>Registra una pieza en Inventario o ajusta la búsqueda.</small>
    </div>
  );
}

function ubicacionMaterial(
  item: MaterialEsteril,
  cirugias: CirugiaProgramada[],
): string {
  if (item.estado === "esterilizacion") return "Sala de esterilización";
  if (item.estado === "cirugia")
    return (
      cirugias.find((cirugia) => cirugia.id === item.cirugiaId)?.quirofano ||
      item.sector
    );
  return item.sector;
}
