export const prerender = false;

import { supabaseAdmin } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

export async function GET({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu', 'guru']);
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(request.url);
    const classroomId = url.searchParams.get('classroom_id');
    const day = url.searchParams.get('day');

    let query = supabaseAdmin
      .from('schedules')
      .select(`
        id, day, start_time, end_time, notes, academic_year,
        classroom:classrooms(id, name, level),
        subject:subjects(id, name, code),
        teacher:users(id, name)
      `)
      .order('day', { ascending: true })
      .order('start_time', { ascending: true });

    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }
    if (day) {
      query = query.eq('day', day);
    }

    const { data, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ data: [], error: error.message }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, data: data || [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Schedules fetch error:', err);
    return new Response(JSON.stringify({ data: [], error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { classroom_id, subject_id, teacher_id, day, start_time, end_time, academic_year, notes } = body;

    if (!classroom_id || !subject_id || !day || !start_time || !end_time) {
      return new Response(JSON.stringify({ error: 'Kelas, mata pelajaran, hari, jam mulai, dan jam selesai wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabaseAdmin
      .from('schedules')
      .insert({
        classroom_id,
        subject_id,
        teacher_id: teacher_id || null,
        day,
        start_time,
        end_time,
        academic_year: academic_year || null,
        notes: notes || null
      })
      .select(`
        id, day, start_time, end_time, notes, academic_year,
        classroom:classrooms(id, name, level),
        subject:subjects(id, name, code),
        teacher:users(id, name)
      `)
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
    console.error('Schedule create error:', err);
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
    const { id, classroom_id, subject_id, teacher_id, day, start_time, end_time, academic_year, notes } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID jadwal wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updateData = {};
    if (classroom_id !== undefined) updateData.classroom_id = classroom_id;
    if (subject_id !== undefined) updateData.subject_id = subject_id;
    if (teacher_id !== undefined) updateData.teacher_id = teacher_id;
    if (day !== undefined) updateData.day = day;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (academic_year !== undefined) updateData.academic_year = academic_year;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabaseAdmin
      .from('schedules')
      .update(updateData)
      .eq('id', id)
      .select(`
        id, day, start_time, end_time, notes, academic_year,
        classroom:classrooms(id, name, level),
        subject:subjects(id, name, code),
        teacher:users(id, name)
      `)
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
    console.error('Schedule update error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID jadwal wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabaseAdmin
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Jadwal berhasil dihapus' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Schedule delete error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}