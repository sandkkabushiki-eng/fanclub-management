import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // セキュリティヘッダーの追加（next.config.tsの設定を補完）
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };

  // すべてのレスポンスにセキュリティヘッダーを追加
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // APIルートでの追加のセキュリティチェック
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // CORS設定（本番環境では特定のオリジンのみ許可）
    const origin = request.headers.get('origin');
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      // 開発環境ではすべてのオリジンを許可
      if (process.env.NODE_ENV === 'production') {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    // APIレート制限の追加チェック（IPベース）
    // 注意: Cloudflareを使用している場合、Cloudflareのレート制限を使用することを推奨
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    
    // ここでIPベースのレート制限を実装することも可能
    // ただし、Cloudflareを使用している場合は不要
  }

  // ログイン試行の監視（オプション）
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/api/auth')) {
    // ログイン試行をログに記録
    // 本番環境では監視サービスに送信
    if (process.env.NODE_ENV === 'production') {
      // 監視サービスへの送信（例: Sentry, LogRocketなど）
    }
  }

  return response;
}

// ミドルウェアを適用するパス
export const config = {
  matcher: [
    /*
     * すべてのリクエストパスにマッチ、ただし以下を除く:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

