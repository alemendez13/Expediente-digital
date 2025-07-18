document.addEventListener('DOMContentLoaded', () => {
    // --- DEFINICIÓN DE VISTAS Y ESTADO GLOBAL ---
    const views = {
        hub: document.getElementById('view-hub'),
        clinicalRecord: document.getElementById('view-clinical-record')
    };
    const professionalFooter = document.getElementById('professional-footer');
    const profNameEl = document.getElementById('prof-name');
    const profCedulaEl = document.getElementById('prof-cedula');
    
    const professionalInfo = {
        medicina: { nombre: 'Dra. Alejandra Méndez Pérez', cedula: '5052492' },
        psicologia: { nombre: 'Lic. Gabriel Alejandro Pérez Ruíz', cedula: 'CEDULA_PSIC' },
        nutricion: { nombre: 'Lic. en Nutrición', cedula: 'CEDULA_NUTRI' },
        fisioterapia: { nombre: 'Lic. en Fisioterapia', cedula: 'CEDULA_FISIO' },
    };

    let currentPatientId = null; 
    let currentSpecialty = null; 
    const baseUrl = ''; // Para Netlify, la URL base es la raíz

    // --- NAVEGACIÓN Y CARGA DE VISTAS ---
    function showView(viewName) {
        Object.values(views).forEach(view => view.classList.add('hidden'));
        if (views[viewName]) views[viewName].classList.remove('hidden');
        professionalFooter.classList.toggle('hidden', viewName === 'hub');
    }

    async function loadView(area) {
        try {
            const response = await fetch(`./views/${area}.html`);
            if (!response.ok) throw new Error(`La historia clínica para '${area}' aún no ha sido creada.`);
            
            const html = await response.text();
            views.clinicalRecord.innerHTML = html;

            // CORRECCIÓN: Establecer la fecha de la consulta dinámicamente
            const fechaConsultaInput = document.getElementById('fecha_consulta');
            if (fechaConsultaInput) {
                fechaConsultaInput.value = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
            }
            
            attachEventListeners(area);
            loadDropdowns();
            showView('clinicalRecord');

        } catch (error) {
            console.error('Error al cargar la vista:', error);
            showNotification(error.message, 'error');
            showView('hub');
        }
    }
    
    document.querySelectorAll('.hub-button[data-view]').forEach(button => {
        button.addEventListener('click', (e) => {
            const area = e.currentTarget.dataset.view;
            if(!area) return;
            currentSpecialty = area;
            profNameEl.textContent = professionalInfo[area].nombre;
            profCedulaEl.textContent = professionalInfo[area].cedula;
            loadView(area);
        });
    });

    // --- LÓGICA DE LA API (FUNCIONES COMUNES) ---
    async function findPatient(patientId) {
        const searchButton = document.getElementById('search-patient-btn');
        const searchInput = document.getElementById('patient-search-input');
        if (!searchButton || !searchInput) return;

        const originalButtonText = searchButton.innerHTML;
        searchButton.innerHTML = '<span class="animate-spin h-5 w-5 border-b-2 border-white rounded-full inline-block"></span>';
        searchButton.disabled = true;
        searchInput.disabled = true;

        try {
            const response = await fetch(`${baseUrl}/.netlify/functions/get-patient-data?id=${patientId}`);
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

    async function loadDropdowns() {
        try {
            const response = await fetch(`${baseUrl}/.netlify/functions/get-dropdown-lists`);
            if (!response.ok) throw new Error('No se pudieron cargar las listas desplegables.');
            
            const lists = await response.json();
            
            for (const listName in lists) {
                const selectElements = document.querySelectorAll(`select[data-list="${listName}"]`);
                selectElements.forEach(select => {
                    const options = lists[listName];
                    const currentValue = select.value; // Guardar valor actual si existe
                    select.innerHTML = '<option value="">Seleccione...</option>';
                    options.forEach(option => {
                        select.innerHTML += `<option value="${option}">${option}</option>`;
                    });
                    if (currentValue) {
                        select.value = currentValue; // Restaurar valor si es posible
                    }
                });
            }
        } catch (error) {
            console.error('Error al cargar listas desplegables:', error);
            showNotification(error.message, 'error');
        }
    }

    async function saveConsultation() {
        if (!currentPatientId) {
            showNotification('Primero debe buscar y cargar un paciente.', 'error');
            return;
        }

        const saveButton = document.getElementById('save-patient-btn');
        const originalButtonText = saveButton.innerHTML;
        saveButton.innerHTML = 'Guardando...';
        saveButton.disabled = true;

        try {
            const form = document.getElementById('clinical-record-form');
            const formData = new FormData(form);
            const dataToSave = {};

            for (let [key, value] of formData.entries()) {
                const element = document.querySelector(`[name="${key}"]`);
                 if (element && element.type === 'checkbox') {
                     dataToSave[key] = element.checked ? 'Sí' : 'No';
                } else {
                    dataToSave[key] = value;
                }
            }
            
            form.querySelectorAll('input[type="checkbox"]:not(:checked)').forEach(cb => {
                dataToSave[cb.name] = 'No';
            });

            const payload = {
                patientId: currentPatientId,
                specialty: currentSpecialty,
                professionalId: professionalInfo[currentSpecialty].cedula,
                formData: dataToSave
            };

            const response = await fetch(`${baseUrl}/.netlify/functions/save-patient-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status}`);
            }

            const result = await response.json();
            showNotification(result.message, 'success');
            clearForm();

        } catch (error) {
            console.error('Error al guardar consulta:', error);
            showNotification(`Error al guardar: ${error.message}`, 'error');
        } finally {
            saveButton.innerHTML = originalButtonText;
            saveButton.disabled = false;
        }
    }
    
    function populateForm(data) {
        clearForm();

        if (!data || !data.demographics) {
            console.error("Datos recibidos no tienen la estructura esperada:", data);
            showNotification("Error: Respuesta inesperada del servidor.", "error");
            currentPatientId = null;
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
        
        const history = data.history || [];
        
        const historyFields = document.querySelectorAll('[data-history-for]');
        historyFields.forEach(historyArea => {
            const fieldName = historyArea.dataset.historyFor;
            let historyContent = '';
            history.forEach(consult => {
                if (consult.data[fieldName]) {
                    const consultDate = new Date(consult.date).toLocaleDateString('es-MX');
                    historyContent += `${consultDate}: ${consult.data[fieldName]}\n`;
                }
            });
            historyArea.value = historyContent || 'Sin historial registrado.';
        });

        const latestValues = {};
        history.forEach(consult => {
            Object.assign(latestValues, consult.data);
        });
        
        for(const field in latestValues){
            const inputElement = document.querySelector(`[name="${field}"]`);
            if(inputElement){
                if(inputElement.type === 'checkbox'){
                    inputElement.checked = latestValues[field] === 'Sí';
                } else {
                    inputElement.value = latestValues[field];
                }
            }
        }
    }

    function clearForm() {
        const form = document.getElementById('clinical-record-form');
        if (form) {
            form.reset();
            document.querySelectorAll('input[readonly], textarea[readonly]').forEach(el => {
                if(el.id !== 'fecha_consulta') { // No borrar la fecha de consulta
                    el.value = '';
                }
            });
            const searchInput = document.getElementById('patient-search-input');
            if(searchInput) searchInput.value = '';
            currentPatientId = null;
        }
    }

    // --- MANEJO DE EVENTOS ---
    function attachEventListeners(area) {
        document.getElementById('btn-back-to-hub')?.addEventListener('click', () => showView('hub'));
        document.getElementById('search-patient-btn')?.addEventListener('click', () => {
            const patientId = document.getElementById('patient-search-input').value;
            if (patientId) findPatient(patientId);
            else showNotification('Por favor, ingrese un ID de paciente.', 'error');
        });
        document.getElementById('save-patient-btn')?.addEventListener('click', saveConsultation);
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                header.nextElementSibling.classList.toggle('hidden');
                header.querySelector('svg')?.classList.toggle('rotate-180');
            });
        });
        document.querySelectorAll('aside a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    function showNotification(message, type = 'success') {
        const toast = document.getElementById('notification-toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = 'show';
        toast.classList.add(type);
        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
        }, 3000);
    }
    
    // --- INICIO DE LA APLICACIÓN ---
    showView('hub');
});
