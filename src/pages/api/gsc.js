// Google Search Console API
const { google } = require('googleapis');

function getAuth() {
  const oauthToken = process.env.VERCEL_OAUTH_TOKEN;
  const serviceAccount = process.env.VERCEL_SECRET_GOOGLE_CREDENTIALS;

  if (oauthToken) {
    const tokens = JSON.parse(oauthToken);
    const oauth2Client = new google.auth.OAuth2(
      process.env.VERCEL_OAUTH_CLIENT_ID,
      process.env.VERCEL_OAUTH_CLIENT_SECRET
    );
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
  }

  if (serviceAccount) {
    const credentials = JSON.parse(serviceAccount);
    return new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
  }

  throw new Error('No auth configured');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const auth = getAuth();
    const webmasters = google.webmasters({ version: 'v3', auth });

    const { siteUrl, startDate, endDate, dimensions, branded } = req.query;

    if (!siteUrl) {
      return res.status(400).json({ error: 'siteUrl is required' });
    }

    const defStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defEnd = new Date().toISOString().split('T')[0];

    const requestBody = {
      startDate: startDate || defStart,
      endDate: endDate || defEnd,
      dimensions: dimensions ? dimensions.split(',') : ['date'],
      rowLimit: 25000,
      aggregationType: 'auto',
    };

    // Branded / non-branded filter
    if (branded === 'branded' || branded === 'nonbranded') {
      const brandRegex = 'epicvin|epic vin|epicvin\\.com';
      requestBody.dimensionFilterGroups = [{
        filters: [{
          dimension: 'query',
          expression: brandRegex,
          operator: branded === 'branded' ? 'includingRegex' : 'excludingRegex',
        }],
      }];
    }

    const response = await webmasters.searchanalytics.query({
      siteUrl,
      requestBody,
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('GSC API Error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data || null });
  }
};
