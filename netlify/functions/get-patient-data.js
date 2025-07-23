const { google } = require('googleapis');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Aceptamos tanto 'id' como 'name' como parámetros de búsqueda.
    const patientId = event.queryStringParameters.id;
    const patientName = event.queryStringParameters.name;

    if (!patientId && !patientName) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Falta el ID o el nombre del paciente para la búsqueda.' }) };
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

    const patientResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Pacientes!A:P' });
    const patientRows = patientResponse.data.values || [];
    
    // Buscamos la fila del paciente ya sea por ID o por nombre.
    let patientRow;
    if (patientId) {
      // Búsqueda por ID (columna A, índice 0)
      patientRow = patientRows.find(row => row[0] && row[0].toUpperCase() === patientId.toUpperCase());
    } else if (patientName) {
      // Búsqueda por Nombre (columna B, índice 1)
      patientRow = patientRows.find(row => row[1] && row[1].toUpperCase() === patientName.toUpperCase());
    }

    if (!patientRow) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Paciente no encontrado' }) };
    }
    
    // El resto de la lógica usa los datos de la fila encontrada.
    const patientHeaders = ["id", "nombre", "fecha", "convenio", "edad", "origen", "residencia", "nacimiento", "religion", "genero", "escolaridad", "estadoCivil", "ocupacion", "email", "movil", "fijo"];
    const patientDemographics = {};
    patientHeaders.forEach((header, index) => {
      let value = patientRow[index] || '';
      if (header === 'nacimiento' && value) {
        const parts = value.split('/');
        if (parts.length === 3) value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      patientDemographics[header] = value;
    });

    // Usamos el ID de la fila encontrada para buscar el historial.
    const foundPatientId = patientDemographics.id;

    const [consultationsResponse, clinicalDataResponse] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Consultas!A:E' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Datos_Clinicos!A:D' })
    ]);

    const allConsultations = consultationsResponse.data.values || [];
    const patientConsultationIds = allConsultations
      .filter(row => row[1] === foundPatientId) // Filtra por el ID encontrado
      .map(row => ({ id: row[0], date: row[2] }));

    const consultationIdSet = new Set(patientConsultationIds.map(c => c.id));
    const allClinicalData = clinicalDataResponse.data.values || [];
    const patientClinicalData = allClinicalData.filter(row => consultationIdSet.has(row[1]));

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

    const responsePayload = {
      demographics: patientDemographics,
      history: history
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
