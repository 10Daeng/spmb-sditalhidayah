import React, { useState, useEffect } from 'react';
import { transformGDriveUrl, transformGDriveHtml } from '../lib/gdrive';

/**
 * Public News Page - Kompas/Detik Style
 */

const NewsPage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetchArticles();
    
    // Check URL for article slug
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('artikel');
    if (slug) {
      // Will be handled after articles load
    }
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/admin/articles?public=true');
      const result = await response.json();
      
      if (result.success) {
        setArticles(result.data || []);
        
        // Check for specific article
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('artikel');
        if (slug && result.data) {
          const found = result.data.find(a => a.slug === slug);
          if (found) setSelectedArticle(found);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Baru saja';
    if (hours < 24) return `${hours} jam lalu`;
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const openArticle = (article) => {
    setSelectedArticle(article);
    window.history.pushState({}, '', `/berita?artikel=${article.slug}`);
    window.scrollTo(0, 0);
  };

  const closeArticle = () => {
    setSelectedArticle(null);
    window.history.pushState({}, '', '/berita');
  };

  const categories = ['all', ...new Set(articles.map(a => a.category))];
  const filteredArticles = category === 'all' 
    ? articles 
    : articles.filter(a => a.category === category);

  // Article Detail View
  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-white">
        {/* Article Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <button 
              onClick={closeArticle}
              className="text-blue-100 hover:text-white mb-4 flex items-center gap-2"
            >
              ← Kembali ke Daftar Berita
            </button>
            <span className="inline-block px-3 py-1 bg-white/20 text-white text-sm rounded-full mb-4">
              {selectedArticle.category}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
              {selectedArticle.title}
            </h1>
            <div className="flex items-center gap-4 text-blue-100 text-sm">
              <span>👤 {selectedArticle.author_name}</span>
              <span>📅 {formatDate(selectedArticle.published_at)}</span>
              <span>👁️ {selectedArticle.views_count || 0} views</span>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        {selectedArticle.featured_image_url && (
          <div className="max-w-4xl mx-auto px-4 -mt-4">
            <img 
              src={transformGDriveUrl(selectedArticle.featured_image_url)} 
              alt={selectedArticle.title}
              className="w-full h-64 md:h-96 object-cover rounded-xl shadow-2xl"
            />
          </div>
        )}

        {/* Article Content */}
        <article className="max-w-4xl mx-auto px-4 py-12">
          <div 
            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: transformGDriveHtml(selectedArticle.content) }}
          />

          {/* Share Buttons */}
          <div className="mt-12 pt-8 border-t">
            <p className="text-gray-500 mb-4">Bagikan artikel ini:</p>
            <div className="flex gap-3">
              <a 
                href={`https://wa.me/?text=${encodeURIComponent(selectedArticle.title + ' - ' + window.location.href)}`}
                target="_blank"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
              >
                📱 WhatsApp
              </a>
              <a 
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                📘 Facebook
              </a>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link berhasil disalin!');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
              >
                🔗 Salin Link
              </button>
            </div>
          </div>
        </article>

        {/* Related Articles */}
        <div className="bg-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Artikel Lainnya</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {articles
                .filter(a => a.id !== selectedArticle.id)
                .slice(0, 3)
                .map(article => (
                  <div 
                    key={article.id}
                    onClick={() => openArticle(article)}
                    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                  >
                    {article.featured_image_url ? (
                      <img src={transformGDriveUrl(article.featured_image_url)} alt="" className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 bg-gradient-to-br from-blue-500 to-indigo-600" />
                    )}
                    <div className="p-4">
                      <p className="font-semibold text-gray-900 line-clamp-2">{article.title}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatDate(article.published_at)}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Memuat berita...</p>
        </div>
      </div>
    );
  }

  // News List View
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Berita & Artikel</h1>
          <p className="text-blue-100 text-lg">Informasi terbaru seputar SDIT Al-Hidayah Sumenep</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                category === cat 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border'
              }`}
            >
              {cat === 'all' ? '📰 Semua' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Article */}
      {filteredArticles.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 mb-8">
          <div 
            onClick={() => openArticle(filteredArticles[0])}
            className="relative rounded-2xl overflow-hidden cursor-pointer group"
          >
            {filteredArticles[0].featured_image_url ? (
              <img 
                src={transformGDriveUrl(filteredArticles[0].featured_image_url)} 
                alt="" 
                className="w-full h-80 md:h-[450px] object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-80 md:h-[450px] bg-gradient-to-br from-blue-500 to-indigo-600" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <span className="inline-block px-3 py-1 bg-blue-600 text-white text-sm rounded-full mb-4">
                {filteredArticles[0].category}
              </span>
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 group-hover:text-blue-200 transition-colors">
                {filteredArticles[0].title}
              </h2>
              <p className="text-gray-300 line-clamp-2 mb-4 max-w-2xl">
                {filteredArticles[0].excerpt}
              </p>
              <div className="flex items-center gap-4 text-gray-400 text-sm">
                <span>{filteredArticles[0].author_name}</span>
                <span>•</span>
                <span>{formatDate(filteredArticles[0].published_at)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Articles Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.slice(1).map(article => (
            <article 
              key={article.id}
              onClick={() => openArticle(article)}
              className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
            >
              {article.featured_image_url ? (
                <img 
                  src={transformGDriveUrl(article.featured_image_url)} 
                  alt="" 
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-400 text-5xl">
                  📰
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                    {article.category}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(article.published_at)}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {article.excerpt}
                </p>
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="text-xs text-gray-400">👤 {article.author_name}</span>
                  <span className="text-blue-600 text-sm font-medium group-hover:underline">
                    Baca →
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-16">
            <span className="text-6xl mb-4 block">📰</span>
            <p className="text-gray-500">Belum ada berita dalam kategori ini</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsPage;
