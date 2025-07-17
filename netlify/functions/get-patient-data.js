const { google } = require('googleapis');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const patientId = event.queryStringParameters.id;
    if (!patientId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Falta el ID del paciente' }) };
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID_PATIENTS;

    // --- PASO 1: OBTENER DATOS DEMOGRÁFICOS (YA FUNCIONA) ---
    const patientResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Pacientes!A:P' });
    const patientRows = patientResponse.data.values || [];
    const patientHeaders = ["id", "nombre", "fecha", "convenio", "edad", "origen", "residencia", "nacimiento", "religion", "genero", "escolaridad", "estadoCivil", "ocupacion", "email", "movil", "fijo"];
    const patientRow = patientRows.find(row => row[0] && row[0].toUpperCase() === patientId.toUpperCase());

    if (!patientRow) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Paciente no encontrado' }) };
    }

    const patientDemographics = {};
    patientHeaders.forEach((header, index) => {
      let value = patientRow[index] || '';
      if (header === 'nacimiento' && value) {
        const parts = value.split('/');
        if (parts.length === 3) value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      patientDemographics[header] = value;
    });

    // --- PASO 2: OBTENER TODO EL HISTORIAL DE CONSULTAS (LÓGICA NUEVA) ---
    // Leer todas las consultas y todos los datos clínicos de una vez
    const [consultationsResponse, clinicalDataResponse] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Consultas!A:E' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Datos_Clinicos!A:D' })
    ]);

    // Encontrar las IDs de consulta que pertenecen a este paciente
    const allConsultations = consultationsResponse.data.values || [];
    const patientConsultationIds = allConsultations
      .filter(row => row[1] === patientId) // Filtra por ID_Paciente
      .map(row => ({ id: row[0], date: row[2] })); // Obtiene [ID_Consulta, Fecha]

    const consultationIdSet = new Set(patientConsultationIds.map(c => c.id));

    // Filtrar los datos clínicos que pertenecen a esas consultas
    const allClinicalData = clinicalDataResponse.data.values || [];
    const patientClinicalData = allClinicalData.filter(row => consultationIdSet.has(row[1])); // Filtra por ID_Consulta

    // Agrupar los datos por consulta
    const historyMap = new Map();
    patientConsultationIds.forEach(consult => {
      historyMap.set(consult.id, { date: consult.date, data: {} });
    });

    patientClinicalData.forEach(row => {
      const consultId = row[1];
      const fieldName = row[2];
      const fieldValue = row[3];
      if (historyMap.has(consultId)) {
        historyMap.get(consultId).data[fieldName] = fieldValue;
      }
    });

    const history = Array.from(historyMap.values());

    // --- PASO 3: DEVOLVER EL PAYLOAD COMPLETO ---
    const responsePayload = {
      demographics: patientDemographics,
      history: history // Ahora el historial contiene datos reales
    };

    return {
      statusCode: 200,
      body: JSON.stringify(responsePayload),
    };

  } catch (error) {
    console.error('Error en get-patient-data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Error interno del servidor: ${error.message}` }),
    };
  }
};