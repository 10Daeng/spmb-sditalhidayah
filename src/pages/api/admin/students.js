export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

export async function GET({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu', 'guru']);
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const classroom = url.searchParams.get('classroom');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('registrations')
      .select('id, registration_number, student_full_name, date_of_birth, gender, parent_name, parent_phone, parent_email, status, created_at, test_date, test_score', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    } else {
      query = query.in('status', ['pending', 'verified', 'document_complete', 'scheduled', 'lulus', 'tidak_lulus', 'enrolled', 'rejected']);
    }

    if (search) {
      query = query.or(`student_full_name.ilike.%${search}%,registration_number.ilike.%${search}%,parent_name.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ data: [], error: error.message, total: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const statusCounts = {};
    try {
      const { data: allData } = await supabaseAdmin
        .from('registrations')
        .select('status');
      if (allData) {
        allData.forEach(r => {
          statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
        });
      }
    } catch (e) { /* ignore */ }

    return new Response(JSON.stringify({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      limit,
      statusCounts
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Students fetch error:', err);
    return new Response(JSON.stringify({ data: [], error: err.message, total: 0 }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { id, status, test_date, test_time, test_location, test_score } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID pendaftaran wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (test_date) updateData.test_date = test_date;
    if (test_time) updateData.test_time = test_time;
    if (test_location) updateData.test_location = test_location;
    if (test_score !== undefined) updateData.test_score = test_score;

    const { data, error } = await supabaseAdmin
      .from('registrations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Student update error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE({ request }) {
  const auth = await requireAuth(request, ['super_admin']);
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabaseAdmin
      .from('registrations')
      .delete()
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Data siswa dihapus' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Student delete error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}