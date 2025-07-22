document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO GLOBAL Y AUTENTICACIÓN ---
    const userSpecialty = localStorage.getItem('userSpecialty');

    // Si no hay usuario logueado, redirigir a la página de login
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
    const baseUrl = ''; // Para Netlify, la URL base es la raíz

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
                            
                            // Si no hay componente, se puede renderizar un placeholder o nada.
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
                                    <div class="section-content ${section.id === 'ficha-identificacion' ? '' : 'hidden'}">
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
        loadDropdowns();
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


    // --- LÓGICA DE LA API (EXISTENTE, SIN CAMBIOS MAYORES) ---
    // (Aquí irían las funciones findPatient, loadDropdowns, saveConsultation, populateForm, clearForm, showNotification, que ya tienes y funcionan bien)
    // ... (Copia y pega tus funciones existentes aquí, adaptando los IDs si es necesario) ...
    // Por brevedad, se omiten aquí, pero debes incluirlas.
    
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
        
        // Botones principales
        // Es importante usar delegación de eventos o re-adjuntar listeners después de crear el DOM
        document.getElementById('search-patient-btn')?.addEventListener('click', () => {
             const patientId = document.getElementById('patient-search-input').value;
             if (patientId) findPatient(patientId);
             else showNotification('Por favor, ingrese un ID de paciente.', 'error');
        });
        document.getElementById('save-patient-btn')?.addEventListener('click', saveConsultation);
    }
    
    // ... (Aquí el resto de tus funciones auxiliares como showNotification, etc.)
    
    // --- INICIAR LA APP ---
    init();
});
