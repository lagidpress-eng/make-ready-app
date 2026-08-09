const { google } = require('googleapis');
const stream = require('stream');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Только POST запросы' });

  try {
    const { pole, map, pt, status, imageBase64, mimeType } = req.body;

    // Авторизация по Email и ID таблицы (без секретных файлов и ключей!)
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
    });

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    let photoLink = 'Нет фото';

    if (imageBase64) {
      const buffer = Buffer.from(imageBase64.split(',')[1], 'base64');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(buffer);

      const fileMetadata = { name: `Pole_${pole}_Photo`, parents: [process.env.FOLDER_ID] };
      const media = { mimeType: mimeType || 'image/jpeg', body: bufferStream };

      const driveRes = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink'
      });
      photoLink = driveRes.data.webViewLink;
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['SUT-JB2109029-C-6-P', pole, map, pt, 'COMCAST COMMUNICATIONS', status, photoLink]]
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
