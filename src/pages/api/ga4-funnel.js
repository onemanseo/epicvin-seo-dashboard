// E-commerce funnel report — Vercel Serverless Function
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const auth = getAuth();
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
    const { propertyId, startDate, endDate, dimension } = req.query;

    if (!propertyId) {
      return res.status(400).json({ error: 'propertyId is required' });
    }

    const dimensionsList = [{ name: dimension || 'date' }];
    const metricsList = [
      { name: 'sessions' }, { name: 'sessionConversionRate' }, { name: 'totalUsers' },
      { name: 'screenPageViews' }, { name: 'itemsViewed' }, { name: 'itemsAddedToCart' },
      { name: 'itemsCheckedOut' }, { name: 'itemsPurchased' }, { name: 'itemPurchaseQuantity' },
      { name: 'itemRevenue' }, { name: 'purchaseRevenue' }, { name: 'totalRevenue' },
      { name: 'transactions' }, { name: 'transactionRevenue' },
    ];

    const response = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: startDate || '30daysAgo', endDate: endDate || 'today' }],
        metrics: metricsList,
        dimensions: dimensionsList,
        limit: 25000,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('GA4 Funnel API Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
