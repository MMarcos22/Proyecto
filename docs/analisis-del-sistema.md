# Análisis y diseño del sistema — Bomberos Voluntarios, 39ª Compañía, Chiquimula

> Documento de trabajo para la tesis. Cada afirmación lleva su origen:
> **[Audio mm:ss]** = entrevista grabada con la encargada administrativa (1 h 21 min) ·
> **[Observado]** = visto en documentos, capturas o en el sistema en funcionamiento ·
> **[Conversación]** = lo que el equipo relató de sus visitas · **[Inferencia]** = deducción nuestra, debe validarse.
>
> **Decisión de alcance:** la inteligencia artificial **sale de los objetivos y del sistema.** Todo análisis
> se basa en reglas explícitas, cálculos verificables y catálogos controlados.

| Parte | Pregunta que responde |
|---|---|
| **I. La realidad** | ¿Quién hace qué hoy, con qué documentos, para quién y dónde falla? |
| **II. Los sistemas existentes** | ¿Qué hacía el programa anterior, qué tiene el prototipo actual, qué sirve y qué no? |
| **III. El sistema propuesto** | ¿Cómo debe funcionar para cumplir los tres objetivos y respetar la realidad? |
| **IV. Diseño gráfico (UX/UI)** | ¿Cómo se ve, cómo se navega y por qué cada elemento está donde está? |
| **V. Plan y validación** | ¿En qué orden se construye y cómo se demuestra que funciona? |
| **Anexo A** | Evidencia de la entrevista, minuto por minuto |

---

## Resumen ejecutivo

1. **La información nace en papel y se resume a mano para terceros.** Cada boleta se llena después del servicio y se archiva; cada informe que piden la capital, la municipalidad o la mesa interinstitucional se arma revisando papeles uno por uno. El caso extremo: justificar el combustible de cada unidad **toma 4–5 días** [Audio 10:26].
2. **El problema más grave de las boletas es la numeración.** La capital exige que el número de control siga **el orden en que regresan las unidades** [Audio 58:11]. Como la tripulación que regresa primero a veces no puede llenar su boleta de inmediato (está limpiando sangre de la unidad), los números se reservan, se sobrescriben, **se duplican o se saltan** [Audio 55:00–59:41]. La encargada revisa a diario que no pase.
3. **Las compras se piden una vez al año (febrero) y este año se pidieron "a ciegas"** [Audio 25:44]: no hay datos de cuánto se consume ni de cómo crece la demanda. Ese es el corazón del OE2.
4. **El análisis de zonas tiene un destinatario real:** la reunión trimestral de gobernación, centro de salud, hospital, policía y bomberos, donde lo primero que se pregunta es *dónde ocurren los accidentes* [Audio 1:01:16].
5. **El inventario tiene dos documentos desconectados** (vale de entrega manuscrito y hoja mensual en Excel) y depende de una sola persona. La dirección quiere que, si ella falta, un bombero pueda hacerlo [Audio 27:44]. En la hoja de septiembre 2026 **no hay ningún ingreso ni salida registrados** [Observado].
6. **Ya pagaron a un programador antes y el programa no les sirvió** [Audio 11:46–12:00]: permitía campos vacíos, no dejaba escribir observaciones en la boleta de agua y no resolvía la numeración. Hay que ganarse la confianza con algo que funcione en lo básico.
7. **Principio rector:** el sistema gira alrededor de **tres documentos** —la *boleta*, la *entrada* y el *vale*— y **cada informe tiene un destinatario real** (la capital, la municipalidad, la mesa interinstitucional, la dirección). Nada se captura ni se muestra si no tiene destino.

---

# PARTE I — LA REALIDAD

## 1. La organización

| Elemento | Realidad | Origen |
|---|---|---|
| **Personal** | 6–7 bomberos pagados y voluntarios que llegan cuando se les llama | [Audio 18:05, 21:11] |
| **Escuadras** | 6–7 bomberos por escuadra; turnos de **24 h que cambian a las 8:00** | [Audio 16:37–17:01] |
| **Distribución en el turno** | 2 bomberos por unidad, el **cabinista** (recibe llamadas y despacha) y el **jefe de servicio** | [Audio 17:03–17:35] |
| **Unidades** | **3 en servicio**, 2 de reposición, 2 motobombas (una fuera de la estación), una unidad de agua (abastece a la motobomba) y una de rescate (unidad especial); códigos como 1151 y 1314 | [Audio 18:49–20:13, 29:36, 31:34] |
| **Crecimiento** | Se planea una subestación en Santa Elena | [Audio 20:23] |
| **Sede central ("la capital")** | Define formatos de impresión, la lista de productos, compra los insumos y el combustible, hace los cambios de aceite; sus informes los audita la **Contraloría** | [Audio 05:01, 08:08–08:35, 19:37] |
| **Municipalidad** | Convenio de aporte mensual; pide informe trimestral con estadística de accidentes y **personas beneficiadas** | [Audio 44:34–44:53, 47:27] |
| **Mesa interinstitucional** | Reunión **trimestral** de gobernación, centro de salud, hospital, policía y bomberos; preguntan dónde ocurren los accidentes | [Audio 1:00:52–1:01:32] |

## 2. Actores y qué hace cada uno

| Actor | Qué hace hoy | Qué necesita del sistema |
|---|---|---|
| **Encargada administrativa** (la hija) | **No es bombero** [Audio 07:10]. Trabaja de **7:00 a 17:00** [Audio 07:22]. Lleva documentos, entradas y salidas de bodega, acomodo, combustible y, temporalmente, la caja. Revisa cada día las boletas | Registrar entradas y vales una sola vez; que la hoja mensual, el resumen anual y los informes salgan solos; revisar la numeración sin buscar en papeles |
| **Hermano** | Apoya con la impresión de informes [Audio 53:15] | Lo mismo que la encargada (respaldo) |
| **Jefe / oficial** (el papá) | Dirige la compañía; quiere terminar lo que el programador anterior dejó a medias [Audio 11:38–11:46] | Ver todo sin riesgo de modificar; informes para decidir y para presentar |
| **Cabinista** (radiotelefonista) | Recibe la llamada, indica a la tripulación a dónde ir; en el programa anterior **generaba la orden** [Audio 17:11–17:23, 57:00] | Iniciar la boleta al recibir la llamada; registrar el regreso de la unidad |
| **Tripulación** (2 por unidad) | Atiende el servicio, limpia la unidad y llena la boleta, a veces horas después (regresan a las 2:30 y llenan a las 5:00) [Audio 58:31–58:49] | Completar *su* boleta cuando pueda, sin perder el número |
| **Jefe de servicio** | Revisa el calentamiento y el kilometraje de las unidades; da el Vo.Bo. de la boleta; lleva **otro Excel** con servicios por causa (moto, carro, caídas, enfermedad) [Audio 13:55, 34:35–35:04] | Que la clasificación de la boleta reemplace ese Excel |
| **Comisión de retiro** | Dos personas que retiran insumos de bodega y firman el vale [Audio 00:53] | Quedar registradas como receptoras |
| **Secretaría Ejecutiva** | Extiende copias certificadas con una "razón" [Conversación] | Reimprimir con el bloque de certificación |

**Observaciones de auditor:**

- **Concentración de conocimiento.** Una sola persona lleva el inventario y solo ella entiende la plantilla de salidas. La dirección lo sabe y quiere resolverlo [Audio 27:44]. Va en el planteamiento del problema.
- **Antecedente de fracaso.** Ya se invirtió en un programa que no sirvió [Audio 12:00]. Para el jurado, esto justifica la metodología centrada en el usuario; para la institución, exige que lo básico funcione sin fallas.
- **Requisito de capacitación medible.** "Con una buena capacitación cualquiera podría usarlo" [Conversación]: *un voluntario nuevo registra una boleta completa sin ayuda después de una demostración de 15 minutos.*

## 3. Procesos actuales (AS-IS)

