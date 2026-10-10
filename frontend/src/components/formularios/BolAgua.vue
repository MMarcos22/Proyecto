<template>
  <div class="bol-fila">
    <span class="bol-et">CONTROL No.</span>
    <input v-model="d.numero_control" class="bol-linea w-md" type="text" />
    <span class="bol-et">MINUTOS TRABAJADOS:</span>
    <input v-model.number="d.minutos_trabajados" class="bol-linea w-md" type="number" min="0" />
    <span class="bol-et">FECHA:</span>
    <input v-model="d.fecha" class="bol-linea w-md" type="date" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">DIRECCIÓN:</span>
    <input v-model="d.direccion" class="bol-linea" type="text" />
    <span class="bol-et">ZONA:</span>
    <input v-model="d.zona" class="bol-linea w-md" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">NOMBRE DEL SOLICITANTE:</span>
    <input v-model="d.solicitante" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">RESIDENCIA:</span>
    <input v-model="d.residencia" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">NOMBRE DEL ESTABLECIMIENTO:</span>
    <input v-model="d.nombre_establecimiento" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">CENTRO ASISTENCIAL:</span>
    <input v-model="d.centro_asistencial" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">COLONIA:</span>
    <input v-model="d.colonia" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">SOLICITUD POR TELÉFONO:</span>
    <input v-model="d.solicitud_por_telefono" class="bol-linea w-md" type="text" />
    <span class="bol-et">PERSONAL:</span>
    <input v-model="d.personal" class="bol-linea w-md" type="text" />
    <span class="bol-et">NOTA:</span>
    <input v-model="d.nota" class="bol-linea w-md" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">SALIDA DE:</span>
    <input v-model="d.salida_de" class="bol-linea" type="text" />
    <span class="bol-et">HORA:</span>
    <input v-model="d.hora_salida" class="bol-linea w-sm" type="time" />
    <span class="bol-et">ENTRADA A:</span>
    <input v-model="d.entrada_a" class="bol-linea" type="text" />
    <span class="bol-et">HORA:</span>
    <input v-model="d.hora_entrada" class="bol-linea w-sm" type="time" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">UNIDAD (ES):</span>
    <input v-model="d.unidad" class="bol-linea w-lg" type="text" />
    <span class="bol-et">PILOTO (S):</span>
    <input v-model="d.piloto" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">PERSONAL DESTACADO:</span>
    <input v-model="d.personal_destacado" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">RADIOTELEFONISTA:</span>
    <input v-model="d.radiotelefonista" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">SERVICIO AUTORIZADO POR:</span>
    <input v-model="d.servicio_autorizado_por" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">GALONES DISTRIBUIDOS:</span>
    <input v-model.number="d.galones_distribuidos" class="bol-linea" type="number" min="0" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">FORMA EN QUE SE DISTRIBUYO:</span>
    <input v-model="d.forma_distribucion" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">DONATIVO:</span>
    <input v-model.number="d.donativo" class="bol-linea w-md" type="number" step="0.01" />
    <span class="bol-et">EN LETRAS:</span>
    <input v-model="d.donativo_letras" class="bol-linea" type="text" />
  </div>
</template>

<script setup>
const d = defineModel({ required: true });
</script>