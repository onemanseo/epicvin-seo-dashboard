// GA4 ecommerce metrics — отдельный запрос (itemRevenue несовместим с totalRevenue)
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

const GA4_DIMENSION_MAP = {
  page: 'pagePath',
  query: 'date',
  device: 'deviceCategory',
  country: 'country',
  date: 'date',
};

function mapDimensions(dimensions) {
  if (!dimensions) return [{ name: 'date' }];
  return dimensions.split(',').map(d => {
    const mapped = GA4_DIMENSION_MAP[d.trim()] || d.trim();
    return { name: mapped };
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const auth = getAuth();
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
    const { propertyId, startDate, endDate, dimension, channel } = req.query;

    if (!propertyId) {
      return res.status(400).json({ error: 'propertyId is required' });
    }

    const requestBody = {
      dateRanges: [{ startDate: startDate || '30daysAgo', endDate: endDate || 'today' }],
      metrics: [
        { name: 'itemRevenue' },
        { name: 'itemsPurchased' },
      ],
      dimensions: mapDimensions(dimension ? `${dimension}` : 'date').slice(0, 1),
      limit: 25000,
    };

    if (channel === 'organic') {
      requestBody.dimensionFilter = {
        filter: {
          fieldName: 'sessionPrimaryChannelGroup',
          stringFilter: { value: 'Organic Search', matchType: 'EXACT' },
        },
      };
    }

    const response = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody,
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('GA4 Ecommerce API Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
