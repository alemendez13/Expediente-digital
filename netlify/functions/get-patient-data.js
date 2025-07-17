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
    
    // 1. Obtener datos demográficos
    const patientResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID_PATIENTS,
      range: 'Pacientes!A:P',
    });

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

    // 2. Obtener historial (aunque aún no se llene, preparamos la estructura)
    //    Esta lógica se completará más adelante.
    const history = [];

    // 3. Devolver la estructura correcta
    const responsePayload = {
        demographics: patientDemographics,
        history: history
    };

    return {
      statusCode: 200,
      body: JSON.stringify(responsePayload), // <-- CAMBIO CLAVE: Se envía el payload completo
    };

  } catch (error) {
    console.error('Error en get-patient-data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error interno del servidor.' }),
    };
  }
};