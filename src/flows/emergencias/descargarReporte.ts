export async function descargarReporte({ descargar, archivar }: {
  descargar: () => void | Promise<void>;
  archivar?: () => Promise<void>;
}): Promise<string | null> {
  await descargar();
  if (!archivar) return "El PDF se descargó, pero no se archivó: vincula la atención con la ficha del paciente.";
  try {
    await archivar();
    return null;
  } catch (causa) {
    return `El PDF se descargó, pero no se pudo archivar. ${causa instanceof Error ? causa.message : "Intenta guardar el reporte nuevamente más tarde."}`;
  }
}
