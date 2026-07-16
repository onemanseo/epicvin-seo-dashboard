// E-commerce funnel report — Vercel Serverless Function
// Запрашивает воронку: sessions → VIN interactions → checkouts → purchases → revenue
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

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
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
    const { propertyId, startDate, endDate, dimension } = req.query;

    if (!propertyId) {
      return res.status(400).json({ error: 'propertyId is required' });
    }

    const dimensionsList = [{ name: dimension || 'date' }];
    const metricsList = [
      { name: 'sessions' },
      { name: 'sessionConversionRate' },       // sessions with key events
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'eventCount' },
      // E-commerce funnel
      { name: 'itemsViewed' },
      { name: 'itemsAddedToCart' },
      { name: 'itemsCheckedOut' },
      { name: 'itemsPurchased' },
      { name: 'itemPurchaseQuantity' },
      { name: 'itemRevenue' },
      { name: 'purchaseRevenue' },
      { name: 'totalRevenue' },
      { name: 'transactions' },
      { name: 'transactionRevenue' },
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
