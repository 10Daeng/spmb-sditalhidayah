
export const prerender = false;

import { supabaseAdmin } from "../../../lib/supabase";
import { requireAuth } from "../../../lib/auth";

/**
 * API untuk mengelola artikel/berita
 * CRUD: Create, Read, Update, Delete
 */

// Helper: Generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * GET - Fetch articles
 */
export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const publicOnly = url.searchParams.get('public') === 'true';
    const articleId = url.searchParams.get('id');

    if (!publicOnly) {
      const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
      if (!auth.authorized) return auth.response;
    }

    if (articleId) {
      const { data, error } = await supabaseAdmin
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();

      if (error) throw error;

      if (publicOnly && data.status !== 'published') {
        return new Response(JSON.stringify({ success: false, error: 'Not found' }), {
          status: 404, headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('articles')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (publicOnly) {
      query = query.eq('status', 'published');
    } else if (status) {
      query = query.eq('status', status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) }
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Articles GET error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { 
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * POST - Create new article
 */
export async function POST({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;
  try {
    const body = await request.json();
    const { title, content, excerpt, category, status, featured_image_url, tags, author_name,
            slug: customSlug, meta_title, meta_description, meta_keywords, og_image } = body;

    if (!title || !content) {
      return new Response(JSON.stringify({ success: false, error: "Judul dan konten wajib diisi" }), 
        { status: 400, headers: { "Content-Type": "application/json" }});
    }

    let slug = customSlug ? generateSlug(customSlug) : generateSlug(title);
    const timestamp = Date.now().toString(36);
    slug = `${slug}-${timestamp}`;

    const articleData = {
      title,
      slug,
      content,
      excerpt: excerpt || content.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
      category: category || 'Berita',
      status: status || 'draft',
      featured_image_url: featured_image_url || null,
      og_image: og_image || featured_image_url || null,
      tags: tags || [],
      author_name: author_name || 'Admin',
      meta_title: meta_title || title,
      meta_description: meta_description || excerpt || content.replace(/<[^>]*>/g, '').substring(0, 160),
      meta_keywords: meta_keywords || '',
      published_at: status === 'published' ? new Date().toISOString() : null
    };

    const { data, error } = await supabaseAdmin
      .from('articles')
      .insert(articleData)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data, message: "Artikel berhasil dibuat" }), {
      status: 201, headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Articles POST error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { 
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * PUT - Update article
 */
export async function PUT({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;
  try {
    const body = await request.json();
    const { id, title, content, excerpt, category, status, featured_image_url, tags, author_name,
            slug: customSlug, meta_title, meta_description, meta_keywords, og_image } = body;

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: "ID artikel diperlukan" }), 
        { status: 400, headers: { "Content-Type": "application/json" }});
    }

    const updateData = { updated_at: new Date().toISOString() };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (category !== undefined) updateData.category = category;
    if (featured_image_url !== undefined) updateData.featured_image_url = featured_image_url;
    if (og_image !== undefined) updateData.og_image = og_image;
    if (tags !== undefined) updateData.tags = tags;
    if (author_name !== undefined) updateData.author_name = author_name;
    if (meta_title !== undefined) updateData.meta_title = meta_title;
    if (meta_description !== undefined) updateData.meta_description = meta_description;
    if (meta_keywords !== undefined) updateData.meta_keywords = meta_keywords;
    if (customSlug) updateData.slug = generateSlug(customSlug);
    
    if (status) {
      updateData.status = status;
      if (status === 'published') {
        const { data: existing } = await supabaseAdmin
          .from('articles')
          .select('published_at')
          .eq('id', id)
          .single();
        if (!existing?.published_at) {
          updateData.published_at = new Date().toISOString();
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('articles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data, message: "Artikel berhasil diupdate" }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Articles PUT error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { 
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * DELETE - Delete article
 */
export async function DELETE({ request }) {
  const auth = await requireAuth(request, ['super_admin']);
  if (!auth.authorized) return auth.response;
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: "ID artikel diperlukan" }), 
        { status: 400, headers: { "Content-Type": "application/json" }});
    }

    const { error } = await supabaseAdmin.from('articles').delete().eq('id', id);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: "Artikel berhasil dihapus" }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Articles DELETE error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { 
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
