<template>
  <div class="bol-fila">
    <span class="bol-et">CONTROL No.</span>
    <input v-model="d.numero_control" class="bol-linea w-lg" type="text" />
    <span class="bol-et">MINUTOS TRABAJADOS:</span>
    <input v-model.number="d.minutos_trabajados" class="bol-linea" type="number" min="0" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">SOLICITUD POR TEL.:</span>
    <input v-model="d.solicitud_por_telefono" class="bol-linea w-md" type="text" />
    <span class="bol-et">PERSONAL:</span>
    <input v-model="d.personal" class="bol-linea w-md" type="text" />
    <span class="bol-et">FECHA:</span>
    <input v-model="d.fecha" class="bol-linea w-md" type="date" />
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
    <span class="bol-et">DIRECCION:</span>
    <input v-model="d.direccion" class="bol-linea" type="text" />
    <span class="bol-et">ZONA:</span>
    <input v-model="d.zona" class="bol-linea w-md" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">SOLICITANTE:</span>
    <input v-model="d.solicitante" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">RADIOTELEFONISTA:</span>
    <input v-model="d.radiotelefonista" class="bol-linea" type="text" />
  </div>

  <div class="bol-titulo-caja">PROPIEDAD INMUEBLE</div>

  <div class="bol-fila">
    <span class="bol-et">PROPIETARIO:</span>
    <input v-model="d.prop_propietario" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">SITIO DONDE PRINCIPIÓ EL INCENDIO:</span>
    <input v-model="d.sitio_inicio" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">CAUSAS:</span>
    <input v-model="d.causas" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">VALOR APROXIMADO DEL INMUEBLE:</span>
    <input v-model.number="d.valor_inmueble" class="bol-linea w-md" type="number" step="0.01" />
    <span class="bol-et">MONTO APROX. DE PERDIDAS:</span>
    <input v-model.number="d.perdidas_inmueble" class="bol-linea w-md" type="number" step="0.01" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">COMPAÑIA ASEGURADORA:</span>
    <input v-model="d.aseguradora_inmueble" class="bol-linea" type="text" />
  </div>

  <div class="bol-titulo-caja">DATOS DEL VEHICULO</div>

  <div class="bol-fila">
    <span class="bol-et">PROPIETARIO:</span>
    <input v-model="d.veh_propietario" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">CONDUCTOR:</span>
    <input v-model="d.conductor" class="bol-linea" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">DESCRIPCIÓN TIPO:</span>
    <input v-model="d.descripcion_tipo" class="bol-linea" type="text" />
    <span class="bol-et">MARCA:</span>
    <input v-model="d.marca" class="bol-linea w-md" type="text" />
    <span class="bol-et">MODELO:</span>
    <input v-model="d.modelo" class="bol-linea w-md" type="text" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">PLACAS:</span>
    <input v-model="d.placas" class="bol-linea w-md" type="text" />
    <span class="bol-et">VALOR APROXIMADO:</span>
    <input v-model.number="d.valor_vehiculo" class="bol-linea w-md" type="number" step="0.01" />
    <span class="bol-et">PERDIDAS APROX.:</span>
    <input v-model.number="d.perdidas_vehiculo" class="bol-linea w-md" type="number" step="0.01" />
  </div>

  <div class="bol-fila">
    <span class="bol-et">COMPAÑÍA ASEGURADORA:</span>
    <input v-model="d.aseguradora_vehiculo" class="bol-linea" type="text" />
  </div>
</template>

<script setup>
const d = defineModel({ required: true });
</script>