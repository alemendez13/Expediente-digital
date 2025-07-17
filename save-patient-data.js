const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { patientId, specialty, professionalId, formData } = JSON.parse(event.body);

    if (!patientId || !specialty || !formData) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Faltan datos para guardar la consulta.' }) };
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID_PATIENTS;
    
    const consultationId = uuidv4();
    const consultationDate = new Date().toISOString();
    const newConsultationRow = [[consultationId, patientId, consultationDate, specialty, professionalId]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Consultas!A1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: newConsultationRow },
    });

    const clinicalDataRows = Object.entries(formData).map(([key, value]) => {
        if (value === null || value === '') return null;
        const dataId = uuidv4();
        return [dataId, consultationId, key, value];
    }).filter(Boolean);

    if (clinicalDataRows.length > 0) {
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Datos_Clinicos!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: clinicalDataRows },
        });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Consulta guardada exitosamente.', consultationId }),
    };

  } catch (error) {
    console.error('Error en save-patient-data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error interno del servidor al guardar.' }),
    };
  }
};