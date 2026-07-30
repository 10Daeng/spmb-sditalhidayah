export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    const publicOnly = url.searchParams.get('public') === 'true';

    // Public access: no auth needed
    if (!publicOnly) {
      const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
      if (!auth.authorized) return auth.response;
    }

    if (slug) {
      const { data, error } = await supabaseAdmin
        .from('site_pages')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || (!publicOnly && data && !data.is_published)) {
        return new Response(JSON.stringify({ success: false, error: 'Halaman tidak ditemukan' }), {
          status: 404, headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // List all pages
    let query = supabaseAdmin.from('site_pages').select('*').order('sort_order', { ascending: true });
    if (publicOnly) query = query.eq('is_published', true).eq('show_in_nav', true);

    const { data, error } = await query;

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data: data || [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { id, slug, title, content, meta_title, meta_description, meta_keywords, is_published, sort_order, show_in_nav } = body;

    if (!id && !slug) {
      return new Response(JSON.stringify({ error: 'ID atau slug wajib diisi' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (meta_title !== undefined) updateData.meta_title = meta_title;
    if (meta_description !== undefined) updateData.meta_description = meta_description;
    if (meta_keywords !== undefined) updateData.meta_keywords = meta_keywords;
    if (is_published !== undefined) updateData.is_published = is_published;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (show_in_nav !== undefined) updateData.show_in_nav = show_in_nav;

    let query = supabaseAdmin.from('site_pages').update(updateData);
    if (id) query = query.eq('id', id);
    else query = query.eq('slug', slug);

    const { data, error } = await query.select().single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, data, message: 'Halaman berhasil diupdate' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}