### P1. Servicio y boleta

```
Llamada ─▶ Cabinista despacha ─▶ Sale la unidad ─▶ Atención ─▶ Regresa la unidad
   ─▶ Limpieza y desinfección de la unidad (más larga si hubo sangre)
   ─▶ La tripulación llena la boleta en la computadora de cabina (a veces horas después)
   ─▶ Se imprime y se firma (formuló / piloto / jefe de servicio)
   ─▶ La encargada revisa al día siguiente: firmadas y correlativo sin saltos
   ─▶ Archivo en papel; copia certificada a solicitud
```

**Los cinco tipos de servicio** [Audio 28:52–31:44]:

| Tipo | Cuándo se usa |
|---|---|
| Ambulancia | Hubo **traslado** de paciente |
| Servicios varios | Se atendió sin traslado, **falsas alarmas**, apoyos (p. ej. arreglar la pista de una travesía de bicicleta) |
| Incendio | Salen las unidades grandes |
| Agua | Abastecimiento a **instituciones de gobierno** que lo solicitan por carta, o incendios menores (basurero) atendidos con la unidad de agua |
| Rescate | Sale la unidad especial (p. ej. personas atrapadas en un vehículo) |

| # | Falla | Origen | Consecuencia |
|---|---|---|---|
| F1 | La tripulación no puede llenar la boleta al regresar (limpieza, otra emergencia, madrugada) | [Audio 55:00–58:49] | Boleta incompleta o llenada de memoria |
| F2 | **El número debe seguir el orden de regreso**, pero se llena en otro orden: se reservan números, se escribe encima, se duplican o se saltan | [Audio 57:00–59:41] | Revisión diaria manual; errores ante la capital |
| F3 | El programa anterior **permitía campos vacíos** | [Audio 54:31–54:44] | Boletas incompletas firmadas |
| F4 | No existe ningún informe por tipo, causa ni zona; el jefe de servicio lleva un Excel aparte por causa | [Audio 34:31–35:04] | Doble registro; nada consolidado |
| F5 | La "zona" se escribe como texto libre | [Observado en boleta] | Imposible contar por zona |
| F6 | Consultar una boleta antigua = buscar en papel | [Conversación] | Lento para copias y para informes |
| F7 | El programa anterior dibujaba el texto sobre la hoja escaneada | [Conversación] | Modelo mental: "llenar la hoja en pantalla" |

### P2. Entrega de insumos (vale)

[Observado — `INVENTARIO.xlsx`; Audio 00:42–01:20]

| CANT. | PRODUCTO | FECHA DE SALIDA | RECIBIDO POR | ESCUADRA | FIRMA DE RECIBIDO | ENTREGADO POR |
|---|---|---|---|---|---|---|

- La comisión de 2 personas retira en horario de oficina y firma; fuera de horario no hay entregas salvo casos extremos [Audio 07:32–07:43].
- La salida va hacia **una escuadra**, no hacia un servicio. **Hoy no se registra consumo por emergencia.**
- El vale es el **comprobante** de la columna SALIDA de la hoja mensual ("atrás lleva su comprobante") [Audio 01:15].

### P3. Entrada de insumos

Los insumos llegan de la capital; cada entrada tiene una **constancia de ingreso** en hoja aparte [Audio 01:41–01:57]. La encargada los acomoda aplicando **primero en entrar, primero en salir** (lo nuevo atrás, lo viejo adelante; el azúcar arriba) [Audio 06:05–06:57].

### P4. Control mensual (Excel)

| No. | INSUMO | MES ANTERIOR — VIENEN | INGRESO: FECHA · CANTIDAD | EXISTENCIA | SALIDA | TOTAL |
|---|---|---|---|---|---|---|

| # | Hallazgo | Ejemplo | Implicación |
|---|---|---|---|
| H1 | **Septiembre sin ningún movimiento** en las 4 categorías | TOTAL = VIENEN en las 87 filas [Observado] | La hoja debe **calcularse** |
| H2 | Una sola fecha de ingreso por mes | Columna "FECHA" única | Varias entradas en el mes no caben |
| H3 | No hay lote ni vencimiento | Hoja prehospitalaria | Aporte nuevo exigido por OE3 |
| H4 | Insumos duplicados con otro nombre | Clorhexidina, Hartmann | Depurar con la lista oficial de la capital |
| H5 | Equipo durable mezclado con consumibles | Glucómetro, estetoscopio | Separar consumible de equipo |
| H6 | Se compra en cajas, se usa por unidad | "GUANTES WOLF T M -CAJA" | Conversión de unidades |
| H7 | La lista de productos viene de la capital, pero aparecen productos nuevos | [Audio 05:13–05:20] | Catálogo oficial + opción de agregar |
| H8 | Lo **anual** exige armar fórmulas a mano | [Audio 24:54–25:08] | Resumen anual automático |
| H9 | Un libro por categoría, una pestaña por mes | 11 pestañas por libro | Una sola base |

### P5. Solicitud anual de compra

Cada **febrero** se envía a la capital la solicitud de insumos del año siguiente [Audio 25:34–25:42]. Este año se hizo "a ciegas" [Audio 25:44]; por ejemplo, como aumentaron los servicios pidieron **10 resmas en lugar de 8**, al tanteo; si se quedan cortos, el comité paga lo que falte [Audio 26:02–26:34]. Con el combustible pasa lo mismo: se proyecta según los servicios y se pide un anexo cuando se acaba [Audio 26:44–27:24].

### P6. Informes externos

| Informe | Destinatario | Cómo se hace hoy | Origen |
|---|---|---|---|
| **Salidas por unidad entre cargas de combustible** | Capital (auditado por Contraloría) | Revisando boleta por boleta; **4–5 días** | [Audio 08:38–10:32] |
| Totales de servicios **por tipo** | Capital | Contando correlativos | [Audio 33:49–34:21] |
| Hoja mensual de inventario | Capital, con su formato | Excel a mano | [Audio 08:08] |
| Accidentes y **personas beneficiadas** del periodo | Municipalidad (trimestral) | A mano | [Audio 44:34–44:53] |
| Dónde ocurren los accidentes | Mesa interinstitucional (trimestral) | De memoria ("los muchachos saben") | [Audio 1:00:28–1:01:32] |

### Fuera del sistema (y por qué)

- **Mantenimiento de unidades:** los jefes de servicio anotan el kilometraje cada mañana y saben cuándo toca el servicio; la entrevistada dijo que **no es prioridad** [Audio 22:22–22:46].
- **Caja, facturas y convenio municipal:** son contabilidad, no operación.

## 4. Restricciones del entorno

| Restricción | Evidencia | Consecuencia |
|---|---|---|
| Sistema **local**, sin nube | El programa anterior usaba base de datos local en la computadora de cabina; la nube "cuesta cada mes" [Audio 1:04:30–1:06:56, 1:12:04] | Servidor y base de datos en la estación; nada depende de internet |
| Equipo antiguo | Capturas con barra estilo Windows 7 y Office sin activar [Observado] | Verificar navegador y sistema operativo antes de elegir tecnología |
| Formatos impuestos por la capital | [Audio 08:08–08:22] | Impresiones idénticas a los formatos oficiales |
| Interrupciones y madrugadas | [Audio 58:31–58:55] | Todo se guarda solo y se continúa después |
| Fines de semana con más accidentes | [Audio 58:55] | El sistema debe ser rápido justo cuando hay más carga |

---

# PARTE II — LOS SISTEMAS EXISTENTES

## 5. El programa anterior (contratado por la compañía)

