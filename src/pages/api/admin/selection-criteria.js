export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

export async function GET({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from('selection_criteria')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get registration counts per status for quota visualization
    let statusCounts = {};
    try {
      const { data: counts } = await supabaseAdmin
        .from('registrations')
        .select('status, id', { count: 'exact' });
      if (counts) {
        counts.forEach(r => {
          statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
        });
      }
    } catch (e) {}

    return new Response(JSON.stringify({
      success: true,
      data: data || null,
      statusCounts
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Criteria fetch error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
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
    const {
      academic_year,
      quota_regular, quota_indent,
      weight_test_score, weight_document, weight_interview,
      passing_grade
    } = body;

    // Validate total weight = 100
    const totalWeight = parseFloat(weight_test_score || 0) + parseFloat(weight_document || 0) + parseFloat(weight_interview || 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return new Response(JSON.stringify({ error: 'Total bobot harus 100% (saat ini: ' + totalWeight.toFixed(2) + '%)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find existing active criteria
    const { data: existing } = await supabaseAdmin
      .from('selection_criteria')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let result;
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('selection_criteria')
        .update({
          academic_year: academic_year || '2026/2027',
          quota_regular: parseInt(quota_regular) || 60,
          quota_indent: parseInt(quota_indent) || 20,
          weight_test_score: parseFloat(weight_test_score) || 50,
          weight_document: parseFloat(weight_document) || 20,
          weight_interview: parseFloat(weight_interview) || 30,
          passing_grade: parseFloat(passing_grade) || 60,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
      result = { data, error };
    } else {
      const { data, error } = await supabaseAdmin
        .from('selection_criteria')
        .insert({
          academic_year: academic_year || '2026/2027',
          quota_regular: parseInt(quota_regular) || 60,
          quota_indent: parseInt(quota_indent) || 20,
          weight_test_score: parseFloat(weight_test_score) || 50,
          weight_document: parseFloat(weight_document) || 20,
          weight_interview: parseFloat(weight_interview) || 30,
          passing_grade: parseFloat(passing_grade) || 60,
          is_active: true
        })
        .select()
        .single();
      result = { data, error };
    }

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, data: result.data }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Criteria update error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}