import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ファンリピ - ファンクラブ売上管理システム",
  description: "ファンクラブの売上データを効率的に管理・分析するシステム。CSVアップロード、リアルタイム分析、詳細レポート機能で収益を最大化。",
  keywords: "ファンクラブ, 売上管理, 収益分析, CSV, データ分析, ダッシュボード, 売上レポート, ファンリピ",
  authors: [{ name: "ファンリピ" }],
  creator: "ファンリピ",
  publisher: "ファンリピ",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://fanripi.com'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: "ファンリピ - ファンクラブ売上管理システム",
    description: "ファンクラブの売上データを効率的に管理・分析するシステム",
    url: 'https://fanripi.com',
    siteName: 'ファンリピ',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ファンリピ - ファンクラブ売上管理システム',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "ファンリピ - ファンクラブ売上管理システム",
    description: "ファンクラブの売上データを効率的に管理・分析するシステム",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
