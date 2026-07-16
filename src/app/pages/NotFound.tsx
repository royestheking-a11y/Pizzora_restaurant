import { Link } from 'react-router';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ paddingTop: '80px' }}>
      <div className="text-center px-4">
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #F9002B, #F9002B)' }}
        >
          <span style={{ color: 'white', fontSize: '48px', fontFamily: 'var(--font-heading)', fontWeight: 900 }}>404</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '40px', color: '#111', marginBottom: '12px' }}>
          Page Not Found
        </h1>
        <p style={{ color: '#6B7280', fontSize: '16px', maxWidth: '360px', margin: '0 auto 28px', lineHeight: '1.7' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-semibold transition-all hover:shadow-xl hover:-translate-y-1"
          style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