| Aspecto | Qué hacía | Qué falló | Origen |
|---|---|---|---|
| Ubicación | Local, en la computadora de cabina | — | [Audio 1:04:30] |
| Boleta | La generaba cabina al recibir la llamada | Permitía **dejar campos vacíos** | [Audio 54:31–54:44, 57:00] |
| Numeración | Intentaba asignarla al cerrar el servicio, en orden de regreso | **No resolvió** duplicados y saltos | [Audio 57:00–57:40] |
| Boleta de agua | — | **No permitía escribir observaciones** | [Audio 1:13:24–1:13:54] |
| Resultado | Se pagó una parte | "No les ha servido" | [Audio 11:52–12:00] |

**Lección:** antes que análisis sofisticados, el sistema debe resolver bien **numeración, campos obligatorios e impresión**. Es lo que la institución evalúa primero.

## 6. El prototipo actual (este proyecto)

### 6.1 Frente a los objetivos

| Objetivo | Qué cumple | Qué falta |
|---|---|---|
| OE1 | 5 tipos de boleta con formato oficial; subtipos; catálogo de sectores; historial; análisis de servicios por sector, franja, día × hora y causa (sin IA, desde F1) | Numeración por orden de regreso; revisión diaria; campos obligatorios; subtipos de la realidad (moto/vehículo, falsa alarma); lugares críticos; mapa; informe trimestral |
| OE2 | Informe integrado servicios × consumo; demanda por unidad y horario | La reposición se calcula como si se comprara continuamente (punto de reorden), pero se compra **una vez al año**; falta la proyección anual, salidas por unidad entre fechas y personas atendidas |
| OE3 | Lotes, vencimientos, alertas, control mensual, Excel | El vale no se registra; no hay consumible vs. equipo ni presentaciones; no hay resumen anual; los movimientos se registran de a una línea desde cada fila del control mensual |

### 6.2 Evaluación de UX/UI (heurística, sobre capturas reales)

**Lo que funciona y se conserva:** tokens de color con tema claro/oscuro; un color por tipo de servicio, siempre con texto; controles grandes (46–48 px); lenguaje claro en el control mensual (*Venía · Entró · Salió · Quedó*); Inicio con turno, nueva boleta por tipo y unidades fuera; matriz día × hora; enlace "Saltar al contenido" y respeto a la preferencia de movimiento reducido.

| # | Problema | Gravedad | Estado |
|---|---|---|---|
| U1 | 14 entradas de menú para 3 usuarios | Alta | **Corregido en F1** (7 entradas + pestañas) |
| U2 | 4 pantallas de análisis que repiten cifras | Alta | **Corregido en F1** (una sección con pestañas) |
| U3 | *Imprimir boletas* como menú aparte | Media | **Corregido en F1** (pestaña de Boletas) |
| U4 | Elementos de IA | Alta | **Corregido en F1** (retirada) |
| U5 | Hallazgos vacíos hasta pulsar un botón | Media | **Corregido en F1** (se calculan al abrir) |
| U6 | "+100 %" para un sector que pasó de 3 a 6 servicios | Alta | **Corregido en F1** (diferencia absoluta si la base es < 5) |
| U7 | Columna de sector estrecha | Baja | **Corregido en F1** |
| U8 | 66 pares de botones *Entrada / Salida* en el control mensual | Alta | Pendiente (F3) |
| U9 | "Hace 31 h" sin advertencia en unidades fuera | Media | **Corregido en F1** ("¿Olvidó cerrarlo?" después de 6 h) |
| U10 | Encabezados de tabla en letra monoespaciada | Baja | **Corregido en F1** |
| U11 | Códigos "01/02/03" de la tesis en la interfaz | Baja | **Corregido en F1** |
| U12 | Insignia de atajo "N" | Baja | **Corregido en F1** |
| U13 | Texto recortado sin valor en *Últimos servicios* | Baja | **Corregido en F1** |
| U14 | Fuentes desde Google Fonts (requiere internet) | Media | **Corregido en F1** (fuentes locales) |
| U15 | No existe el rol Dirección | Media | Pendiente (F2) |
| U16 | Asistente de 6 pasos; la hoja oficial no se ve mientras se llena | Alta | Pendiente (F2) |
| U17 | Botón primario repetido en cada fila de *Por imprimir* | Media | **Corregido en F1** |
| U18 | El número de control se asigna al crear la boleta, no al regreso | **Crítica** (regla de la capital) | Pendiente (F2) |
| U19 | No hay forma de revisar la secuencia diaria de números | Alta | Pendiente (F2) |

---

# PARTE III — EL SISTEMA PROPUESTO

## 7. Objetivos (redacción propuesta)

**OE1.** *Clasificar el registro de los servicios de emergencia por tipo de servicio, causa y sector del municipio de Chiquimula, para facilitar la consulta del historial de incidentes y la identificación de las zonas de mayor incidencia, mediante un módulo de registro, consulta y análisis de servicios de emergencia.*

- Sin IA. Se agregan **"causa"** (reemplaza el Excel del jefe de servicio) y **"sector"** (sin IA, la zona es un dato capturado).

**OE2.** *Consolidar la información operativa de la institución mediante informes estadísticos integrados que relacionen el consumo de insumos del inventario con los servicios de emergencia atendidos por tipo y zona, para apoyar la toma de decisiones del personal administrativo sobre la **proyección anual de insumos** y la asignación de recursos según la demanda de cada sector, mediante un módulo de análisis de datos institucionales.*

- Se cambia "reabastecimiento" por **"proyección anual de insumos"**: la compra es una solicitud anual a la capital [Audio 25:34].

**OE3.** *Gestionar los insumos **prehospitalarios** y demás recursos disponibles en la institución, para mantener un control actualizado de las existencias, el seguimiento por número de lote y fecha de vencimiento, y el consumo de materiales asociado a los servicios de emergencia, mediante un módulo de registro y control de inventario.*

- "Prehospitalario" es el término de la institución [Audio 03:11–04:15]; "y demás recursos" cubre las otras tres categorías que se controlan con la misma hoja.

| | OE1 — Análisis de servicios | OE2 — Análisis institucional |
|---|---|---|
| Pregunta | ¿**Dónde, cuándo, qué tipo y qué causa**? | ¿**Qué recursos consume** esa demanda y cuánto pedir el próximo año? |
| Datos | Solo boletas | Boletas **+** inventario |
| Destinatario | Mesa interinstitucional, jefe de servicio | Dirección, capital, municipalidad |

## 8. Principios rectores

| # | Principio | Pregunta de control |
|---|---|---|
| PR1 | **El dato nace donde ocurre el hecho** | ¿Lo registra quien lo vivió, cuando lo vivió? |
| PR2 | **Se registra una vez, se usa muchas** | ¿Alguien tendría que volver a escribirlo? |
| PR3 | **Todo dato capturado tiene un destino** | ¿En qué impresión, informe o regla se usa? |
| PR4 | **El papel oficial no cambia** | ¿La impresión es idéntica al formato de la capital? |
| PR5 | **Se elige antes que escribir** | ¿Se puede elegir de un catálogo? |
| PR6 | **Ningún registro se borra** | ¿Queda rastro de quién cambió o anuló y por qué? |
| PR7 | **Cada pantalla responde una pregunta o habilita una tarea** | ¿Qué decide o hace el usuario aquí? |
| PR8 | **Cada cifra se puede rastrear** | ¿Puedo abrir los registros que forman este número? |
| PR9 | **Cada informe tiene un destinatario real** | ¿Quién lo recibe y qué hace con él? |

## 9. Módulo de servicios de emergencia (OE1)

### 9.1 Ciclo de vida de la boleta

```
 llamada            la unidad regresa              campos completos         impresa y firmada
    │                      │                              │                         │
    ▼                      ▼                              ▼                         ▼
┌──────────┐  regreso  ┌──────────────────┐  completar  ┌──────────┐  imprimir  ┌──────────┐
│ EN CURSO │ ────────▶ │ PENDIENTE        │ ──────────▶ │ COMPLETA │ ─────────▶ │ FIRMADA  │
│ sin nº   │  ASIGNA   │ (ya tiene su nº) │             └──────────┘            │bloqueada │
└──────────┘  EL Nº    └──────────────────┘                                     └────┬─────┘
                                                                                     │ con motivo
                                                                                     ▼
                                                                               ┌──────────┐
                                                                               │ ANULADA  │
                                                                               └──────────┘
```

