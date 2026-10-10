<template>
  <div class="bol-fila">
    <span class="bol-et">CONTROL:</span>
    <input v-model="d.numero_control" class="bol-linea w-lg" type="text" />
    <span class="bol-et">MINUTOS TRABAJADOS:</span>
    <input v-model.number="d.minutos_trabajados" class="bol-linea" type="number" min="0" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">DIRECCIÓN:</span>
    <input v-model="d.direccion" class="bol-linea" type="text" />
    <span class="bol-et">FECHA:</span>
    <input v-model="d.fecha" class="bol-linea w-md" type="date" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">ZONA:</span>
    <input v-model="d.zona" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">NOMBRE DEL SOLICITANTE:</span>
    <input v-model="d.solicitante" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">FORMA DE AVISO POR TELÉFONO:</span>
    <input v-model="d.forma_aviso" class="bol-linea w-md" type="text" />
    <span class="bol-et">PERSONAL:</span>
    <input v-model="d.personal" class="bol-linea" type="text" />
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
    <span class="bol-et">NOMBRE (S) DE (LOS) RESCATADOS:</span>
    <input v-model="d.nombres_rescatados" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">EDAD (ES):</span>
    <input v-model="d.edades" class="bol-linea w-lg" type="text" />
    <span class="bol-et">CON DOMICILIO EN:</span>
    <input v-model="d.domicilios" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">TRASLADO (S) A:</span>
    <input v-model="d.traslado_a" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">UNIDAD (ES):</span>
    <input v-model="d.unidad" class="bol-linea w-lg" type="text" />
    <span class="bol-et">PILOTO (S):</span>
    <input v-model="d.piloto" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">RADIOTELEFONISTA:</span>
    <input v-model="d.radiotelefonista" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">PERSONAL DESTACADO:</span>
    <input v-model="d.personal_destacado" class="bol-linea" type="text" />
  </div>
</template>

<script setup>
const d = defineModel({ required: true });
</script>