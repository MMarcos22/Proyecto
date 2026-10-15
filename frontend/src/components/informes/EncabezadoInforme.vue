<template>
  <!-- Membrete de los informes impresos: quién lo emite, qué es, para quién y de qué periodo -->
  <header class="membrete-informe solo-impresion">
    <img src="/LogoBomberos.png" alt="" />
    <div>
      <strong>BENEMÉRITO CUERPO VOLUNTARIO DE BOMBEROS · 39ª COMPAÑÍA, CHIQUIMULA</strong>
      <span class="titulo">{{ titulo }}</span>
      <span>{{ periodo }}<template v-if="destinatario"> · Para: {{ destinatario }}</template></span>
    </div>
  </header>
</template>

<script setup>
defineProps({ titulo: String, periodo: String, destinatario: String });
</script>

<style scoped>
.membrete-informe { display: none; }
@media print {
  .membrete-informe { display: flex; gap: 14px; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; color: #000; }
  .membrete-informe img { width: 56px; }
  .membrete-informe div { display: flex; flex-direction: column; gap: 2px; }
  .membrete-informe strong { font-size: 12px; }
  .membrete-informe .titulo { font-size: 16px; font-weight: 700; }
  .membrete-informe span { font-size: 11.5px; }
}
</style>