| Estado | Quién edita | Por qué |
|---|---|---|
| En curso (sin número) | Cabinista y tripulación | La llamada se registra en el momento (PR1). **Aún no tiene número**: el número depende del orden de regreso |
| Pendiente de completar (con número) | **Solo la tripulación** (Administración como respaldo, con motivo) | El número ya quedó fijo; la boleta se completa cuando se pueda, sin que otra la "rebase" |
| Completa | Tripulación, hasta imprimirla | Corrección antes de firmar |
| Firmada | **Nadie.** Solo anular con motivo | El papel firmado es el documento oficial |
| Anulada | Nadie | Conserva su número: la secuencia nunca tiene huecos sin explicación |

**Así se resuelve F2:** el número se asigna **en el instante en que el cabinista registra el regreso**, en orden de regreso y por tipo. La tripulación que regresa primero recibe el número menor aunque llene su boleta horas después. Nadie reserva números ni escribe encima.

### 9.2 Proceso TO-BE de un servicio

| Paso | Quién | Qué hace | Qué llena el sistema solo |
|---|---|---|---|
| 1 | Cabinista | Al recibir la llamada: tipo, solicitante, teléfono, dirección, sector, unidad, tripulación | Fecha, hora de aviso y de salida, cabinista y jefe de servicio (del turno), piloto según la unidad. Si el teléfono ya llamó, ofrece dirección y sector |
| 2 | Cabinista | **"La unidad regresó"** | Hora de entrada, minutos trabajados y **número de control** (siguiente correlativo del tipo, en orden de regreso) |
| 3 | Tripulación | Desde *Inicio › Mis boletas pendientes*, con su PIN: datos de pacientes, detalle del tipo, causa, observaciones | Dice exactamente qué campo falta |
| 4 | Tripulación | *Marcar como completa* | No permite completar con campos vacíos (F3) |
| 5 | Tripulación o jefe | Imprime en oficio (incendio a dos caras) y se firma | Fecha de impresión. Estado **Firmada** |
| 6 | Encargada | **Revisión diaria**: secuencia por tipo, firmadas y pendientes | Marca saltos, pendientes antiguas y boletas sin imprimir |
| 7 | Secretaría Ejecutiva | Copia certificada a solicitud | Bloque de razón y registro de la emisión |

### 9.3 Identificación de quien llena la boleta

| Opción | A favor | En contra |
|---|---|---|
| A. Solo la encargada digita | Simple | Ella trabaja de 7 a 17; los servicios son 24 h. **Inviable** |
| B. Usuario y contraseña por bombero | Trazabilidad total | Mucha fricción en una computadora compartida, de madrugada |
| **C. Sesión de cabina + PIN personal de 4 dígitos** (recomendada) | Trazabilidad por persona con poca fricción; respeta "solo la tripulación completa su boleta" | Requiere el catálogo de personal con PIN |

### 9.4 Clasificación por causa (subtipo)

Reemplaza el Excel del jefe de servicio [Audio 34:31–35:04]. Lista corta por tipo, con lo que la institución ya usa:

| Tipo | Causas |
|---|---|
| Ambulancia | Accidente de **motocicleta**, accidente de **vehículo**, atropello, **caída**, **enfermedad común**, maternidad, herida por arma, intoxicación, accidente de trabajo, traslado programado, otra |
| Servicios varios | **Falsa alarma**, **atendido sin traslado**, árbol caído, enjambre, fuga de gas, inundación, prevención en evento, apoyo institucional, otra |
| Incendio | Estructural, vehicular, forestal o maleza, basura, eléctrico, otro |
| Agua | **Abastecimiento a institución** (con carta), incendio menor, comunidad, otro |
| Rescate | Vehicular (personas atrapadas), acuático, altura, estructura, búsqueda, animal, otro |

En ambulancia, la causa marca las casillas de la boleta oficial (servicio por maternidad, accidente de tránsito, accidente de trabajo) al imprimir (PR2). "Otra" exige texto y se revisa cada trimestre.

### 9.5 Sector y lugares críticos (sin IA)

1. **Catálogo de sectores**: zonas, barrios, colonias, aldeas y caseríos, con punto aproximado en el mapa.
2. **Sinónimos y lugares de referencia** de cada sector; si la dirección los menciona, se propone el sector y se dice por qué.
3. **Memoria por teléfono**: si el número ya llamó, se ofrece su sector.
4. **Lugares críticos**: puntos concretos dentro de un sector que la institución reconoce (p. ej. *entrada a la zona Pradera* [Audio 1:00:32]). Son opcionales en la boleta y dan precisión al informe para la mesa interinstitucional.
5. **Sector nuevo**: queda pendiente hasta que Administración lo aprueba o lo une con uno existente.

La **dirección** se escribe libre (es la que se imprime); el **sector** y el **lugar crítico** son lo que se analiza.

### 9.6 Reglas de la boleta impresa

- Sale **el formato completo de la capital, aunque haya campos vacíos** [Audio 1:05:57].
- Todos los campos son obligatorios para completar; donde no aplique se marca **"No aplica"** explícitamente, para que la revisión distinga "vacío por olvido" de "no corresponde" [Audio 54:22–54:44].
- La boleta de agua incluye **observaciones** [Audio 1:13:24].
- Incendio se imprime **a dos caras** [Audio 1:12:46].

### 9.7 Análisis de servicios

| Vista | Cálculo verificable | Destinatario |
|---|---|---|
| **Zonas de mayor incidencia** | Sectores que juntos reúnen el **80 %** de los servicios (Pareto); el criterio se muestra en pantalla | Mesa interinstitucional |
| **Lugares críticos** | Servicios por lugar crítico | Mesa interinstitucional |
| **Mapa** | Círculo por sector en su punto; tamaño = servicios | Mesa interinstitucional |
| **Día × hora** | Conteo por día de la semana y hora de salida (confirma los fines de semana) | Jefe de servicio |
| **Por causa** | Conteo por subtipo (reemplaza el Excel del jefe de servicio) | Jefe de servicio |
| **Cambio** | Frente al periodo anterior; porcentaje solo si la base es ≥ 5, si no, diferencia absoluta | Todos |
| **Informe trimestral imprimible** | Todo lo anterior para un trimestre, con membrete | **Mesa interinstitucional** |

Cada número abre las boletas que lo forman (PR8).

## 10. Módulo de inventario (OE3)

### 10.1 Cómo se relaciona el consumo con los servicios

La realidad: los insumos salen de bodega **por vale, hacia una escuadra**, y hoy **no se registra consumo por emergencia** [Audio 00:42–00:53]. Pedir a una tripulación que regresa a las 2:30 a. m. que registre cada gasa es poco realista. Por eso se combinan dos fuentes:

| Fuente | Qué aporta | Carga para el usuario |
|---|---|---|
| **Vale por escuadra** (siempre) | Cada vale tiene **escuadra y fecha**; el sistema sabe qué servicios atendió esa escuadra en su turno. Así se calcula el **consumo por servicio de cada periodo** | Ninguna extra: el vale ya existe |
| **Insumos en la boleta** (opcional, prehospitalario) | Consumo exacto por servicio y causa | Baja, si la lista es corta y con búsqueda |

En la hoja mensual, la columna SALIDA es lo que salió de bodega por vale (lo mismo que suman hoy).

### 10.2 Documentos de inventario

| Documento | Quién | Contenido | Impresión |
|---|---|---|---|
| **Entrada** | Encargada | Origen (capital / compra del comité / donación), fecha, constancia; líneas: insumo, presentación, cantidad, lote, vencimiento | Constancia de ingreso |
| **Vale de entrega** | Encargada | Categoría, quién recibe (comisión), escuadra, quién entrega; líneas | **Formato actual** para la firma |
| **Baja** | Encargada | Motivo (vencimiento, daño, pérdida), lote | Registro |
| **Ajuste por conteo** | Encargada | Esperado, contado, motivo | Acta |

