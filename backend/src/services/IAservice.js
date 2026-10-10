const OpenAI = require('openai');
require('dotenv').config();

let cliente = null;

const obtenerCliente = () => {
    if (!process.env.OPENAI_API_KEY) return null;
    if (!cliente) {
        cliente = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return cliente;
};

const construirContexto = (registros) => {
    const porZona = {};

    registros.forEach(r => {
        const zona = r.zona || 'Sin especificar';
        if (!porZona[zona]) porZona[zona] = {};
        porZona[zona][r.tipo_servicio] = (porZona[zona][r.tipo_servicio] || 0) + 1;
    });

    return Object.entries(porZona).map(([zona, tipos]) => {
        const detalle = Object.entries(tipos)
            .map(([tipo, cantidad]) => `${tipo}: ${cantidad}`)
            .join(', ');
        const total = Object.values(tipos).reduce((a, b) => a + b, 0);
        return `${zona} — total ${total} servicios (${detalle})`;
    }).join('\n');
};

const generarAnalisis = async (registros, periodo) => {
    const api = obtenerCliente();

    if (!api) {
        return {
            disponible: false,
            mensaje: 'El servicio de análisis no se encuentra configurado',
            analisis: null
        };
    }

    const contexto = construirContexto(registros);

    const instruccion = `Eres un analista de datos operativos de un cuerpo de bomberos voluntarios en Guatemala. Analiza la información proporcionada y redacta un informe breve en español, en tono profesional e institucional, sin usar viñetas ni títulos. Identifica las zonas con mayor incidencia, señala qué tipo de servicio predomina en cada una y ofrece una conclusión útil para la planificación de recursos. Máximo cuatro párrafos.`;

    const consulta = `Periodo analizado: ${periodo}
Total de servicios registrados: ${registros.length}

Distribución de servicios por zona del municipio de Chiquimula:
${contexto}

Redacta el análisis de las zonas de mayor incidencia.`;

    try {
        const respuesta = await api.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: instruccion },
                { role: 'user', content: consulta }
            ],
            temperature: 0.4,
            max_tokens: 700
        });

        return {
            disponible: true,
            analisis: respuesta.choices[0].message.content,
            contexto_utilizado: contexto
        };

    } catch (error) {
        console.error('Error al consultar el servicio de análisis:', error.message);
        return {
            disponible: false,
            mensaje: 'No fue posible generar el análisis en este momento',
            analisis: null
        };
    }
};

module.exports = { generarAnalisis, construirContexto };