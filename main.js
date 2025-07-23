document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO GLOBAL Y AUTENTICACIÓN ---
    const userSpecialty = localStorage.getItem('userSpecialty');
    if (!userSpecialty) {
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
        const professional = clinicalRecordConfig.professionalInfo[userSpecialty];
        if (professional) {
            mainTitle.textContent = `Expediente Clínico - ${userSpecialty.charAt(0).toUpperCase() + userSpecialty.slice(1)}`;
            profNameEl.textContent = professional.nombre;
            profCedulaEl.textContent = professional.cedula;
        }
    }

    function logout() {
        localStorage.removeItem('userSpecialty');
        window.location.href = 'login.html';
    }

    // --- CONSTRUCCIÓN DINÁMICA DEL FORMULARIO ---
    async function buildClinicalRecordForm() {
        try {
            const sections = clinicalRecordConfig.sections;
            const commonComponents = clinicalRecordConfig.components.common;
            const specialtyComponents = clinicalRecordConfig.components.specialty[userSpecialty] || {};

            let formHtml = `
                <div class="flex flex-col lg:flex-row gap-8">
                    <!-- Menú Lateral -->
                    <aside class="w-full lg:w-1/4">
                        <div class="bg-white p-4 rounded-lg shadow-md sticky top-24">
                            <h3 class="font-bold text-lg mb-4">Secciones</h3>
                            <ul class="space-y-2 text-sm">
                                ${sections.map(section => `<li><a href="#section-${section.id}" class="text-gray-700 hover:text-cyan-600 font-semibold">${section.title}</a></li>`).join('')}
                            </ul>
                        </div>
                    </aside>

                    <!-- Contenido Principal -->
                    <main class="w-full lg:w-3/4">
                        <form id="clinical-record-form" onsubmit="return false;">
                            ${await Promise.all(sections.map(async (section) => {
                                const commonComponentPath = commonComponents[section.id];
                                const specialtyComponentPath = specialtyComponents[section.id];
                                let content = '';

                                if (commonComponentPath) {
                                    content += await fetchComponent(commonComponentPath);
                                }
                                if (specialtyComponentPath) {
                                    content += await fetchComponent(specialtyComponentPath);
                                }
                                
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
                            })).join('')}
                            
                            <div class="flex justify-end gap-4 mt-8">
                                <button type="button" id="save-patient-btn" class="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition">Guardar Consulta</button>
                            </div>
                        </form>
                    </main>
                </div>
            `;
            
            clinicalRecordContainer.innerHTML = formHtml;
            attachEventListeners();
            // loadDropdowns(); // Se llamará después si es necesario

        } catch (error) {
            console.error("Error al construir el formulario:", error);
            clinicalRecordContainer.innerHTML = `
                <div class="text-center py-10 bg-red-50 text-red-700 p-4 rounded-lg">
                    <h3 class="font-bold text-lg">¡Oops! Ocurrió un error</h3>
                    <p>No se pudo cargar la estructura del expediente.</p>
                    <p class="text-sm mt-2 font-mono">Detalle: ${error.message}</p>
                </div>
            `;
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

        // Por ahora, solo la búsqueda por ID está implementada en el backend.
        if (searchType === 'name') {
            showNotification('La búsqueda por nombre aún no está implementada.', 'error');
            // Aquí podrías deshabilitar el botón o simplemente no hacer nada.
            return;
        }

        const originalButtonText = searchButton.innerHTML;
        searchButton.innerHTML = '<span class="animate-spin h-5 w-5 border-b-2 border-white rounded-full inline-block"></span>';
        searchButton.disabled = true;
        searchInput.disabled = true;

        try {
            // El backend solo acepta búsqueda por ID por ahora
            const response = await fetch(`${baseUrl}/.netlify/functions/get-patient-data?id=${query}`);
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
            searchButton.innerHTML = "Buscar";
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

        // Poblar campos de la ficha de identificación
        const demographics = data.demographics;
        for (const key in demographics) {
            const element = document.getElementById(key);
            if (element) {
                 element.value = demographics[key];
            }
        }
        // Colocar la fecha actual en el campo de consulta
        const fechaConsultaInput = document.getElementById('fecha_consulta');
        if (fechaConsultaInput) {
            fechaConsultaInput.value = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }
    }

    function clearForm() {
        const form = document.getElementById('clinical-record-form');
        if (form) {
            // Limpiar todos los inputs y textareas excepto los de búsqueda y botones
            form.querySelectorAll('input:not([id*="-input"]), textarea').forEach(el => el.value = '');
            form.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
            form.querySelectorAll('select').forEach(el => el.selectedIndex = 0);
        }
        currentPatientId = null;
    }
    
    async function saveConsultation() {
       // Tu lógica de guardado existente va aquí
       showNotification('Función de guardado pendiente de conectar.', 'success');
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
        
        // Listeners para los botones de búsqueda y guardado
        document.getElementById('search-by-id-btn')?.addEventListener('click', () => {
             const patientId = document.getElementById('patient-id-input').value;
             findPatient(patientId, 'id');
        });
        
        document.getElementById('search-by-name-btn')?.addEventListener('click', () => {
             const patientName = document.getElementById('patient-name-input').value;
             findPatient(patientName, 'name');
        });

        document.getElementById('save-patient-btn')?.addEventListener('click', saveConsultation);
    }
    
    function showNotification(message, type = 'success') {
        const toast = document.getElementById('notification-toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = 'fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white font-semibold z-50'; // Reinicia clases
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