### 10.3 Reglas de inventario

- **Catálogo oficial de la capital**, cargado desde la lista que enviará la encargada [Audio 04:56–05:33], con opción de **agregar productos** nuevos [Audio 05:13].
- **Lote y vencimiento se capturan en la entrada.** Las salidas descuentan el lote que vence primero: formaliza el "primero en entrar, primero en salir" que ella ya aplica [Audio 06:05–06:57]. El vencimiento aplica a prehospitalario **y a cafetería** (azúcar, café, cremora).
- **Consumible vs. equipo:** el equipo (glucómetro, estetoscopio, esfigmomanómetro) no se consume; se asigna a una unidad y tiene estado.
- **Unidad base y presentaciones:** *caja = 50 pares*; se registra "3 cajas" y se guardan 150 pares.
- **Cierre mensual:** congela saldos; un movimiento en un mes cerrado exige justificación.
- **Resumen anual** por insumo y categoría, sin fórmulas [Audio 24:54–25:10].

### 10.4 Alertas (cada una lleva a donde se resuelve)

| Alerta | Cuándo | Lleva a |
|---|---|---|
| Existencia baja | Existencia ≤ mínimo | Ficha del insumo |
| Próximo a vencer | 90 y 30 días | Lote |
| Vencido | Fecha pasada con saldo | Registrar baja |
| Mes sin cerrar | Inició el mes y el anterior está abierto | Control mensual |
| Boleta pendiente > 24 h | Sin completar | La boleta |
| Unidad fuera > 6 h | En curso demasiado tiempo | La boleta |
| **Salto en la secuencia** | Un número de control falta o está anulado sin motivo | Revisión diaria |

## 11. Módulo de análisis institucional (OE2)

| Informe | Decisión que apoya | Cálculo | Destinatario |
|---|---|---|---|
| **Proyección anual de insumos** | Qué pedir en la solicitud de **febrero** | Consumo de los últimos 12 meses × (servicios proyectados ÷ servicios del año); se compara con lo pedido el año anterior | Capital (solicitud anual) |
| **Consumo por tipo de servicio y por sector** | Qué llevar en cada unidad; dónde se gasta más | Vales por escuadra y turno relacionados con los servicios de ese turno; insumos de la boleta cuando existan | Dirección |
| **Salidas por unidad entre fechas** | Justificar cada carga de combustible | Servicios por unidad entre dos fechas (o entre dos cargas registradas) | Capital (Contraloría) |
| **Proyección de combustible** | Cuánto pedir y cuándo pedir un anexo | Servicios y minutos por unidad | Capital |
| **Personas atendidas por periodo** | Informe del convenio | Pacientes y rescatados registrados en las boletas | Municipalidad (trimestral) |
| **Totales por tipo** | Informe a la capital | Conteo por tipo y periodo | Capital |
| **Demanda y recursos** | Dónde y cuándo concentrar unidades y personal | Servicios por sector × franja; carga por unidad | Dirección |

**Suficiencia de datos:** con menos de 30 días o menos de 5 servicios, la pantalla dice "Datos insuficientes" en lugar de mostrar una cifra engañosa.

**Arranque sin datos:** cargar una muestra real de boletas en papel (3–6 meses) como *carga histórica* y el inventario inicial con un conteo físico. Los datos simulados solo sirven para pruebas.

## 12. Roles y permisos

| Rol | Persona real | Propósito |
|---|---|---|
| **Administración** | Encargada, hermano | Operar inventario, informes, revisión y configuración |
| **Dirección** | Jefe / oficial | Supervisar y decidir sin riesgo de alterar datos |
| **Cabina** | Sesión en la computadora de cabina; cada bombero se identifica con su PIN | Iniciar boletas, registrar regresos, completar las propias |

| Acción | Cabina | Administración | Dirección |
|---|:-:|:-:|:-:|
| Abrir turno (escuadra de guardia) | ✔ | ✔ | — |
| Iniciar boleta / registrar regreso | ✔ | ✔ | — |
| Completar boleta | Solo la tripulación | ✔ (con motivo) | — |
| Imprimir boleta | ✔ | ✔ | Ver |
| Revisión diaria | Ver | ✔ | ✔ |
| Anular boleta | — | ✔ (con motivo) | Ver motivo |
| Entradas, vales, bajas, ajustes, cierre | — | ✔ | — |
| Análisis e informes | — | ✔ | ✔ |
| Configuración | — | ✔ | — |

## 13. Modelo de datos

| Entidad | Campos clave | Para qué existe |
|---|---|---|
| `escuadras` | nombre | Turnos y vales |
| `personal` | nombre, escuadra, cargo, es_piloto, pin (cifrado), voluntario, activo | Tripulación, firmas, vales, PIN |
| `usuarios` | usuario, contraseña, rol (administracion / direccion / cabina) | Acceso |
| `estaciones` | nombre (central, Santa Elena) | Futura subestación |
| `unidades` | código, tipo, estado (en servicio / reposición / taller), piloto habitual | Boleta, combustible, carga |
| `cargas_combustible` (opcional) | unidad, fecha, galones | Intervalos del informe de combustible |
| `sectores` / `sector_alias` / `lugares_criticos` | nombre, tipo, punto / sinónimos / punto dentro del sector | Análisis de zonas sin IA |
| `turnos` / `turno_personal` | escuadra, inicio 8:00, jefe, cabinista, personal | Autollenado y tripulación |
| `boletas` + `boleta_tripulacion` + 5 detalles | tipo, causa, estado, **número (null hasta el regreso)**, hora de aviso, salida y regreso, dirección, sector, lugar crítico, unidad, turno | Documento central del OE1 |
| `certificaciones` | boleta, solicitante, destino, fecha | Copias certificadas |
| `insumos` / `presentaciones` | categoría, clase, unidad base, mínimo, oficial / factor | Catálogo y conversión |
| `lotes` | insumo, número, vencimiento, saldo | Trazabilidad |
| `entradas` / `vales` | encabezados de documento; el vale lleva escuadra, recibe y entrega | Documentos fuente |
| `movimientos` | tipo, lote, cantidad, documento, boleta, motivo | Fuente única de cifras |
| `cierres_mensuales` / `conteos` | saldos congelados / esperado vs. contado | Hoja oficial y ajustes |
| `bitacora` | usuario, acción, entidad, detalle | Trazabilidad |

## 14. Reglas de negocio

| Código | Regla |
|---|---|
| RN-01 | El número de control es **correlativo por tipo de servicio** y se asigna **al registrar el regreso de la unidad**, en el orden de regreso. Nunca se reutiliza ni se salta. |
| RN-02 | Solo la tripulación completa su boleta; Administración puede hacerlo con motivo registrado. |
| RN-03 | Para iniciar bastan tipo, dirección y hora de salida; para completar, **todos** los campos del formato oficial (o "No aplica"). |
| RN-04 | Una boleta firmada no se edita; solo se anula con motivo y conserva su número. |
| RN-05 | Toda boleta completa tiene sector y causa. |
| RN-06 | Un sector propuesto queda pendiente hasta que Administración lo aprueba o lo une. |
| RN-07 | Toda entrada de un consumible con vencimiento exige lote y vencimiento. |
| RN-08 | Las salidas descuentan primero el lote que vence antes. |
| RN-09 | Ninguna existencia puede quedar negativa. |
| RN-10 | Un vale exige escuadra, quién recibe y quién entrega. |
| RN-11 | Un mes cerrado congela sus saldos; un movimiento en él requiere justificación. |
| RN-12 | El equipo no se consume: se asigna y cambia de estado. |
| RN-13 | Ningún registro se elimina; toda anulación o corrección queda en la bitácora. |
| RN-14 | Toda impresión oficial muestra el formato completo de la capital. |

