import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, full_name, phone, role } = req.body || {};
  if (!email || !password || !full_name) return res.status(400).json({ error: 'Name, email and password are required.' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!['admin','cashier','inventory','technician'].includes(role)) return res.status(400).json({ error: 'Invalid staff role.' });

  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return res.status(500).json({ error: 'Server-side Supabase credentials are not configured.' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing authorization token.' });

  const userClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user) return res.status(401).json({ error: 'Invalid session.' });

  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor, error: actorError } = await adminClient.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (actorError || !['owner','admin'].includes(actor?.role)) return res.status(403).json({ error: 'Management access required.' });

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: String(email).trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: String(full_name).trim() }
  });
  if (createError) return res.status(400).json({ error: createError.message });

  const newUser = created.user;
  const { error: profileError } = await adminClient.from('profiles').update({
    full_name: String(full_name).trim(), phone: String(phone || '').trim() || null, role, active: true
  }).eq('id', newUser.id);

  if (profileError) {
    await adminClient.auth.admin.deleteUser(newUser.id);
    return res.status(500).json({ error: profileError.message });
  }

  await adminClient.from('audit_log').insert({
    actor_id: user.id, action: 'STAFF_CREATED', table_name: 'profiles', record_id: newUser.id,
    details: { staff_name: String(full_name).trim(), role, email: String(email).trim().toLowerCase() }
  });

  return res.status(200).json({ ok: true, id: newUser.id });
}
