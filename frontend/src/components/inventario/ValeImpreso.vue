<template>
  <!-- Vale de entrega con el formato de la hoja que hoy se llena a mano (INVENTARIO.xlsx) -->
  <div class="vale">
    <header>
      <img src="/LogoBomberos.png" alt="" />
      <div>
        <strong>BENEMÉRITO CUERPO VOLUNTARIO DE BOMBEROS</strong>
        <strong>TRIGÉSIMA NOVENA COMPAÑÍA CHIQUIMULA, GUATEMALA</strong>
        <span>{{ TITULOS[doc.categoria] || 'CONTROL DE PRODUCTOS' }} CORRESPONDIENTE AL MES: {{ MESES[mes - 1]?.toUpperCase() }} AÑO: {{ anio }}</span>
      </div>
    </header>
    <p class="numero">Vale {{ doc.numero }}</p>
    <table>
      <thead>
        <tr><th>CANT.</th><th>{{ COLUMNA[doc.categoria] || 'PRODUCTO' }}</th><th>FECHA DE SALIDA</th><th>RECIBIDO POR</th><th>ESCUADRA</th><th>FIRMA DE RECIBIDO</th><th>ENTREGADO POR</th></tr>
      </thead>
      <tbody>
        <tr v-for="l in doc.lineas" :key="l.id">
          <td class="centro">{{ l.cantidad }}</td>
          <td>{{ l.nombre }}</td>
          <td class="centro">{{ fecha(doc.fecha) }}</td>
          <td>{{ doc.recibe }}</td>
          <td class="centro">{{ doc.escuadra }}</td>
          <td></td>
          <td>{{ doc.entrega }}</td>
        </tr>
        <tr v-for="i in Math.max(0, 8 - doc.lineas.length)" :key="'v' + i" class="vacia"><td v-for="c in 7" :key="c"></td></tr>
      </tbody>
    </table>
    <footer>
      <div class="raya"></div>
      <span>Oficial I As. Kevin Gabriel Cerín Marroquín</span>
      <span>Director 39 Compañía</span>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { MESES, fecha } from '../../utils/formato';

const props = defineProps({ doc: { type: Object, required: true } });
const TITULOS = {
  limpieza: 'CONTROL DE PRODUCTOS DE LIMPIEZA',
  libreria: 'CONTROL DE PRODUCTOS DE LIBRERÍA',
  prehospitalario: 'CONTROL DE EQUIPO PREHOSPITALARIO',
  cafeteria: 'CONTROL DE INSUMOS DE CAFETERÍA'
};
const COLUMNA = { prehospitalario: 'EQUIPO PREHOSPITALARIO', cafeteria: 'INSUMO' };
const mes = computed(() => Number(String(props.doc.fecha).slice(5, 7)));
const anio = computed(() => String(props.doc.fecha).slice(0, 4));
</script>

<style scoped>
.vale { background: #fff; color: #000; font-family: Arial, sans-serif; padding: 24px 28px; width: 100%; }
header { display: flex; align-items: center; gap: 16px; text-align: center; }
header img { width: 64px; }
header div { flex: 1; display: flex; flex-direction: column; gap: 2px; }
header strong { font-size: 14px; }
header span { font-size: 12px; font-weight: 700; margin-top: 6px; }
.numero { text-align: right; font-size: 11px; margin: 8px 0 4px; }
table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
th, td { border: 1px solid #000; padding: 4px 6px; height: 24px; color: #000 !important; background: #fff; }
th { font-size: 10.5px; background: #f0f0f0 !important; }
.centro { text-align: center; }
footer { margin-top: 56px; display: flex; flex-direction: column; align-items: center; font-size: 12px; }
.raya { width: 280px; border-top: 1px solid #000; margin-bottom: 4px; }
</style>
