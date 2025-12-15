import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'AI KPD Klasifikator - AI klasifikacija proizvoda i usluga';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6B9B76 0%, #4A7A56 50%, #3D6B49 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
          }}
        >
          {/* Logo/Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '120px',
              height: '120px',
              borderRadius: '24px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              marginBottom: '32px',
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            AI KPD Klasifikator
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '28px',
              color: 'rgba(255,255,255,0.9)',
              textAlign: 'center',
              maxWidth: '800px',
            }}
          >
            Pronađite točnu KPD šifru za svoju djelatnost pomoću AI-a
          </div>

          {/* Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '40px',
              padding: '12px 24px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <span style={{ color: 'white', fontSize: '20px' }}>
              5.700+ KPD šifri • AI klasifikacija • Fiskalizacija 2.0
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px' }}>
            kpd.2klika.hr
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
