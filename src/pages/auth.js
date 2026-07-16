export default function AuthPage() {
  const clientId = '647980736300-o075jomvb4rmsbele1e7h2oj7s5ubnk1.apps.googleusercontent.com';
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: 'https://epicvin-dash.vercel.app/api/oauth-callback',
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly',
    access_type: 'offline',
    prompt: 'consent',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 8px' }}>EpicVIN Dashboard</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 24px', fontSize: '14px' }}>
          Connect Google Search Console + Analytics
        </p>
        <a href={authUrl}
          style={{
            display: 'inline-block',
            background: '#0ea5e9',
            color: 'white',
            textDecoration: 'none',
            padding: '14px 32px',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
          }}>
          🔑 Authorize Google Access
        </a>
        <p style={{ color: '#64748b', marginTop: '20px', fontSize: '12px' }}>
          You'll be redirected to Google to grant access to GSC + GA4 data.
          <br />After authorization, copy the token and send it to the bot.
        </p>
      </div>
    </div>
  );
}
