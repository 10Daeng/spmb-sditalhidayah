import React, { useState, useEffect } from 'react';
import { transformGDriveUrl } from '../../lib/gdrive';

/**
 * News Section for Homepage
 * Shows latest 3 articles
 */

const NewsHomeSection = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/admin/articles?public=true&limit=3');
      const result = await response.json();
      
      if (result.success) {
        setArticles(result.data || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-100 rounded-xl h-80 animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <span className="text-4xl block mb-3">📰</span>
        <p className="text-gray-500">Belum ada berita terbaru</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {articles.map((article, index) => (
        <a 
          key={article.id}
          href={`/berita?artikel=${article.slug}`}
          className={`group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all overflow-hidden ${
            index === 0 ? 'md:col-span-2 md:row-span-2' : ''
          }`}
        >
          <div className={`relative ${index === 0 ? 'h-64 md:h-full' : 'h-48'}`}>
            {article.featured_image_url ? (
              <img 
                src={transformGDriveUrl(article.featured_image_url)} 
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-5xl">
                📰
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <span className="inline-block px-2 py-1 bg-blue-600 text-white text-xs rounded-full mb-2">
                {article.category}
              </span>
              <h3 className={`font-bold text-white group-hover:text-blue-200 transition-colors mb-2 ${
                index === 0 ? 'text-xl md:text-2xl' : 'text-lg'
              }`}>
                {article.title}
              </h3>
              <p className="text-gray-300 text-sm line-clamp-2 hidden md:block">
                {article.excerpt}
              </p>
              <div className="flex items-center gap-3 text-gray-400 text-xs mt-2">
                <span>📅 {formatDate(article.published_at)}</span>
                <span>👤 {article.author_name}</span>
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

export default NewsHomeSection;
