// Google Search Console API — Vercel Serverless Function
// Google Service Account JSON берётся из VERCEL_SECRET_GOOGLE_CREDENTIALS
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

function getAuthClient() {
  const credentials = JSON.parse(process.env.VERCEL_SECRET_GOOGLE_CREDENTIALS || '{}');
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
  return auth;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const auth = getAuthClient();
    const webmasters = google.webmasters({ version: 'v3', auth });

    const { siteUrl, startDate, endDate, dimensions } = req.query;

    if (!siteUrl) {
      return res.status(400).json({ error: 'siteUrl is required' });
    }

    const defStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defEnd = new Date().toISOString().split('T')[0];

    const response = await webmasters.searchanalytics.query({
      siteUrl: siteUrl,
      requestBody: {
        startDate: startDate || defStart,
        endDate: endDate || defEnd,
        dimensions: dimensions ? dimensions.split(',') : ['date'],
        rowLimit: 25000,
        aggregationType: 'auto',
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('GSC API Error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data || null });
  }
};
