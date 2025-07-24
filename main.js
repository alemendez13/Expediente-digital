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

    function populateForm(data) {
        clearForm();
        if (!data || !data.demographics) {
            showNotification("Error: Respuesta inesperada del servidor.", "error");
            return;
        }
        
        currentPatientId = data.demographics.id;

        // 1. Poblar campos de la ficha de identificación (demográficos)
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

        // 2. Procesar y mostrar el historial clínico
        const history = data.history || [];
        
        // Poblar las áreas de historial (textareas)
        const historyAreas = document.querySelectorAll('[data-history-for]');
        historyAreas.forEach(area => {
            const fieldName = area.dataset.historyFor;
            let historyContent = '';
            history.forEach(consult => {
                if (consult.data[fieldName]) {
                    // Formatear la fecha para que sea legible
                    const consultDate = new Date(consult.date).toLocaleDateString('es-MX', {day: '2-digit', month: '2-digit', year: 'numeric'});
                    historyContent += `${consultDate}: ${consult.data[fieldName]}\n`;
                }
            });
            area.value = historyContent || 'Sin historial registrado para este campo.';
        });

        // 3. Poblar los campos de registro con el valor más reciente del historial
        const latestValues = {};
        history.forEach(consult => {
            // Se sobreescriben los valores con los de la consulta más reciente
            Object.assign(latestValues, consult.data);
        });
        
        for(const field in latestValues){
            const inputElement = document.querySelector(`[name="${field}"]`);
            if(inputElement){
                if(inputElement.type === 'checkbox'){
                    inputElement.checked = latestValues[field] === 'Sí';
                } else if (inputElement.tagName.toLowerCase() !== 'select') {
                    // No establecer el valor para selects, ya que son para añadir nuevos padecimientos
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
       showNotification('Función de guardado pendiente de conectar.', 'success');
    }

    // --- MANEJO DE EVENTOS ---
    function attachEventListeners() {
        // Navegación del menú lateral
        document.querySelectorAll('aside a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Acordeones de secciones
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                content.classList.toggle('hidden');
                header.querySelector('svg')?.classList.toggle('rotate-180');
            });
        });
        
        // Botones de búsqueda
        document.getElementById('search-by-id-btn')?.addEventListener('click', () => {
             const patientId = document.getElementById('patient-id-input').value;
             findPatient(patientId, 'id');
        });
        
        document.getElementById('search-by-name-btn')?.addEventListener('click', () => {
             const patientName = document.getElementById('patient-name-input').value;
             findPatient(patientName, 'name');
        });

        // Botón de guardado
        document.getElementById('save-patient-btn')?.addEventListener('click', saveConsultation);

        // Cargar listas desplegables
        loadDropdowns();

        // --- AJUSTE AÑADIDO AQUÍ: Lógica para cálculos automáticos en las 5 filas ---
        
        // Mapa de intensidad de actividades (basado en tu documento)
        const intensityMap = {
            'Cargar peso liviano': 'Leve',
            'Tai chi': 'Moderada',
            'Tenis': 'Moderada',
            'Bicicleta a ritmo leve': 'Moderada',
            'Baile': 'Moderada',
            'Basketball': 'Vigorosa',
            'Bicicleta a ritmo moderado o rápido': 'Vigorosa',
            'Correr': 'Vigorosa',
            'Ejercicio aeróbico': 'Vigorosa',
            'Fronton/Padel': 'Vigorosa',
            'Fútbol': 'Vigorosa',
            'Natación': 'Vigorosa',
            'Peso pesado': 'Vigorosa',
            'Trotar': 'Vigorosa',
            'Caminata': 'Leve',
            'Ninguna': 'Ninguna'
        };

        // Itera sobre las 5 filas de actividad física
        for (let i = 1; i <= 5; i++) {
            const horasInput = document.getElementById(`apnp_actividad_horas_${i}`);
            const minutosInput = document.getElementById(`apnp_actividad_minutos_${i}`);
            const actividadSelect = document.querySelector(`[name="apnp_actividad_nombre_${i}"]`);
            const intensidadInput = document.getElementById(`apnp_actividad_intensidad_${i}`);

            // 1. Lógica para el cálculo de minutos
            if (horasInput && minutosInput) {
                horasInput.addEventListener('input', (e) => {
                    const horas = parseFloat(e.target.value);
                    minutosInput.value = !isNaN(horas) ? horas * 60 : '';
                });
            }

            // 2. Lógica para autocompletar la intensidad
            if (actividadSelect && intensidadInput) {
                actividadSelect.addEventListener('change', (e) => {
                    const selectedActivity = e.target.value;
                    intensidadInput.value = intensityMap[selectedActivity] || '';
                });
            }
        }
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
                    select.innerHTML = '<option value="">Seleccione para añadir...</option>'; // Texto más claro
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
