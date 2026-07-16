// Google Analytics 4 Data API — Vercel Serverless Function
const { google } = require('googleapis');
const { getAuth } = require('../../lib/google-auth');

const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const auth = getAuth(SCOPES);
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });

    const { propertyId, startDate, endDate, metrics, dimensions, limit } = req.query;

    if (!propertyId) {
      return res.status(400).json({ error: 'propertyId is required' });
    }

    const defStart = '30daysAgo';
    const defEnd = 'today';

    const response = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: startDate || defStart, endDate: endDate || defEnd }],
        metrics: metrics
          ? metrics.split(',').map(m => ({ name: m.trim() }))
          : [
              { name: 'sessions' },
              { name: 'totalUsers' },
              { name: 'newUsers' },
              { name: 'screenPageViews' },
              { name: 'conversions' },
              { name: 'totalRevenue' },
              { name: 'itemRevenue' },
              { name: 'purchaseRevenue' },
            ],
        dimensions: dimensions
          ? dimensions.split(',').map(d => ({ name: d.trim() }))
          : [{ name: 'date' }],
        limit: parseInt(limit || '10000'),
        returnPropertyQuota: true,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('GA4 API Error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data || null });
  }
};
