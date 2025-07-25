// --- PARTE A: FUNCIONES DE AYUDA GLOBALES ---
// Estas funciones se hacen globales (se mueven fuera del 'DOMContentLoaded')
// para que puedan ser llamadas por los atributos onclick="" del HTML 
// que se genera dinámicamente para los acordeones.

function toggleAccordion(headerElement) {
    const content = headerElement.nextElementSibling;
    const icon = headerElement.querySelector('svg');
    if (content) {
      content.classList.toggle('hidden');
    }
    if (icon) {
      icon.classList.toggle('rotate-180');
    }
}

function toggleContent(checkboxElement) {
    const detailsContainer = checkboxElement.closest('.disease-row').querySelector('.disease-details');
    if (detailsContainer) {
      detailsContainer.classList.toggle('hidden', !checkboxElement.checked);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO GLOBAL Y AUTENTICACIÓN ---
    const userSpecialty = localStorage.getItem('userSpecialty');
    const loggedInUser = localStorage.getItem('loggedInUser');

    if (!userSpecialty || !loggedInUser) { 
        window.location.href = 'login.html';
        return;
    }

    // --- DEFINICIÓN DE ELEMENTOS DEL DOM ---
    const clinicalRecordContainer = document.getElementById('clinical-record-container');
    const mainTitle = document.getElementById('main-title');
    const profNameEl = document.getElementById('prof-name');
    const profCedulaEl = document.getElementById('prof-cedula');
    const logoutBtn = document.getElementById('logout-btn');

    let currentPatientId = null;
    const baseUrl = '';

    // --- INICIALIZACIÓN DE LA APLICACIÓN ---
    function init() {
        setupHeader();
        buildClinicalRecordForm();
        logoutBtn.addEventListener('click', logout);
    }

    function setupHeader() {
        const userOverride = clinicalRecordConfig.userOverrides?.[loggedInUser];
        const professional = userOverride || clinicalRecordConfig.professionalInfo[userSpecialty];

        if (professional) {
            mainTitle.textContent = `Expediente Clínico - ${userSpecialty.charAt(0).toUpperCase() + userSpecialty.slice(1)}`;
            profNameEl.textContent = professional.nombre;
            profCedulaEl.textContent = professional.cedula;
        }
    }

    function logout() {
        localStorage.removeItem('userSpecialty');
        localStorage.removeItem('loggedInUser'); 
        window.location.href = 'login.html';
    }

    // --- CONSTRUCCIÓN DINÁMICA DEL FORMULARIO ---
    async function buildClinicalRecordForm() {
        try {
            const sections = clinicalRecordConfig.sections;
            const commonComponents = clinicalRecordConfig.components.common;
            const specialtyComponents = clinicalRecordConfig.components.specialty[userSpecialty] || {};

            const sectionsHtml = (await Promise.all(sections.map(async (section) => {
                const commonComponentPath = commonComponents[section.id];
                const specialtyComponentPath = specialtyComponents[section.id];
                let content = '';

                if (commonComponentPath) content += await fetchComponent(commonComponentPath);
                if (specialtyComponentPath) content += await fetchComponent(specialtyComponentPath);
                
                if (!content && section.id !== 'vista-previa') {
                    content = `<p class="text-sm text-gray-500">No hay campos definidos para esta sección.</p>`;
                }
                 if (section.id === 'vista-previa') {
                    content = `<div class="text-center"><button type="button" id="print-btn" class="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition">Generar e Imprimir Nota</button></div>`;
                }

                return `
                    <section id="section-${section.id}" class="bg-white p-6 rounded-lg shadow-md mb-8">
                        <div class="section-header">
                            <h2 class="section-title">${section.title}</h2>
                            <svg class="w-6 h-6 transform transition-transform ${section.id === 'ficha-identificacion' ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                        <div class="section-content ${section.id === 'ficha-identificacion' ? 'block' : 'hidden'}">
                            ${content}
                        </div>
                    </section>
                `;
            }))).join('');

            let formHtml = `
                <div class="flex flex-col lg:flex-row gap-8">
                    <aside class="w-full lg:w-1/4"><div class="bg-white p-4 rounded-lg shadow-md sticky top-24"><h3 class="font-bold text-lg mb-4">Secciones</h3><ul class="space-y-2 text-sm">${sections.map(section => `<li><a href="#section-${section.id}" class="text-gray-700 hover:text-cyan-600 font-semibold">${section.title}</a></li>`).join('')}</ul></div></aside>
                    <main class="w-full lg:w-3/4"><form id="clinical-record-form" onsubmit="return false;">${sectionsHtml}<div class="flex justify-end gap-4 mt-8"><button type="button" id="save-patient-btn" class="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition">Guardar Consulta</button></div></form></main>
                </div>
            `;
            
            clinicalRecordContainer.innerHTML = formHtml;
            attachEventListeners();

        } catch (error) {
            console.error("Error al construir el formulario:", error);
            clinicalRecordContainer.innerHTML = `<div class="text-center py-10 bg-red-50 text-red-700 p-4 rounded-lg"><h3 class="font-bold text-lg">¡Oops! Ocurrió un error</h3><p>No se pudo cargar la estructura del expediente.</p><p class="text-sm mt-2 font-mono">Detalle: ${error.message}</p></div>`;
        }
    }
    
    async function fetchComponent(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Componente no encontrado: ${path}`);
            return await response.text();
        } catch (error) {
            console.error(error);
            return `<p class="text-red-500">Error al cargar el componente: ${path}</p>`;
        }
    }

    // --- LÓGICA DE LA API ---
    async function findPatient(query, searchType) {
        const searchButton = document.getElementById(`search-by-${searchType}-btn`);
        const searchInput = document.getElementById(`patient-${searchType}-input`);

        if (!query) {
            showNotification('Por favor, ingrese un término de búsqueda.', 'error');
            return;
        }

        let apiUrl = `${baseUrl}/.netlify/functions/get-patient-data?`;
        if (searchType === 'id') {
            apiUrl += `id=${encodeURIComponent(query)}`;
        } else {
            apiUrl += `name=${encodeURIComponent(query)}`;
        }

        const originalButtonText = searchButton.textContent;
        searchButton.innerHTML = '<span class="animate-spin h-5 w-5 border-b-2 border-white rounded-full inline-block"></span>';
        searchButton.disabled = true;
        searchInput.disabled = true;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status}`);
            }
            const patientFullData = await response.json();
            populateForm(patientFullData);
            showNotification('Paciente cargado exitosamente.', 'success');
        } catch (error) {
            console.error('Error al buscar paciente:', error);
            showNotification(`Error: ${error.message}`, 'error');
            clearForm();
        } finally {
            searchButton.innerHTML = originalButtonText;
            searchButton.disabled = false;
            searchInput.disabled = false;
        }
    }

    function renderHistoryTables(history) {
        // --- 1. PROCESAMIENTO PARA ESTUDIOS DE LABORATORIO ---
        const labData = {}; // Objeto para agrupar resultados por estudio
        
        history.forEach(consult => {
            const consultDate = new Date(consult.date).toLocaleDateString('es-MX');
            for (const key in consult.data) {
                if (key.startsWith('lab_') && key.endsWith('_resultado')) {
                    const studyNameKey = key.replace('_resultado', '');
                    const studyDate = consult.data[studyNameKey + '_fecha'] || consultDate;
                    const studyResult = consult.data[key];
                    const cleanStudyName = studyNameKey.replace('lab_', '').replace(/_/g, ' ');

                    if (!labData[cleanStudyName]) {
                        labData[cleanStudyName] = [];
                    }
                    labData[cleanStudyName].push({ date: studyDate, result: studyResult });
                }
            }
        });

        let labTableHtml = '<p class="p-4 text-sm text-gray-500">Sin historial de laboratorio.</p>';
        if (Object.keys(labData).length > 0) {
            labTableHtml = `
                <table class="w-full text-sm text-left text-gray-600 history-table">
                    <thead class="text-xs text-gray-700 uppercase">
                        <tr>
                            <th scope="col" class="px-6 py-3">Estudio</th>
                            <th scope="col" class="px-6 py-3">Fecha</th>
                            <th scope="col" class="px-6 py-3">Resultado</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            for (const studyName in labData) {
                labData[studyName].forEach((entry, index) => {
                    labTableHtml += `
                        <tr class="bg-white border-b hover:bg-gray-50">
                            ${index === 0 ? `<th scope="row" class="px-6 py-4 font-bold text-gray-900 capitalize" rowspan="${labData[studyName].length}">${studyName}</th>` : ''}
                            <td class="px-6 py-4">${entry.date}</td>
                            <td class="px-6 py-4">${entry.result}</td>
                        </tr>
                    `;
                });
            }
            labTableHtml += '</tbody></table>';
        }
        
        const labContainer = document.getElementById('lab-history-table-container');
        if (labContainer) labContainer.innerHTML = labTableHtml;

        // --- 2. PROCESAMIENTO PARA ESTUDIOS DE GABINETE ---
        const gabineteData = {};
        history.forEach(consult => {
            for (let i = 1; i <= 10; i++) {
                const studyName = consult.data[`gabinete_estudio_${i}`];
                if (studyName) {
                    const studyDate = consult.data[`gabinete_fecha_${i}`] || new Date(consult.date).toLocaleDateString('es-MX');
                    const studyResult = consult.data[`gabinete_resultado_${i}`];
                    if (!gabineteData[studyName]) {
                        gabineteData[studyName] = [];
                    }
                    gabineteData[studyName].push({ date: studyDate, result: studyResult });
                }
            }
        });
        
        let gabineteTableHtml = '<p class="p-4 text-sm text-gray-500">Sin historial de gabinete.</p>';
        if (Object.keys(gabineteData).length > 0) {
            gabineteTableHtml = `
                <table class="w-full text-sm text-left text-gray-600 history-table">
                    <thead class="text-xs text-gray-700 uppercase">
                        <tr><th scope="col" class="px-6 py-3">Estudio</th><th scope="col" class="px-6 py-3">Fecha</th><th scope="col" class="px-6 py-3">Resultado</th></tr>
                    </thead>
                    <tbody>
            `;
            for (const studyName in gabineteData) {
                gabineteData[studyName].forEach((entry, index) => {
                    gabineteTableHtml += `
                        <tr class="bg-white border-b hover:bg-gray-50">
                            ${index === 0 ? `<th scope="row" class="px-6 py-4 font-bold text-gray-900 capitalize" rowspan="${gabineteData[studyName].length}">${studyName}</th>` : ''}
                            <td class="px-6 py-4">${entry.date}</td>
                            <td class="px-6 py-4">${entry.result}</td>
                        </tr>
                    `;
                });
            }
            gabineteTableHtml += '</tbody></table>';
        }
        
        const gabineteContainer = document.getElementById('gabinete-history-table-container');
        if (gabineteContainer) gabineteContainer.innerHTML = gabineteTableHtml;
    }

    // --- PARTE B: FUNCIÓN PARA CONSTRUIR EL COMPONENTE DE PATOLOGÍAS ---
    // Esta función contiene toda la lógica que antes estaba en 'common-antecedentes-patologicos.html'.
    function initializePatologicosComponent() {
        const container = document.getElementById('chronic-diseases-container');
        if (!container) return; // Si el contenedor no existe, no hagas nada.

        const chronicDiseasesConfig = [
            { name: 'Metabólicas', id: 'metabolicas', diseases: [ { name: 'Diabetes', id: 'diabetes', questionnaire: 'paid' }, { name: 'Dislipidemia', id: 'dislipidemia', subDiseases: ['Hipertrigliceridemia', 'Hipercolesterolemia'] }, { name: 'Problemas de peso', id: 'problemas_peso' }, { name: 'Otras', id: 'metabolicas_otras', isOther: true }, ] },
            { name: 'Sistema Cardiovascular', id: 'cardiovascular', diseases: [ { name: 'Hipertensión arterial', id: 'hta' }, { name: 'Insuficiencia cardiaca', id: 'insuf_cardiaca' }, { name: 'Insuficiencia venosa periférica', id: 'ivp' }, { name: 'Valvulopatías', id: 'valvulopatias' }, { name: 'Otras', id: 'cardio_otras', isOther: true }, ] },
            { name: 'Sistema Digestivo', id: 'digestivo', diseases: [ { name: 'Enfermedad por Reflujo', id: 'erge' }, { name: 'Enfermedad ácido-péptica', id: 'eap' }, { name: 'Síndrome de intestino irritable', id: 'sii', questionnaire: 'ibss' }, { name: 'Otras', id: 'digestivo_otras', isOther: true }, ] },
            { name: 'Sistema Respiratorio', id: 'respiratorio', diseases: [ { name: 'Asma', id: 'asma' }, { name: 'EPOC', id: 'epoc' }, { name: 'Otras', id: 'resp_otras', isOther: true }, ] },
            { name: 'Sistema Musculoesquelético', id: 'musculoesqueletico', diseases: [ { name: 'Osteoartritis', id: 'osteoartritis' }, { name: 'Osteoporosis', id: 'osteoporosis' }, { name: 'Dolor crónico', id: 'dolor_cronico' }, { name: 'Otras', id: 'musc_otras', isOther: true }, ] },
            { name: 'Sistema Genitourinario', id: 'genitourinario', diseases: [ { name: 'Especificar', id: 'genito_otras', isOther: true }, ] },
            { name: 'Sistema Neurológico', id: 'neurologico', diseases: [ { name: 'Psiquiátricas', id: 'psiquiatricas', questionnaire: 'psq' }, { name: 'Otras', id: 'neuro_otras', isOther: true }, ] },
            { name: 'Otras Enfermedades Relevantes', id: 'otras_enfermedades', diseases: [ { name: 'Tumores o cáncer', id: 'cancer' }, { name: 'Dermatológicas', id: 'dermatologicas' }, { name: 'Problemas dentales', id: 'dentales', isOther: true }, { name: 'Problemas ópticos', id: 'opticos', isOther: true }, { name: 'Problemas auditivos', id: 'auditivos', isOther: true }, { name: 'Atopias (alergias)', id: 'atopias', isOther: true }, { name: 'Hiperuricemia', id: 'hiperuricemia' }, ] }
        ];

        const questionnairesHTML = {
            paid: `
            <div class="border rounded-md mt-4">
                <div class="section-header p-2 bg-blue-50 hover:bg-blue-100" onclick="toggleAccordion(this)">
                <h5 class="font-semibold text-sm text-blue-800">Cuestionario: Problem Areas in Diabetes (PAID)</h5>
                <svg class="w-5 h-5 transform transition-transform text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                <div class="p-3 hidden text-xs">
                <div class="space-y-2">
                    <label class="form-label block">¿Sigue el plan de alimentación?</label> <select name="app_paid_q1" class="form-select text-xs" data-list="frecuencia_paid"></select>
                    <label class="form-label block">¿Controla porciones de carbohidratos?</label> <select name="app_paid_q2" class="form-select text-xs" data-list="frecuencia_paid"></select>
                    <label class="form-label block">¿Registra consumo y glucosa?</label> <select name="app_paid_q3" class="form-select text-xs" data-list="frecuencia_paid"></select>
                    <label class="form-label block">¿Realiza actividad física acordada?</label> <select name="app_paid_q4" class="form-select text-xs" data-list="frecuencia_paid"></select>
                    <label class="form-label block">¿Revisa sus pies diariamente?</label> <select name="app_paid_q5" class="form-select text-xs" data-list="frecuencia_paid"></select>
                    <label class="form-label block">¿Toma medicamentos/insulina según indicaciones?</label> <select name="app_paid_q6" class="form-select text-xs" data-list="frecuencia_paid"></select>
                    <label class="form-label block">¿Su familia/amigos le apoyan?</label> <select name="app_paid_q7" class="form-select text-xs" data-list="frecuencia_paid"></select>
                    <label class="form-label block">¿Asiste a grupos de educación o seguimiento?</label> <select name="app_paid_q8" class="form-select text-xs" data-list="frecuencia_paid"></select>
                    <label class="form-label block mt-2">Interpretación:</label>
                    <textarea name="app_paid_interpretacion" class="form-textarea" rows="2"></textarea>
                </div>
                </div>
            </div>`,
            ibss: `
            <div class="border rounded-md mt-4">
                <div class="section-header p-2 bg-blue-50 hover:bg-blue-100" onclick="toggleAccordion(this)">
                <h5 class="font-semibold text-sm text-blue-800">Cuestionario: Síndrome de Intestino Irritable (IBSS)</h5>
                <svg class="w-5 h-5 transform transition-transform text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                <div class="p-3 hidden text-xs">
                <div class="space-y-2">
                    <label class="form-label block">¿Sufre frecuentemente dolor abdominal?</label> <select name="app_ibss_q1" class="form-select text-xs" data-list="frecuencia_ibss"></select>
                    <label class="form-label block">¿Cuántos días tuvo dolor la última semana?</label> <input type="number" name="app_ibss_q2" class="form-input text-xs">
                    <label class="form-label block">¿Impacto en actividades cotidianas?</label> <select name="app_ibss_q3" class="form-select text-xs" data-list="impacto_ibss"></select>
                    <label class="form-label block">¿Satisfecho con su hábito intestinal?</label> <select name="app_ibss_q4" class="form-select text-xs" data-list="satisfaccion_ibss"></select>
                    <label class="form-label block mt-2">Puntaje total:</label> <input type="text" name="app_ibss_score" class="form-input bg-gray-200" readonly>
                    <label class="form-label block mt-2">Interpretación:</label> <textarea name="app_ibss_interpretacion" class="form-textarea" rows="2"></textarea>
                </div>
                </div>
            </div>`,
            psq: `
            <!-- GAD-7 -->
            <div class="border rounded-md mt-4">
                <div class="section-header p-2 bg-yellow-50 hover:bg-yellow-100" onclick="toggleAccordion(this)">
                <h5 class="font-semibold text-sm text-yellow-800">Cuestionario de Ansiedad (GAD-7)</h5>
                <svg class="w-5 h-5 transform transition-transform text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                <div class="p-3 hidden text-xs">
                <div class="space-y-2">
                    <label class="form-label block">Sentirse nervioso, ansioso o tenso</label> <select name="app_gad7_q1" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block">No poder dejar de preocuparse</label> <select name="app_gad7_q2" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block">Preocuparse demasiado</label> <select name="app_gad7_q3" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block">Problemas para relajarse</label> <select name="app_gad7_q4" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block">Estar tan inquieto que es difícil quedarse sentado</label> <select name="app_gad7_q5" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block">Enfadarse o irritarse con facilidad</label> <select name="app_gad7_q6" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block">Sentir miedo de que algo terrible pueda ocurrir</label> <select name="app_gad7_q7" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block mt-2">Puntuación:</label> <input type="text" name="app_gad7_score" class="form-input bg-gray-200" readonly>
                    <label class="form-label block mt-2">Interpretación:</label> <textarea name="app_gad7_interpretacion" class="form-textarea" rows="2"></textarea>
                </div>
                </div>
            </div>
            <!-- PHQ-9 -->
            <div class="border rounded-md mt-4">
                <div class="section-header p-2 bg-yellow-50 hover:bg-yellow-100" onclick="toggleAccordion(this)">
                <h5 class="font-semibold text-sm text-yellow-800">Cuestionario de Depresión (PHQ-9)</h5>
                <svg class="w-5 h-5 transform transition-transform text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                <div class="p-3 hidden text-xs">
                <div class="space-y-2">
                    <label class="form-label block">Poco interés o alegría</label> <select name="app_phq9_q1" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block">Decaído, deprimido o desesperanzado</label> <select name="app_phq9_q2" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block">Problemas para dormir</label> <select name="app_phq9_q3" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block">Cansancio o poca energía</label> <select name="app_phq9_q4" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block">Poco apetito o comer demasiado</label> <select name="app_phq9_q5" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block">Sentirse mal consigo mismo</label> <select name="app_phq9_q6" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block">Problemas para concentrarse</label> <select name="app_phq9_q7" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block">Moverse o hablar lento, o estar inquieto</label> <select name="app_phq9_q8" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block">Pensamientos de querer hacerse daño</label> <select name="app_phq9_q9" class="form-select text-xs" data-list="frecuencia_gad7_phq9"></select>
                    <label class="form-label block mt-2">Puntuación:</label> <input type="text" name="app_phq9_score" class="form-input bg-gray-200" readonly>
                    <label class="form-label block mt-2">Interpretación:</label> <textarea name="app_phq9_interpretacion" class="form-textarea" rows="2"></textarea>
                </div>
                </div>
            </div>
            <!-- Yesavage -->
            <div class="border rounded-md mt-4">
                <div class="section-header p-2 bg-yellow-50 hover:bg-yellow-100" onclick="toggleAccordion(this)">
                    <h5 class="font-semibold text-sm text-yellow-800">Escala de Depresión Geriátrica (GDS-15)</h5>
                    <svg class="w-5 h-5 transform transition-transform text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                <div class="p-3 hidden text-xs"> <div class="space-y-2">
                    <label class="form-label block">¿Está satisfecho con su vida?</label> <select name="app_gds15_q1" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block">¿Ha abandonado actividades?</label> <select name="app_gds15_q2" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block">¿Siente que su vida está vacía?</label> <select name="app_gds15_q3" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block">¿Se encuentra aburrido?</label> <select name="app_gds15_q4" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block">¿Está alegre la mayor parte del tiempo?</label> <select name="app_gds15_q5" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block">¿Teme que le suceda algo malo?</label> <select name="app_gds15_q6" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block">¿Se siente feliz la mayor parte del tiempo?</label> <select name="app_gds15_q7" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block">¿Se siente desamparado?</label> <select name="app_gds15_q8" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block">¿Prefiere quedarse en casa?</label> <select name="app_gds15_q9" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block">¿Siente que tiene más problemas de memoria?</label> <select name="app_gds15_q10" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block">¿Piensa que es maravilloso estar vivo?</label> <select name="app_gds15_q11" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block">¿Se siente inútil o despreciable?</label> <select name="app_gds15_q12" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block">¿Se siente lleno de energía?</label> <select name="app_gds15_q13" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block">¿Se encuentra sin esperanza?</label> <select name="app_gds15_q14" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block">¿Piensa que la mayoría está mejor?</label> <select name="app_gds15_q15" class="form-select text-xs" data-list="opciones_binarias"></select>
                    <label class="form-label block mt-2">Puntuación:</label> <input type="text" name="app_gds15_score" class="form-input bg-gray-200" readonly>
                    <label class="form-label block mt-2">Interpretación:</label> <textarea name="app_gds15_interpretacion" class="form-textarea" rows="2"></textarea>
                </div></div>
            </div>`
        };
        
        let html = '';
        chronicDiseasesConfig.forEach(system => {
            let diseasesHtml = '';
            system.diseases.forEach(disease => {
            let detailFields = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                ${disease.isOther ? `<div class="md:col-span-3"><label class="form-label">Especificar</label><textarea name="app_${disease.id}_especificar" class="form-textarea" rows="1"></textarea></div>` : ''}
                <div><label class="form-label">Edad/Año de diagnóstico</label><input type="text" name="app_${disease.id}_dx_edad" class="form-input"></div>
                <div><label class="form-label">Tratamientos previos</label><input type="text" name="app_${disease.id}_tx_previo" class="form-input"></div>
                <div><label class="form-label">Tratamiento actual</label><input type="text" name="app_${disease.id}_tx_actual" class="form-input"></div>
                <div class="md:col-span-2"><label class="form-label">Evolución</label><input type="text" name="app_${disease.id}_evolucion" class="form-input"></div>
                <div><label class="form-label">Complicaciones</label><input type="text" name="app_${disease.id}_complicaciones" class="form-input"></div>
                </div>
                ${disease.questionnaire ? questionnairesHTML[disease.questionnaire] || '' : ''}
            `;
            
            let subDiseasesHtml = '';
            if(disease.subDiseases) {
                subDiseasesHtml = disease.subDiseases.map(sub => `
                    <div class="pl-4">
                        <label class="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" name="app_${sub.toLowerCase()}_presente" class="form-checkbox h-4 w-4 text-cyan-500 rounded">
                            <span class="font-normal text-gray-600">${sub}</span>
                        </label>
                    </div>
                `).join('');
            }

            diseasesHtml += `
                <div class="disease-row border-t pt-3">
                <label class="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" name="app_${disease.id}_presente" class="form-checkbox h-5 w-5 text-cyan-600 rounded" onclick="toggleContent(this)">
                    <span class="font-medium text-gray-800">${disease.name}</span>
                </label>
                ${subDiseasesHtml}
                <div class="disease-details hidden pl-8 pt-2">
                    ${detailFields}
                </div>
                </div>`;
            });

            html += `
            <div class="border rounded-md">
                <div class="section-header p-2 bg-gray-50 hover:bg-gray-100" onclick="toggleAccordion(this)">
                <h4 class="font-semibold text-gray-700">${system.name}</h4>
                <svg class="w-5 h-5 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                <div class="p-4 hidden">
                <div class="space-y-4">
                    ${diseasesHtml}
                </div>
                </div>
            </div>`;
        });

        container.innerHTML = html;
    }


    function populateForm(data) {
        clearForm();
        if (!data || !data.demographics) {
            showNotification("Error: Respuesta inesperada del servidor.", "error");
            return;
        }
        
        currentPatientId = data.demographics.id;

        const demographics = data.demographics;
        for (const key in demographics) {
            const element = document.getElementById(key);
            if (element) {
                 element.value = demographics[key];
            }
        }
        
        const fechaConsultaInput = document.getElementById('fecha_consulta');
        if (fechaConsultaInput) {
            fechaConsultaInput.value = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }

        const history = data.history || [];
        
        renderHistoryTables(history);

        const historyAreas = document.querySelectorAll('[data-history-for]');
        historyAreas.forEach(area => {
            const fieldName = area.dataset.historyFor;
            if (fieldName === 'laboratorio_historial' || fieldName === 'gabinete_historial') {
                return; 
            }
            let historyContent = '';
            history.forEach(consult => {
                if (consult.data[fieldName]) {
                    const consultDate = new Date(consult.date).toLocaleDateString('es-MX', {day: '2-digit', month: '2-digit', year: 'numeric'});
                    historyContent += `${consultDate}: ${consult.data[fieldName]}\n`;
                }
            });
            area.value = historyContent || 'Sin historial registrado para este campo.';
        });

        const latestValues = {};
        history.forEach(consult => {
            Object.assign(latestValues, consult.data);
        });
        
        for(const field in latestValues){
            const inputElement = document.querySelector(`[name="${field}"]`);
            if(inputElement){
                if(inputElement.type === 'checkbox'){
                    inputElement.checked = latestValues[field] === 'Sí' || latestValues[field] === 'on';
                } else {
                    inputElement.value = latestValues[field];
                }
            }
        }
    }

    function clearForm() {
        const form = document.getElementById('clinical-record-form');
        if (form) {
            form.querySelectorAll('input:not([id*="-input"]), textarea').forEach(el => el.value = '');
            form.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
            form.querySelectorAll('select').forEach(el => el.selectedIndex = 0);
        }
        currentPatientId = null;
    }
    
    async function saveConsultation() {
        if (!currentPatientId) {
            showNotification('Primero debe cargar un paciente.', 'error');
            return;
        }

        const saveButton = document.getElementById('save-patient-btn');
        const originalButtonText = saveButton.textContent;
        saveButton.innerHTML = '<span class="animate-spin h-5 w-5 border-b-2 border-white rounded-full inline-block"></span> Guardando...';
        saveButton.disabled = true;

        try {
            const form = document.getElementById('clinical-record-form');
            const formData = new FormData(form);
            const dataToSave = {};

            formData.forEach((value, key) => {
                if (dataToSave[key]) {
                    if (!Array.isArray(dataToSave[key])) {
                        dataToSave[key] = [dataToSave[key]];
                    }
                    dataToSave[key].push(value);
                } else {
                    dataToSave[key] = value;
                }
            });
            
             for (const key in dataToSave) {
                if (Array.isArray(dataToSave[key])) {
                    dataToSave[key] = dataToSave[key].join(', ');
                }
            }
            
            form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                if (!dataToSave.hasOwnProperty(checkbox.name)) {
                    dataToSave[checkbox.name] = 'No';
                } else {
                    dataToSave[checkbox.name] = 'Sí';
                }
            });


            const ipaqScore = document.getElementById('apnp_ipaq_score')?.value || 'N/A';
            const ipaqInterpretation = document.getElementById('apnp_ipaq_interpretacion')?.value || 'N/A';
            dataToSave['apnp_ipaq_historial'] = `Puntuación: ${ipaqScore} - ${ipaqInterpretation}`;

            const payload = {
                patientId: currentPatientId,
                specialty: localStorage.getItem('userSpecialty'),
                professionalId: localStorage.getItem('loggedInUser'),
                formData: dataToSave,
            };

            const response = await fetch(`${baseUrl}/.netlify/functions/save-patient-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error del servidor');
            }

            const result = await response.json();
            showNotification(result.message, 'success');
            
            findPatient(currentPatientId, 'id');

        } catch (error) {
            console.error('Error al guardar la consulta:', error);
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            saveButton.innerHTML = originalButtonText;
            saveButton.disabled = false;
        }
    }

    // --- MANEJO DE EVENTOS ---
    function attachEventListeners() {
        document.querySelectorAll('aside a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
            });
        });
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                content.classList.toggle('hidden');
                header.querySelector('svg')?.classList.toggle('rotate-180');
            });
        });
        document.getElementById('search-by-id-btn')?.addEventListener('click', () => {
            const patientId = document.getElementById('patient-id-input').value;
            findPatient(patientId, 'id');
        });
        document.getElementById('search-by-name-btn')?.addEventListener('click', () => {
            const patientName = document.getElementById('patient-name-input').value;
            findPatient(patientName, 'name');
        });
        document.getElementById('save-patient-btn')?.addEventListener('click', saveConsultation);
        
        // --- PARTE C: LLAMADA A LA FUNCIÓN DE INICIALIZACIÓN ---
        // Se llama a la nueva función aquí para construir el HTML de la sección 3.
        initializePatologicosComponent();
        
        // Se llama a loadDropdowns después para que pueda poblar los nuevos <select> creados.
        loadDropdowns();

        const intensityMap = { 'Cargar peso liviano': 'Leve', 'Tai chi': 'Moderada', 'Tenis': 'Moderada', 'Bicicleta a ritmo leve': 'Moderada', 'Baile': 'Moderada', 'Basketball': 'Vigorosa', 'Bicicleta a ritmo moderado o rápido': 'Vigorosa', 'Correr': 'Vigorosa', 'Ejercicio aeróbico': 'Vigorosa', 'Fronton/Padel': 'Vigorosa', 'Fútbol': 'Vigorosa', 'Natación': 'Vigorosa', 'Peso pesado': 'Vigorosa', 'Trotar': 'Vigorosa', 'Caminata': 'Leve', 'Ninguna': 'Ninguna' };
        const ipaqMultiplier = { 'Vigorosa': 8, 'Moderada': 4, 'Leve': 0, 'Ninguna': 0 };

        function updateIpaqScore() {
            let totalScore = 0;
            for (let i = 1; i <= 5; i++) {
                const intensidad = document.getElementById(`apnp_actividad_intensidad_${i}`)?.value;
                const dias = parseFloat(document.querySelector(`[name="apnp_actividad_dias_${i}"]`)?.value) || 0;
                const minutos = parseFloat(document.getElementById(`apnp_actividad_minutos_${i}`)?.value) || 0;
                const multiplier = ipaqMultiplier[intensidad] || 0;
                totalScore += (dias * minutos) * multiplier;
            }
            const scoreInput = document.getElementById('apnp_ipaq_score');
            const interpretationInput = document.getElementById('apnp_ipaq_interpretacion');
            if (scoreInput) scoreInput.value = totalScore;
            if (interpretationInput) {
                if (totalScore < 163) {
                    interpretationInput.value = "Nivel Bajo o Inactivo: El paciente tiene un nivel de actividad física insuficiente, lo que puede considerarse un estilo de vida sedentario. Es el grupo que probablemente más se beneficie de una intervención de fisioterapia para aumentar su actividad.";
                } else if (totalScore >= 163 && totalScore < 1500) {
                    interpretationInput.value = "Nivel Moderado: El paciente cumple con las recomendaciones mínimas de actividad física para obtener beneficios para la salud.";
                } else {
                    interpretationInput.value = "Nivel Alto: El paciente realiza un nivel de actividad física que supera considerablemente las recomendaciones de salud.";
                }
            }
        }

        for (let i = 1; i <= 5; i++) {
            const horasInput = document.getElementById(`apnp_actividad_horas_${i}`);
            const minutosInput = document.getElementById(`apnp_actividad_minutos_${i}`);
            const actividadSelect = document.querySelector(`[name="apnp_actividad_nombre_${i}"]`);
            const intensidadInput = document.getElementById(`apnp_actividad_intensidad_${i}`);
            const diasInput = document.querySelector(`[name="apnp_actividad_dias_${i}"]`);
            if (horasInput && minutosInput) {
                horasInput.addEventListener('input', () => {
                    const horas = parseFloat(horasInput.value);
                    minutosInput.value = !isNaN(horas) ? horas * 60 : '';
                    updateIpaqScore();
                });
            }
            if (actividadSelect && intensidadInput) {
                actividadSelect.addEventListener('change', () => {
                    const selectedActivity = actividadSelect.value;
                    intensidadInput.value = intensityMap[selectedActivity] || '';
                    updateIpaqScore();
                });
            }
            if(diasInput) {
                diasInput.addEventListener('input', updateIpaqScore);
            }
        }
        updateIpaqScore();

        const scoreMapAlimentacion = { '≤3 veces/semana': 0, '3-6 veces/semana': 1, '≥4 veces/semana': 2 };
        const cribadoFields = [ 'frutasyverduras', 'pescadopollo', 'granos', 'procesados' ];

        function updateAlimentacionScore() {
            let totalScore = 0;
            cribadoFields.forEach(field => {
                const select = document.querySelector(`[name="apnp_cribado_${field}_freq"]`);
                const scoreInput = document.querySelector(`[name="apnp_cribado_${field}_puntuacion"]`);
                
                if (select && scoreInput) {
                    const selectedValue = select.value;
                    const score = scoreMapAlimentacion[selectedValue] ?? 0;
                    scoreInput.value = score;
                    totalScore += score;
                }
            });

            const resultadoInput = document.getElementById('apnp_cribado_resultado');
            if (resultadoInput) {
                let interpretation = '';
                if (totalScore <= 2) { interpretation = 'Bajo consumo saludable'; }
                else if (totalScore >= 3 && totalScore <= 5) { interpretation = 'Moderado consumo saludable'; }
                else { interpretation = 'Alto consumo saludable'; }
                resultadoInput.value = `Puntuación Total: ${totalScore} - ${interpretation}`;
            }
        }

        cribadoFields.forEach(field => {
            const select = document.querySelector(`[name="apnp_cribado_${field}_freq"]`);
            if (select) {
                select.addEventListener('change', updateAlimentacionScore);
            }
        });
        updateAlimentacionScore();
    }


    async function loadDropdowns() {
        try {
            const response = await fetch(`${baseUrl}/.netlify/functions/get-dropdown-lists`);
            if (!response.ok) throw new Error('No se pudieron cargar las listas desplegables.');
            
            const lists = await response.json();
            
            for (const listName in lists) {
                const selectElements = document.querySelectorAll(`select[data-list="${listName}"]`);
                selectElements.forEach(select => {
                    const options = lists[listName];
                    select.innerHTML = '<option value="">Seleccione para añadir...</option>';
                    options.forEach(option => {
                        select.innerHTML += `<option value="${option}">${option}</option>`;
                    });
                });
            }
        } catch (error) {
            console.error('Error al cargar listas desplegables:', error);
            showNotification(error.message, 'error');
        }
    }
        
    function showNotification(message, type = 'success') {
        const toast = document.getElementById('notification-toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = 'fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white font-semibold z-50';
        toast.classList.add(type === 'success' ? 'bg-green-500' : 'bg-red-500');
        
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
        }, 3000);
    }
    
    // --- INICIAR LA APP ---
    init();
});
