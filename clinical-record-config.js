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

    // --- SECCIÓN MODIFICADA ---
    // Se actualiza la lista de secciones a los 11 nuevos puntos.
    sections: [
        { id: 'ficha-identificacion', title: '1. Ficha de Identificación' },
        { id: 'antecedentes-heredo-familiares', title: '2. Antecedentes Heredo Familiares' },
        { id: 'antecedentes-patologicos', title: '3. Antecedentes Personales Patológicos' },
        { id: 'antecedentes-no-patologicos', title: '4. Antecedentes Personales No Patológicos' },
        { id: 'padecimiento-actual', title: '5. Padecimiento Actual' },
        { id: 'exploracion-fisica', title: '6. Exploración Física' },
        { id: 'estudios-gabinete', title: '7. Estudios de Laboratorio y Gabinete' },
        { id: 'diagnostico', title: '8. Diagnóstico' },
        { id: 'analisis-pronostico', title: '9. Análisis / Pronóstico' },
        { id: 'plan-terapeutico', title: '10. Plan Terapéutico' },
        { id: 'vista-previa', title: '11. Vista Previa para Imprimir' },
    ],

    // --- SECCIÓN MODIFICADA ---
    // Se ajusta la asignación del componente al nuevo ID de sección.
    components: {
        common: {
            'ficha-identificacion': 'components/common-ficha-identificacion.html',
            'antecedentes-heredo-familiares': 'components/common-antecedentes.html', // Antes era 'antecedentes-clinicos'
        },
        specialty: {
            fisioterapia: {
                'exploracion-fisica': 'components/fisioterapia-exploracion.html'
            }
        }
    }
};
