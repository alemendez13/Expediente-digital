/**
 * Archivo de Configuración del Expediente Clínico
 */
const clinicalRecordConfig = {
    // Información general por especialidad (se usa si no hay una anulación específica)
    professionalInfo: {
        medicina: { nombre: 'Dra. Alejandra Méndez Pérez', cedula: '5052492' },
        psicologia: { nombre: 'Lic. Gabriel Alejandro Pérez Ruíz', cedula: 'CEDULA_PSIC' },
        nutricion: { nombre: 'Lic. en Nutrición', cedula: 'CEDULA_NUTRI' },
        fisioterapia: { nombre: 'Lic. en Fisioterapia', cedula: 'CEDULA_FISIO' },
    },

    // Anulaciones específicas por correo de usuario.
    userOverrides: {
        'medicina.general@sansce.com': { nombre: 'Dra. Teresa Vázquez Álvarez', cedula: 'CEDULA_TVA' }
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
            'ficha-identificacion': 'components/common-ficha-identificacion.html',
            // --- AJUSTE AÑADIDO AQUÍ ---
            'antecedentes-clinicos': 'components/common-antecedentes.html',
        },
        specialty: {
            fisioterapia: {
                'exploracion-fisica': 'components/fisioterapia-exploracion.html'
            }
        }
    }
};
