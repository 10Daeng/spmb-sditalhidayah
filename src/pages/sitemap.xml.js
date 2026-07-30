export const prerender = false;

import { supabaseAdmin } from '../lib/supabase.js';

export async function GET() {
  const baseUrl = 'https://sditalhidayahsumenep.sch.id';
  
  // Static pages
  const staticPages = [
    { url: '/', changefreq: 'daily', priority: 1.0 },
    { url: '/spmb', changefreq: 'daily', priority: 0.9 },
    { url: '/spmb/form', changefreq: 'weekly', priority: 0.8 },
    { url: '/berita', changefreq: 'daily', priority: 0.8 },
    { url: '/tentang-kami', changefreq: 'monthly', priority: 0.7 },
    { url: '/dashboard/parent', changefreq: 'weekly', priority: 0.6 },
  ];

  // Dynamic pages - articles
  let articles = [];
  try {
    const { data } = await supabaseAdmin
      .from('articles')
      .select('slug, updated_at')
      .eq('status', 'published');
    articles = data || [];
  } catch (e) {}

  const articlePages = articles.map(article => ({
    url: `/berita/${article.slug}`,
    changefreq: 'monthly',
    priority: 0.6,
    lastmod: article.updated_at
  }));

  const allPages = [...staticPages, ...articlePages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod ? new Date(page.lastmod).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
