<template>
  <svg :width="tam" :height="tam" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       :stroke-width="grosor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
       v-html="TRAZOS[nombre] || ''"></svg>
</template>

<script setup>
defineProps({
  nombre: { type: String, required: true },
  tam: { type: [Number, String], default: 16 },
  grosor: { type: [Number, String], default: 1.75 }
});

// Trazos propios en una sola rejilla de 24 px para que todos pesen igual
const TRAZOS = {
  panel: '<path d="M3 13h7V3H3zM14 21h7V11h-7zM14 7h7V3h-7zM3 21h7v-4H3z"/>',
  boleta: '<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5M9 12h8M9 16h8M9 8h3"/>',
  historial: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  mapa: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  caja: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  lote: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M8 4v5M8 13h3M8 16h6"/>',
  movimientos: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  rejilla: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 9v12M15 9v12"/>',
  informe: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pedido: '<path d="M3 3h2l2.5 12h11L21 7H6.2"/><circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/>',
  tendencia: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  catalogo: '<path d="M4 4h16v4H4zM4 10h16v4H4zM4 16h16v4H4z"/>',
  usuarios: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/>',
  bitacora: '<path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2z"/><path d="M5 19a2 2 0 0 1 2-2h12M9 7h6M9 11h4"/>',
  salir: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  cerrar: '<path d="M18 6L6 18M6 6l12 12"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  imprimir: '<path d="M6 9V3h12v6M6 18H3v-8h18v8h-3"/><path d="M6 14h12v7H6z"/>',
  descargar: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  anular: '<circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/>',
  papelera: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  ojo: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  campana: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  luna: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  alerta: '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  chispa: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  flecha_der: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  flecha_izq: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chevron_der: '<path d="M9 6l6 6-6 6"/>',
  chevron_abajo: '<path d="M6 9l6 6 6-6"/>',
  llave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  entrada: '<path d="M12 3v13M7 11l5 5 5-5M4 21h16"/>',
  salida: '<path d="M12 21V8M7 13l5-5 5 5M4 3h16"/>',
  filtro: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  ambulancia: '<path d="M3 17V7h11v10M14 10h4l3 3.5V17h-2"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/><path d="M8.5 9.5v4M6.5 11.5h4"/>',
  incendio: '<path d="M12 22c4 0 7-2.7 7-6.8 0-3.6-2.6-5.7-3.8-8.7-.5 1.8-1.6 3-2.9 3.5C12.6 6.8 11 4 8.5 2c.3 3.3-3.5 5.8-3.5 10.2C5 18.6 8 22 12 22z"/><path d="M12 22c-1.8 0-3-1.3-3-3.1 0-2 1.6-2.6 2.2-4.4 1.2 1 3.8 2.3 3.8 4.6 0 1.6-1.2 2.9-3 2.9z"/>',
  rescate: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M14.5 9.5l3.9-3.9M5.6 18.4l3.9-3.9"/>',
  varios: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.6-.7-.7-2.6z"/>',
  agua: '<path d="M12 2.5s6.5 7 6.5 12A6.5 6.5 0 0 1 5.5 14.5c0-5 6.5-12 6.5-12z"/>'
};
</script>
