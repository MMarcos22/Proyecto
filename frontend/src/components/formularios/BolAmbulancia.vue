<template>
  <div class="bol-fila">
    <span class="bol-et">Control.</span>
    <input v-model="d.numero_control" class="bol-linea w-lg" type="text" />
    <span class="bol-et">Minutos trabajados:</span>
    <input v-model.number="d.minutos_trabajados" class="bol-linea" type="number" min="0" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Solicitud por teléfono:</span>
    <input v-model="d.solicitud_por_telefono" class="bol-linea w-md" type="text" />
    <span class="bol-et">Personal:</span>
    <input v-model="d.personal" class="bol-linea w-md" type="text" />
    <span class="bol-et">Fecha:</span>
    <input v-model="d.fecha" class="bol-linea w-md" type="date" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Salida de:</span>
    <input v-model="d.salida_de" class="bol-linea" type="text" />
    <span class="bol-et">Hora:</span>
    <input v-model="d.hora_salida" class="bol-linea w-sm" type="time" />
    <span class="bol-et">Entrada a:</span>
    <input v-model="d.entrada_a" class="bol-linea" type="text" />
    <span class="bol-et">Hora:</span>
    <input v-model="d.hora_entrada" class="bol-linea w-sm" type="time" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Dirección:</span>
    <input v-model="d.direccion" class="bol-linea" type="text" />
    <span class="bol-et">Zona:</span>
    <input v-model="d.zona" class="bol-linea w-md" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Nombre del ó (los) solicitante (es):</span>
    <input v-model="d.solicitante" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Nombre (s) completo (s) de (los) paciente (es):</span>
    <input v-model="d.nombres_pacientes" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Fallecidos:</span>
    <input v-model="d.fallecidos" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Si</span>
    <input v-model="siNo.si" class="bol-linea w-sm" type="text" />
    <span class="bol-et">No</span>
    <input v-model="siNo.no" class="bol-linea w-sm" type="text" />
    <span class="bol-et">Edad (es):</span>
    <input v-model="d.edades" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Domicilio (s):</span>
    <input v-model="d.domicilios" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Acompañante (s):</span>
    <input v-model="d.acompanantes" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Servicio por Maternidad:</span>
    <input v-model="d.serv_maternidad" class="bol-linea w-md" type="text" />
    <span class="bol-et">Acc. de tránsito:</span>
    <input v-model="d.acc_transito" class="bol-linea w-md" type="text" />
    <span class="bol-et">Acc. de trabajo:</span>
    <input v-model="d.acc_trabajo" class="bol-linea w-md" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Otros:</span>
    <input v-model="d.otros" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Traslado a Hosp. Modular:</span>
    <input v-model="d.hosp_modular" class="bol-linea w-md" type="text" />
    <span class="bol-et">Hosp. Privado:</span>
    <input v-model="d.hosp_privado" class="bol-linea w-md" type="text" />
    <span class="bol-et">Hospital I.G.S.S,</span>
    <input v-model="d.hosp_igss" class="bol-linea w-md" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Otros:</span>
    <input v-model="d.otro_traslado" class="bol-linea w-lg" type="text" />
    <span class="bol-et">Radiotelefonista:</span>
    <input v-model="d.radiotelefonista" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Piloto (S):</span>
    <input v-model="d.piloto" class="bol-linea" type="text" />
    <span class="bol-et">Unidad (es)</span>
    <input v-model="d.unidad" class="bol-linea w-md" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">Personal destacado:</span>
    <input v-model="d.personal_destacado" class="bol-linea" type="text" />
  </div>
</template>

<script setup>
import { reactive } from 'vue';
const d = defineModel({ required: true });
const siNo = reactive({ si: '', no: '' });
</script>