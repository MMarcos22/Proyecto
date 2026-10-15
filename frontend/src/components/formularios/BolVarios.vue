<template>
  <div class="bol-fila">
    <span class="bol-et">CONTROL:</span>
    <input v-model="d.numero_control" class="bol-linea w-lg" type="text" />
    <span class="bol-et">MINUTOS TRABAJADOS:</span>
    <input v-model="d.minutos_trabajados" class="bol-linea w-md" type="text" />
    <span class="bol-et">FECHA:</span>
    <input v-model="d.fecha" class="bol-linea w-md" type="date" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">SOLICITUD POR TELÉFONO:</span>
    <input v-model="d.solicitud_por_telefono" class="bol-linea" type="text" />
    <span class="bol-et">PERSONAL:</span>
    <input v-model="d.personal" class="bol-linea" list="dl-personal" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">NOMBRE DEL SOLICITANTE:</span>
    <input v-model="d.solicitante" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">DIRECCIÓN:</span>
    <input v-model="d.direccion" class="bol-linea" type="text" />
    <span class="bol-et">ZONA:</span>
    <input v-model="d.zona" class="bol-linea w-md" list="dl-sectores" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">CLASE DE SERVICIO:</span>
    <input v-model="d.clase_servicio" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">RADIOTELEFONISTA:</span>
    <input v-model="d.radiotelefonista" class="bol-linea" list="dl-personal" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">PILOTOS (S):</span>
    <input v-model="d.piloto" class="bol-linea" list="dl-personal" type="text" />
    <span class="bol-et">UNIDAD:</span>
    <input v-model="d.unidad" class="bol-linea w-lg" list="dl-unidades" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">SALIDA:</span>
    <input v-model="d.salida_de" class="bol-linea" type="text" />
    <span class="bol-et">HORA:</span>
    <input v-model="d.hora_salida" class="bol-linea w-sm" type="time" />
    <span class="bol-et">ENTRADA:</span>
    <input v-model="d.entrada_a" class="bol-linea" type="text" />
    <span class="bol-et">HORA:</span>
    <input v-model="d.hora_entrada" class="bol-linea w-sm" type="time" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">PERSONAL DESTACADO:</span>
    <input v-model="d.personal_destacado" class="bol-linea" type="text" />
  </div>
</template>

<script setup>
const d = defineModel({ required: true });
</script>