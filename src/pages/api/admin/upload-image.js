export const prerender = false;

import { supabaseAdmin } from "../../../lib/supabase";
import { requireAuth } from "../../../lib/auth";

export async function POST({ request }) {
  const auth = await requireAuth(request, ['super_admin', 'kepsek', 'admin_tu']);
  if (!auth.authorized) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file !== 'object' || !file.name) {
      return new Response(JSON.stringify({ success: false, error: "File gambar tidak ditemukan" }), { 
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const fileExt = file.name.split('.').pop();
    const safeName = `article_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `articles/${safeName}`;

    const { error: uploadError } = await supabaseAdmin
        .storage
        .from('public-images')
        .upload(filePath, file, {
            contentType: file.type || 'image/jpeg',
            upsert: true
        });

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabaseAdmin
        .storage
        .from('public-images')
        .getPublicUrl(filePath);

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Upload Image error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { 
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
