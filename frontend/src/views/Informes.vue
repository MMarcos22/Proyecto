<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Informes</h1>
        <p class="sub">Cada informe se genera del periodo que necesite: un mes, un trimestre, un semestre, un año o cualquier rango de fechas.</p>
      </div>
    </div>

    <div class="informes">
      <router-link v-for="i in visibles" :key="i.ruta" :to="i.ruta" class="tarjeta informe">
        <span class="icono-informe"><Icono :nombre="i.icono" :tam="22" /></span>
        <div class="crecer">
          <strong>{{ i.nombre }}</strong>
          <p>{{ i.descripcion }}</p>
          <div class="meta">
            <span><Icono nombre="flecha_der" :tam="12" />Para: <b>{{ i.para }}</b></span>
            <span><Icono nombre="reloj" :tam="12" />{{ i.cada }}</span>
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { puedeAbrir } from '../router';
import Icono from '../components/Icono.vue';

const router = useRouter();
const auth = useAuthStore();

// Destinatarios y periodicidad según la entrevista (análisis §17.1)
const INFORMES = [
  { ruta: '/informes/servicios', nombre: 'Servicios atendidos', icono: 'historial', para: 'Consultas de vecinos, familiares y autoridades', cada: 'Por fecha',
    descripcion: 'Elija la fecha y vea cada incidente: dirección, unidades, piloto, tripulación, a dónde se llevó a cada paciente e insumos usados. Se filtra por personal, unidad e insumo.' },
  { ruta: '/control-mensual', nombre: 'Control mensual de existencias', icono: 'rejilla', para: 'Capital', cada: 'Mensual',
    descripcion: 'Las cuatro hojas (prehospitalario, librería, limpieza y cafetería) con el formato de siempre: venía, entró, salió y quedó.' },
  { ruta: '/informes/anual', nombre: 'Resumen anual de inventario', icono: 'informe', para: 'Capital y dirección', cada: 'Anual',
    descripcion: 'Entradas y salidas de cada insumo mes por mes, con el saldo inicial y final del año. Sin fórmulas a mano.' },
  { ruta: '/proyeccion', nombre: 'Proyección anual de insumos', icono: 'tendencia', para: 'Capital (solicitud de febrero)', cada: 'Anual',
    descripcion: 'Cuánto pedir para el próximo año según lo consumido y el crecimiento de los servicios.' },
  { ruta: '/informes/combustible', nombre: 'Salidas por unidad', icono: 'ambulancia', para: 'Capital (justificación de combustible)', cada: 'En cada carga',
    descripcion: 'Cuántas salidas tuvo una unidad entre dos cargas de combustible, con el detalle de cada servicio.' },
  { ruta: '/informes/personas', nombre: 'Personas atendidas y accidentes', icono: 'usuarios', para: 'Municipalidad (convenio)', cada: 'Mes, trimestre o año',
    descripcion: 'Servicios, accidentes y personas atendidas del periodo, mes por mes.' },
  { ruta: '/informes/totales', nombre: 'Totales de servicios por tipo', icono: 'boleta', para: 'Capital', cada: 'Mes, trimestre o año',
    descripcion: 'Cuántos servicios hubo de cada tipo, con el rango de números de control y las causas.' },
  { ruta: '/servicios', nombre: 'Zonas de mayor incidencia', icono: 'mapa', para: 'Mesa interinstitucional', cada: 'Trimestral',
    descripcion: 'Dónde y cuándo ocurren los servicios, con los lugares críticos. Elija el trimestre y use «Imprimir».' }
];

// Solo los informes que el rol puede abrir
const visibles = computed(() => INFORMES.filter(i => {
  const r = router.resolve(i.ruta);
  return r.matched.length && puedeAbrir(r, auth.usuario?.rol);
}));
</script>

<style scoped>
.sub { margin-top: 6px; color: var(--texto-suave); font-size: 14.5px; }
.informes { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
.informe { display: flex; gap: 16px; padding: 18px 20px; text-decoration: none; color: inherit; transition: border-color var(--transicion), box-shadow var(--transicion); }
.informe:hover { border-color: var(--borde-fuerte); box-shadow: var(--sombra); }
.icono-informe { width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: var(--info); background: var(--info-fondo); }
.informe strong { font-size: 16.5px; }
.informe p { margin-top: 4px; font-size: 14px; color: var(--texto-suave); line-height: 1.5; }
.meta { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 10px; font-size: 13px; color: var(--texto-tenue); }
.meta span { display: inline-flex; align-items: center; gap: 5px; }
.meta b { color: var(--texto); font-weight: 600; }
</style>