## 15. Requisitos no funcionales

| Requisito | Razón |
|---|---|
| **Local, sin internet** | Lo prefieren por costo [Audio 1:12:04]; sin IA ni fuentes externas todo corre en la estación |
| **Respaldo automático diario** | Si reemplaza al papel, debe ser al menos igual de seguro |
| Compatible con el equipo de cabina | Equipo antiguo: verificar navegador y sistema operativo |
| Rápido de usar en madrugada | Las tripulaciones llenan a las 2:30 o a las 5:00 [Audio 58:31] |
| Protección de datos personales | Pacientes, menores, fallecidos |
| Bitácora | Quién modificó o anuló qué y cuándo |

## 16. Fuera de alcance

| Funcionalidad | Por qué no |
|---|---|
| Inteligencia artificial | Decisión de alcance; elimina riesgos de privacidad, costo e internet |
| Mantenimiento de unidades | Lo llevan los jefes de servicio; no es prioridad [Audio 22:22–22:46] |
| Caja, facturas, convenio municipal | Es contabilidad; el sistema solo aporta la estadística del convenio |
| Sistema en la nube | Costo mensual [Audio 1:12:04] |
| Predicción estadística compleja | Con pocos meses de datos no es defendible; se usan proyecciones simples y explicadas |
| GPS de unidades | No hay dispositivos ni se pidió |

---

# PARTE IV — DISEÑO GRÁFICO (UX/UI)

## 17. Arquitectura de navegación

8 entradas, agrupadas por lo que la persona *hace*. Las páginas relacionadas son pestañas dentro de su sección.

```
 ┌──────────────────────────────┐
 │ [logo] 39ª Compañía          │
 │ [ + Nueva boleta ]           │  ← acción principal (cabina)
 │                              │
 │ ▸ Inicio                     │  ← "qué tengo que hacer ahora"
 │                              │
 │ SERVICIOS                    │
 │ ▸ Boletas             (3)    │  ← Revisión diaria · Historial · Por imprimir
 │ ▸ Análisis de servicios      │  ← OE1
 │                              │
 │ INVENTARIO                   │
 │ ▸ Existencias         (9)    │  ← Insumos · Lotes y vencimientos
 │ ▸ Movimientos                │  ← Entradas · Vales · Bajas y ajustes
 │                              │
 │ ▸ Análisis institucional     │  ← OE2: Resumen · Consumo · Proyección anual · Demanda
 │ ▸ Informes                   │  ← todo lo que se entrega (ver §17.1)
 │ ▸ Configuración              │  ← solo Administración
 └──────────────────────────────┘
```

**Insignias con un solo significado:** *Boletas* = boletas pendientes de completar; *Existencias* = alertas de inventario.

### 17.1 La sección Informes: un lugar para todo lo que sale de la compañía

| Informe | Destinatario | Periodicidad |
|---|---|---|
| Control mensual de existencias (4 categorías) | Capital | Mensual |
| Resumen anual de inventario | Capital / dirección | Anual |
| Proyección anual de insumos | Capital (solicitud de febrero) | Anual |
| Salidas por unidad entre fechas | Capital (combustible) | Por carga |
| Totales de servicios por tipo | Capital | A solicitud |
| Personas atendidas y accidentes | Municipalidad | Trimestral |
| Zonas de mayor incidencia | Mesa interinstitucional | Trimestral |

Cada informe muestra **a quién va dirigido**, se imprime con el formato oficial y se exporta a Excel. Así la encargada encuentra todo en un mismo lugar y, si ella falta, otra persona sabe qué entregar (responde a [Audio 27:44]).

## 18. Sistema de diseño

### 18.1 Tokens

| Familia | Regla |
|---|---|
| **Superficies** | Máximo dos niveles: fondo → tarjeta |
| **Texto** | Tenue solo para datos secundarios, nunca para instrucciones |
| **Acento institucional (rojo)** | **Solo** botón primario y elemento activo del menú. Una acción primaria por pantalla |
| **Tipos de servicio** | Ambulancia azul, incendio rojo, rescate ámbar, varios violeta, agua verde; siempre con texto o ícono; los mismos en chips, gráficos y mapa |
| **Estados** | Correcto verde, atención ámbar, crítico rojo con ícono, información azul; nunca decorativos |
| **Espaciado** | 4 · 8 · 12 · 16 · 24 · 32 · 48 |
| **Radios** | Controles 10, tarjetas 14 |

El rojo del acento, de *incendio* y de *crítico* son parecidos: incendio se distingue por su ícono de llama y crítico siempre va con ícono de alerta y texto.

### 18.2 Tipografía

| Uso | Tamaño / peso | Fuente |
|---|---|---|
| Título de pantalla | 26 / 700 | Figtree |
| Título de sección | 20 / 700 | Figtree |
| Título de tarjeta | 16 / 700 | Figtree |
| Texto y campos | 15–16 / 400–600 | Figtree |
| Rótulos y notas | 13 / 600 | Figtree |
| **Códigos y cifras** | 14 / 500 | JetBrains Mono, cifras tabulares |

Fuentes **dentro del proyecto** (funcionan sin internet). La monoespaciada solo para códigos y cifras alineadas.

### 18.3 Vocabulario visual de estados

| Estado | Color | Ícono | Texto |
|---|---|---|---|
| En curso | Información | Ambulancia | "Unidad fuera · hace 25 min · sin número aún" |
| Pendiente de completar | Atención | Reloj | "Nº 1763 · falta: pacientes, causa" |
| Completa | Neutro | Check | "Lista para imprimir" |
| Firmada | Correcto | Documento | "Impresa el 12/10" |
| Anulada | Tenue, tachado | Prohibido | "Anulada: registrada dos veces" |
| Salto en la secuencia | Crítico | Alerta | "Falta el nº 1758" |
| Existencia baja | Atención | Caja | "Quedan 3 · mínimo 5" |
| Vencido | Crítico | Alerta | "Venció el 01/10" |

### 18.4 Componentes

Botón (primario, secundario, plano, peligro) · Campo (texto, número, fecha, hora con "Ahora", selección con búsqueda, "No aplica") · Chips · Tarjeta de opción · Segmentos · Pestañas de sección · Tabla (fila clicable, cifras a la derecha, totales) · Etiqueta de estado · Tipo de servicio (punto + nombre) · Indicador · Aviso · Modal · Vacío (qué es + qué hacer + botón) · Paginador · Hoja oficial (vista previa e impresión) · Teclado de PIN.

### 18.5 Reglas para gráficos

- Barras horizontales para rankings (se leen los nombres completos).
- Columnas apiladas solo para tipo de servicio en el tiempo.
- Matriz de calor solo para día × hora.
- Todo gráfico tiene "Ver como tabla".
- Sin pastel ni 3D; ningún gráfico repite una cifra de un indicador.

## 19. Especificación por pantalla

### 19.1 Inicio (según el rol)

```
 CABINA                                      ADMINISTRACIÓN                     DIRECCIÓN
 ┌──────────────────────────────────┐        ┌────────────────────────────┐    ┌───────────────────────────┐
 │ Turno: Escuadra B · desde 8:00   │        │ Por revisar hoy            │    │ Octubre 2026              │
 │ [Ambul][Incen][Resc][Var][Agua]  │        │ · 2 boletas sin firmar     │    │ 27 servicios  −9 vs sept  │
 │ Unidades fuera                   │        │ · 1 salto en ambulancia    │    │ Zonas de mayor incidencia │
 │  1151 Ambulancia · 25 min        │        │ · 9 alertas de inventario  │    │ Insumos en riesgo         │
 │            [ La unidad regresó ] │        │ · Septiembre sin cerrar    │    │ Informes por entregar     │
 │ Boletas por completar            │        │ Informes por entregar      │    └───────────────────────────┘
 │  Nº 1763 · falta pacientes  [›]  │        │ · Combustible (unidad 1151)│
 └──────────────────────────────────┘        └────────────────────────────┘
```

