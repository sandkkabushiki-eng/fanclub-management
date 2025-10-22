'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Users, TrendingUp, Star, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleGetStarted = () => {
    router.push('/app');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-yellow-50 to-pink-100">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-pink-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-pink-500" />
              <span className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent">
                FanLove
              </span>
            </div>
            <button
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-pink-500 to-yellow-500 text-white px-6 py-2 rounded-full font-semibold hover:from-pink-600 hover:to-yellow-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              7日間無料で始める
            </button>
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Sparkles className="h-16 w-16 text-yellow-400 mx-auto mb-6 animate-pulse" />
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent">
                ファンクラブの
              </span>
              <br />
              <span className="text-gray-800">リピーターさん</span>
              <br />
              <span className="bg-gradient-to-r from-yellow-500 to-pink-500 bg-clip-text text-transparent">
                管理できてますか？
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              あなたを愛してくれるファンの皆さんの
              <span className="text-pink-500 font-semibold">愛情</span>を
              <span className="text-yellow-500 font-semibold">可視化</span>して、
              もっと深い絆を築きませんか？
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={handleGetStarted}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group bg-gradient-to-r from-pink-500 to-yellow-500 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-pink-600 hover:to-yellow-600 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 flex items-center space-x-2"
            >
              <span>7日間無料で始める</span>
              <ArrowRight className={`h-5 w-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
            </button>
            <p className="text-sm text-gray-500">✨ クレジットカード不要・7日間完全無料</p>
          </div>

          {/* 統計 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-pink-200">
              <Users className="h-12 w-12 text-pink-500 mx-auto mb-4" />
              <div className="text-3xl font-bold text-gray-800 mb-2">1,000+</div>
              <div className="text-gray-600">ファンクラブ運営者</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-yellow-200">
              <Heart className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <div className="text-3xl font-bold text-gray-800 mb-2">50,000+</div>
              <div className="text-gray-600">管理されているファン</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-pink-200">
              <TrendingUp className="h-12 w-12 text-pink-500 mx-auto mb-4" />
              <div className="text-3xl font-bold text-gray-800 mb-2">98%</div>
              <div className="text-gray-600">満足度</div>
            </div>
          </div>
        </div>
      </section>

      {/* 機能紹介セクション */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent">
                ファンの愛情を
              </span>
              <br />
              <span className="text-gray-800">数字で見える化</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              あなたを応援してくれるファンの皆さんの想いを、データとして可視化。
              もっと深い絆を築くためのツールをご用意しました。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 機能1 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-pink-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="bg-gradient-to-r from-pink-100 to-yellow-100 rounded-2xl p-4 w-fit mb-6">
                <Heart className="h-8 w-8 text-pink-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">リピーター分析</h3>
              <p className="text-gray-600 mb-6">
                あなたを何度も応援してくれるファンの皆さんを分析。
                誰が一番あなたを愛してくれているか、一目で分かります。
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-pink-500 mr-2" />
                  購入履歴の可視化
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-pink-500 mr-2" />
                  ファンの愛情度ランキング
                </li>
              </ul>
            </div>

            {/* 機能2 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-yellow-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="bg-gradient-to-r from-yellow-100 to-pink-100 rounded-2xl p-4 w-fit mb-6">
                <TrendingUp className="h-8 w-8 text-yellow-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">売上ダッシュボード</h3>
              <p className="text-gray-600 mb-6">
                ファンの皆さんからの応援を、美しいグラフで表示。
                あなたの成長を数字で実感できます。
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-yellow-500 mr-2" />
                  月別売上推移
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-yellow-500 mr-2" />
                  購入パターン分析
                </li>
              </ul>
            </div>

            {/* 機能3 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-pink-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="bg-gradient-to-r from-pink-100 to-yellow-100 rounded-2xl p-4 w-fit mb-6">
                <Users className="h-8 w-8 text-pink-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">ファン管理</h3>
              <p className="text-gray-600 mb-6">
                一人ひとりのファンの皆さんとの絆を大切に。
                個別の購入履歴や応援履歴を管理できます。
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-pink-500 mr-2" />
                  個別ファンプロフィール
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-pink-500 mr-2" />
                  応援履歴の記録
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* お客様の声セクション */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent">
                ファンクラブ運営者の
              </span>
              <br />
              <span className="text-gray-800">声</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-pink-200">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-6 italic">
                「ファンの皆さんがどれだけ私を応援してくれているか、数字で見えるようになって感動しました。もっと頑張ろうという気持ちになります。」
              </p>
              <div className="text-sm text-gray-500">- モデルAさん</div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-yellow-200">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-6 italic">
                「リピーターの方が一目で分かるので、特別な感謝の気持ちを伝えやすくなりました。ファンとの絆が深まった気がします。」
              </p>
              <div className="text-sm text-gray-500">- クリエイターBさん</div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-pink-200">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-6 italic">
                「売上の推移が分かりやすくて、自分の成長を実感できます。ファンの皆さんへの感謝の気持ちがより深まりました。」
              </p>
              <div className="text-sm text-gray-500">- 配信者Cさん</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-pink-100 to-yellow-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent">
              今すぐ始めて
            </span>
            <br />
            <span className="text-gray-800">ファンとの絆を深めませんか？</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            無料で始められる、ファンクラブリピーター管理ツール。
            <br />
            あなたを愛してくれるファンの皆さんの愛情を、数字で見える化しましょう。
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-pink-500 to-yellow-500 text-white px-12 py-4 rounded-full text-xl font-bold hover:from-pink-600 hover:to-yellow-600 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105"
          >
            7日間無料で始める
          </button>
          <p className="text-sm text-gray-500 mt-4">✨ クレジットカード不要・7日間完全無料・5分でセットアップ完了</p>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-pink-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Heart className="h-6 w-6 text-pink-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent">
              FanLove
            </span>
          </div>
          <p className="text-gray-600 mb-4">
            ファンクラブリピーター管理ツール
          </p>
          <p className="text-sm text-gray-500">
            © 2024 FanLove. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
