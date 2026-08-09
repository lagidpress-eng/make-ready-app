const { google } = require('googleapis');
const stream = require('stream');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Только POST запросы' });

  try {
    const { pole, map, pt, status, imageBase64, mimeType } = req.body;

    const privateKey = process.env.GOOGLE_KEY.replace(/\\n/g, '\n');

    // Настраиваем авторизацию с делегированием прав
    const auth = new google.auth.JWT(
      process.env.GOOGLE_EMAIL,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'],
      'ВАША_ЛИЧНАЯ_ПОЧТА@gmail.com' // <--- ВСТАВЬТЕ СЮДА ВАШ ЛИЧНЫЙ EMAIL
    );

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    // Загрузка файла в ВАШЕ пространство
    const buffer = Buffer.from(imageBase64.split(',')[1], 'base64');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const fileMetadata = { 
      name: `Pole_${pole}_${Date.now()}.jpg`, 
      parents: [process.env.FOLDER_ID] 
    };
    
    const driveRes = await drive.files.create({
      resource: fileMetadata,
      media: { mimeType: mimeType || 'image/jpeg', body: bufferStream },
      fields: 'id, webViewLink'
    });

    // Запись в таблицу
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['SUT-JB2109029-C-6-P', pole, map, pt, 'COMCAST COMMUNICATIONS', status, driveRes.data.webViewLink]] }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