El botón de cada unidad fuera es **"La unidad regresó"** (asigna el número), no "Cerrar servicio": cerrar es otra cosa, que hace la tripulación después.

### 19.2 Nueva boleta: dos momentos

**Al recibir la llamada** (cabinista, menos de 1 minuto): una sola pantalla con tipo, solicitante, teléfono, dirección, sector, unidad y tripulación. Botón **"La unidad salió"**.

**Al completar** (tripulación): formulario a la izquierda y **hoja oficial a la derecha, llenándose en vivo** (F7). Cada campo vacío se ve vacío en la hoja; "No aplica" se ve escrito.

```
 ┌──────────────────────────────────────┬──────────────────────────────────────┐
 │ Nº 1763 · Ambulancia · Pendiente     │  ┌────────────────────────────────┐  │
 │                                      │  │  BENEMÉRITO CUERPO VOLUNTARIO  │  │
 │ Pacientes                            │  │  INFORME DE AMBULANCIA         │  │
 │  Nombre [............]  Edad [..]    │  │  Control: 1763                 │  │
 │ Causa  (o) Accidente de motocicleta  │  │  Dirección: 9a. av. 11-14 ...  │  │
 │ Traslado a  (o) Hosp. Modular ...    │  │  Paciente: ▓▓▓▓▓▓▓▓            │  │
 │ Observaciones [..................]   │  │  ...                           │  │
 │                                      │  └────────────────────────────────┘  │
 │ Falta: edad del paciente             │   El campo que se edita se resalta   │
 │ [Guardar y seguir después] [Completa]│                                      │
 └──────────────────────────────────────┴──────────────────────────────────────┘
```

### 19.3 Boletas › Revisión diaria (nueva)

Responde a la tarea que la encargada hace cada mañana [Audio 59:43]: *¿están firmadas y el correlativo va sin saltos?*

```
 Revisión del  [ 13/10/2026 ▾ ]                        [Imprimir revisión]
 ┌ Ambulancia ─────────────────────────────────────────────────────────┐
 │ 1758  Firmada         1759  Firmada        1760  ⚠ Pendiente 26 h    │
 │ 1761  Completa · sin imprimir              1762  Firmada             │
 └──────────────────────────────────────────────────────────────────────┘
 ┌ Servicios varios ───────────────────────────────────────────────────┐
 │ 537  Firmada          538  Anulada: registrada dos veces             │
 └──────────────────────────────────────────────────────────────────────┘
```

Un tipo por bloque, los números en orden, cada uno con su estado; los problemas arriba y en color de atención o crítico.

### 19.4 Boletas › Historial y Por imprimir

Búsqueda + segmentos de estado + chips de tipo + "Más filtros" (periodo, sector, unidad, persona). Columnas: Nº · Fecha y hora · Tipo y causa · Sector · Unidad · Estado. Selección múltiple → *Imprimir seleccionadas* (una sola acción primaria).

### 19.5 Análisis de servicios

Indicadores (servicios, zonas de mayor incidencia, franja con más servicios, datos completos) → hallazgos calculados → franjas y causas → tabla de sectores con la línea de corte del 80 % → día × hora → mapa → lugares críticos. Botón *Imprimir informe trimestral*.

### 19.6 Existencias

Pestañas por categoría con conteo; tabla: Insumo · Existencia (unidad base y presentación) · Mínimo · Próximo vencimiento · Estado. Clic → ficha del insumo: lotes, movimientos, consumo por tipo de servicio. Acciones: *Registrar entrada* · *Registrar vale*.

### 19.7 Movimientos

Lista de **documentos** (Entrada E-0012 · Vale V-0031 · Baja B-0004), no de líneas sueltas. Cada documento se abre, se imprime y muestra sus líneas; se crea con varias líneas en una sola operación.

### 19.8 Informes

Una tarjeta por informe (§17.1) con su destinatario y periodicidad; al abrirlo: selector de periodo (o de unidad y fechas para combustible), vista previa idéntica a la impresión, *Imprimir* y *Exportar a Excel*. El control mensual vive aquí **sin botones por fila**.

### 19.9 Análisis institucional

Pestañas: **Resumen** · **Consumo** (por tipo y sector) · **Proyección anual** (con la fórmula visible y la comparación con lo pedido el año anterior) · **Demanda y recursos** (carga por unidad, sector × franja).

### 19.10 Configuración

Pestañas: Personal (escuadra, piloto, voluntario, PIN) · Escuadras · Unidades (estado) · Sectores (sinónimos, lugares críticos, pendientes) · Insumos (clase, unidad base, presentaciones, mínimo) · Usuarios · Bitácora.

## 20. Micro-interacciones y textos

| Situación | Comportamiento |
|---|---|
| Guardar | Automático; "Guardado hace un momento" junto al título |
| PIN | Teclado numérico grande; 3 intentos fallidos bloquean 1 minuto |
| Error de validación | Junto al campo en lenguaje humano ("Escriba la edad o marque *No aplica*"); el botón *Completa* lista lo que falta |
| Acción destructiva | Solo *Anular*, con motivo obligatorio; nunca "Eliminar" |
| Vacío | Qué es + qué hacer + botón |
| Cargando | Esqueleto con la forma del contenido |
| Confirmación | Notificación breve; sin modales para confirmar éxito |

---

# PARTE V — PLAN Y VALIDACIÓN

## 21. Fases

| Fase | Contenido | Estado |
|---|---|---|
| **F1 — Limpieza y navegación** | IA retirada; análisis de servicios por reglas (Pareto, cambio honesto, día × hora, causa); navegación con pestañas; correcciones visuales; fuentes locales | **Hecha (14/10/2026)** |
| **F2 — Boleta correcta** | Número asignado al registrar el regreso; estados en servidor; tripulación y PIN; rol Dirección y sesión de cabina; **Revisión diaria**; campos obligatorios con "No aplica"; impresión del formato completo (observaciones en agua, incendio a dos caras); causas de la realidad; unidades con estado | **Hecha (14/10/2026)**, salvo incendio a dos caras (falta ver la boleta física) |
| **F3 — Inventario por documentos** | Catálogo oficial de la capital; entradas y vales con varias líneas; vale impreso; consumible vs. equipo; presentaciones; control mensual sin botones por fila; cierre mensual; resumen anual | **Hecha (14/10/2026)**; falta cargar la lista oficial de productos de la capital |
| **F4 — Informes y análisis** | Sección Informes; proyección anual; salidas por unidad entre fechas; personas atendidas; totales por tipo; lugares críticos, mapa e informe trimestral de zonas; consumo por escuadra y turno | **Hecha (14/10/2026)**, salvo el mapa (necesita la ubicación de cada sector) |
| **F5 — Validación** | Carga histórica real; mediciones antes/después; cuestionario SUS | Acceso a la institución |

### Avance de F1

| Hecho | Detalle |
|---|---|
| IA retirada | Servicio, controlador y rutas de IA eliminados; dependencia `openai` y clave del `.env` fuera; tabla `ia_sugerencias` eliminada (migración `004_retirar_ia.sql`) |
| Sector sin IA | `frontend/src/utils/sector.js`: propone el sector solo si la dirección menciona su nombre o un lugar de referencia y dice cuál coincidió |
| Análisis de servicios | `serviciosController.js` + `AnalisisServicios.vue`: hallazgos al abrir, Pareto del 80 %, cambio honesto, día × hora, causas; cada cifra abre sus boletas |
| Navegación | 7 entradas con pestañas (Boletas, Existencias, Análisis institucional, Configuración) |
| Detalles visuales | Sin códigos de módulo ni insignia "N", reloj sin animación, encabezados en fuente normal, fuentes locales, un solo primario en *Por imprimir*, "¿Olvidó cerrarlo?", *Últimos servicios* legibles |

