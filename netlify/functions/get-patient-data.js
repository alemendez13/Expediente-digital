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
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID_PATIENTS,
      range: 'Pacientes!A2:P',
    });

    const rows = response.data.values || [];
    const headers = ["id", "nombre", "fecha", "convenio", "edad", "origen", "residencia", "nacimiento", "religion", "genero", "escolaridad", "estadoCivil", "ocupacion", "email", "movil", "fijo"];
    const patientRow = rows.find(row => row[0] && row[0].toUpperCase() === patientId.toUpperCase());

    if (!patientRow) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Paciente no encontrado' }) };
    }

    const patientData = {};
    headers.forEach((header, index) => {
      patientData[header] = patientRow[index] || '';
    });

    return {
      statusCode: 200,
      body: JSON.stringify(patientData),
    };
  } catch (error) {
    console.error('Error en get-patient-data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error interno del servidor.' }),
    };
  }
};

