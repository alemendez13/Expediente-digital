/**
 * Archivo de Configuración del Expediente Clínico
 * ---------------------------------------------
 * Este archivo define la estructura de la historia clínica para cada especialidad.
 * 'main.js' utiliza este objeto para saber qué componentes HTML cargar dinámicamente.
 *
 * Propiedades:
 * - professionalInfo: Contiene los datos del profesional para cada área.
 * - sections: Un array que define el orden y los títulos de las secciones principales del expediente.
 * - components: Mapea cada especialidad a sus componentes específicos.
 * - 'common': Componentes que son iguales para TODAS las especialidades.
 * - 'specialty-specific': Componentes que varían por especialidad. Si una sección no
 * está definida aquí, se asume que no tiene campos específicos para esa área.
 */
const clinicalRecordConfig = {
    professionalInfo: {
        medicina: { nombre: 'Dra. Alejandra Méndez Pérez', cedula: '5052492' },
        psicologia: { nombre: 'Lic. Gabriel Alejandro Pérez Ruíz', cedula: 'CEDULA_PSIC' },
        nutricion: { nombre: 'Lic. en Nutrición', cedula: 'CEDULA_NUTRI' },
        fisioterapia: { nombre: 'Lic. en Fisioterapia', cedula: 'CEDULA_FISIO' },
    },

    sections: [
        { id: 'ficha-identificacion', title: '1. Ficha de Identificación' },
        { id: 'antecedentes-clinicos', title: '2. Antecedentes Clínicos' },
        { id: 'padecimiento-actual', title: '3. Padecimiento Actual' },
        { id: 'exploracion-fisica', title: '4. Exploración Física' },
        { id: 'estudios-gabinete', title: '5. Estudios de Laboratorio y Gabinete' },
        { id: 'analisis-pronostico', title: '6. Análisis / Pronóstico' },
        { id: 'diagnostico', title: '7. Diagnóstico' },
        { id: 'plan-terapeutico', title: '8. Plan Terapéutico' },
        { id: 'vista-previa', title: '9. Vista Previa para Imprimir' },
    ],

    components: {
        common: {
            // -- CAMBIO REALIZADO AQUÍ --
            'ficha-identificacion': 'components/common-ficha-identificacion.html',
            // 'antecedentes-clinicos': 'components/common-antecedentes.html', // Ejemplo para el futuro
        },
        specialty: {
            medicina: {
                // 'exploracion-fisica': 'components/medicina-exploracion.html' // Ejemplo
            },
            psicologia: {
                // 'exploracion-fisica': 'components/psicologia-exploracion.html' // Ejemplo
            },
            nutricion: {
                // 'exploracion-fisica': 'components/nutricion-exploracion.html' // Ejemplo
            },
            fisioterapia: {
                'exploracion-fisica': 'components/fisioterapia-exploracion.html'
            }
        }
    }
};