### Avance de F2, F3 y F4 (14/10/2026)

| Área | Qué quedó funcionando | Dónde |
|---|---|---|
| Ciclo de la boleta | En curso → pendiente → completa → firmada → anulada; número asignado al registrar el regreso, por tipo, con candado para regresos simultáneos | Migración `005`, `emergenciasController.js` |
| Registro de la llamada | Una sola pantalla para cabina; «La unidad salió» o «La unidad ya regresó» | `NuevaBoleta.vue` |
| Completar | PIN de la tripulación; formulario por secciones con la hoja oficial en vivo; lista de lo que falta con «No aplica»; guardado automático | `CompletarBoleta.vue` |
| Revisión diaria | Secuencia por tipo, saltos, atrasadas y firma en lote | `Revision.vue` |
| Roles | Cabina, Administración y Dirección (solo consulta, bloqueada también en el servidor) | `middleware/roles.js`, router |
| Catálogos | Escuadras, personal con escuadra, piloto, voluntario y PIN cifrado; unidades con estado; lugares críticos | `catalogosController.js`, `Catalogos.vue` |
| Inventario | Documentos con varias líneas (entrada, vale, baja, ajuste); vale impreso con el formato de papel; clase y presentación de cada insumo; lote obligatorio si vence; cierre mensual | Migración `006`, `documentosController.js`, `Documentos.vue` |
| Uso en servicio | Los insumos de la boleta se registran como uso y no se descuentan otra vez de bodega | Migración `007`, vista `v_consumo_servicio` |
| Informes | Control mensual, resumen anual, proyección anual, salidas por unidad, personas atendidas, totales por tipo, zonas con lugares críticos; impresión con membrete y exportación a Excel sin internet | `informesController.js`, `Informes.vue` |
| Análisis | Consumo por escuadra frente a los servicios de sus turnos; lugares críticos | `analiticaController.js`, `serviciosController.js` |
| Datos de prueba | Escuadras, PIN `1234`, turnos a las 8:00, números en orden de regreso, vales semanales, uso en servicios | `simular.js` |

## 22. Indicadores para validar la tesis (antes / después)

| Indicador | Antes | Después | Objetivo |
|---|---|---|---|
| Números de control duplicados o saltados por mes | Contar en el archivo | Meta: 0 | OE1 |
| Tiempo de la revisión diaria de boletas | Medir | Medir | OE1 |
| Boletas con campos vacíos | Muestra en papel | Meta: 0 | OE1 |
| Tiempo para llenar una boleta | 5–10 min declarado → medir | Medir | OE1 |
| % de boletas con sector y causa | 0 % | Meta: 100 % | OE1 |
| Tiempo para preparar el informe de zonas de la mesa interinstitucional | No existe | Medir | OE1 |
| **Tiempo del informe de combustible** | **4–5 días** [Audio 10:26] | Medir (meta: minutos) | OE2 |
| Diferencia entre lo pedido en febrero y lo consumido en el año | "A ciegas" | Comparación automática | OE2 |
| Tiempo para elaborar la hoja mensual y el resumen anual | Medir | Automática | OE3 |
| Diferencia entre existencia registrada y conteo físico | Conteo de prueba | Conteo de prueba | OE3 |
| Lotes vencidos sin alerta previa | Sin control | Meta: 0 | OE3 |
| Usabilidad percibida | — | SUS con usuarios reales | Todos |

## 23. Preguntas que siguen abiertas

1. ¿Cómo y para quién se extienden las copias certificadas? ¿Cuántas al mes?
2. ¿Qué sistema operativo y navegador tiene la computadora de cabina?
3. ¿Existe una lista oficial de zonas, colonias y aldeas, y de los lugares críticos que ya conocen?
4. ¿Se pueden registrar las fechas de carga de combustible por unidad, o basta con elegir el rango de fechas?
5. ¿Cuál es el formato exacto que pide la capital para el informe de combustible?

---

# ANEXO A — Evidencia de la entrevista

Fuente: grabación con la encargada administrativa (1 h 21 min), transcrita automáticamente con Whisper. Entre los minutos 36 y 52, y después de 1:10, hay conversaciones ajenas al sistema (convenio municipal, facturas, llamadas); de ellas solo se toma lo que afecta al sistema. Algunas palabras pueden estar mal transcritas (p. ej. "Pladera" probablemente es "Pradera").

| Marca | Dato | Dónde se usa |
|---|---|---|
| 00:20–01:20 | Estructura de la hoja mensual; las salidas salen de la hojita firmada (recibió, escuadra, entregó) que lleva la comisión de dos personas | P2, P4, §10.2 |
| 01:41–01:57 | Las entradas tienen constancia de ingreso aparte | P3, §10.2 |
| 02:04–04:51 | Las 4 categorías; "prehospitalario" es el nombre que usan; limpieza incluye productos para unidades | §7, §10.3 |
| 04:56–05:33 | La lista de productos viene de la capital; quieren poder agregar productos | §10.3 |
| 06:05–06:57 | Aplica primero en entrar, primero en salir; el azúcar vence | P3, §10.3 |
| 07:10–07:43 | No es bombero; horario de 7 a 17; entregas solo en horario | §2, P2 |
| 08:08–10:32 | Formatos de la capital auditados por Contraloría; informe de salidas por unidad entre cargas de combustible, 4–5 días | P6, §11 |
| 11:38–12:00 | El jefe es su papá; pagaron a un programador y no les sirvió | §2, §5 |
| 12:38–24:08 | Mantenimiento por kilometraje lo llevan los jefes de servicio; no es prioridad | Fuera de alcance |
| 16:37–18:07 | Escuadras de 6–7, turnos de 24 h a las 8:00; 2 por unidad, cabinista, jefe de servicio; bomberos pagados y voluntarios | §1, §2 |
| 18:49–22:15 | 3 unidades en servicio, 2 de reposición, motobombas; subestación en Santa Elena | §1 |
| 24:20–25:10 | Quieren que no dependa de ella; quieren lo mensual y lo anual | §2, §10.3 |
| 25:16–27:24 | Compra anual en febrero, "a ciegas"; ejemplo de las resmas; proyección de combustible | P5, §7, §11 |
| 27:44 | Que un bombero pueda hacerlo si ella falta | §2, §17.1 |
| 28:52–31:44 | Definición de los cinco tipos de servicio | P1, §9.4 |
| 33:29–34:21 | Correlativos separados por tipo; la capital pide totales por tipo | RN-01, §11 |
| 34:31–35:04 | El jefe de servicio lleva otro Excel por causa (moto, carro, caídas, enfermedad) | §7, §9.4 |
| 44:34–44:53 | El convenio pide accidentes y personas beneficiadas | P6, §11 |
| 54:22–54:44 | Revisa que no haya duplicados ni espacios en blanco; el programa anterior permitía blancos | F3, §9.6 |
| 55:00–59:41 | Caso de las unidades 1151 y 1314: el número debe seguir el orden de regreso; reservas, sobrescritura, duplicados | F2, §9.1, RN-01 |
| 58:31–58:55 | Regresan a las 2:30 y llenan a las 5:00; fines de semana con más accidentes | §4, §15 |
| 59:43–59:58 | Revisa a diario firmas y correlativo sin saltos | §19.3 |
| 1:00:16–1:01:32 | Mapa de accidentes; entrada a Pradera; mesa interinstitucional trimestral | §9.5, §9.7 |
| 1:04:30–1:06:56 | El programa anterior es local en la computadora de cabina; prefieren local | §4, §5 |
| 1:05:57 | Imprimir todos los campos aunque estén vacíos | §9.6, RN-14 |
| 1:12:04 | La nube cuesta cada mes | §15 |
| 1:12:46 | La boleta de incendio tiene dos caras | §9.6 |
| 1:13:24 | La boleta de agua necesita observaciones | §9.6 |
