const { google } = require('googleapis');

exports.handler = async (event) => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Asume que cada columna en la primera hoja de tu archivo de listas es una lista diferente.
    // La primera fila (A1, B1, C1...) debe ser el nombre de la lista (ej. "enfermedades", "medicamentos").
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID_LISTS,
      range: 'Hoja 1', // CORRECCIÓN: Cambiado de 'Sheet1' a 'Hoja 1'. Verifica que este sea el nombre exacto de tu pestaña.
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return { statusCode: 200, body: JSON.stringify({}) };
    }

    const headers = rows[0];
    const lists = {};

    headers.forEach((header, index) => {
      lists[header] = rows.slice(1).map(row => row[index]).filter(Boolean); // Filtra valores vacíos
    });

    return {
      statusCode: 200,
      body: JSON.stringify(lists),
    };
  } catch (error) {
    console.error('Error en get-dropdown-lists:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error interno del servidor al cargar listas.' }),
    };
  }
};