// GA4 funnel report
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
    return new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] });
  }

  throw new Error('No auth configured');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const auth = getAuth();
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
    const { propertyId, startDate, endDate, dimension } = req.query;

    if (!propertyId) {
      return res.status(400).json({ error: 'propertyId is required' });
    }

    // Compatible metrics that are available on epicvin.com
    const d = dimension || 'date';
    
    // Get sessions, users, pageviews, events
    const baseMetrics = {
      dateRanges: [{ startDate: startDate || '30daysAgo', endDate: endDate || 'today' }],
      metrics: [
        { name: 'sessions' }, { name: 'totalUsers' },
        { name: 'screenPageViews' }, { name: 'eventCount' },
        { name: 'conversions' }, { name: 'totalRevenue' },
      ],
      dimensions: [{ name: d }],
      limit: 25000,
    };

    const response = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: baseMetrics,
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('GA4 Funnel API Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
