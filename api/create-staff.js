import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, full_name, phone, role } = req.body || {};

    if (!email || !password || !full_name) {
      return res.status(400).json({
        error: 'Name, email and password are required.'
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters.'
      });
    }

    if (!['admin', 'cashier', 'inventory', 'technician'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid staff role.'
      });
    }

    const url = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      return res.status(500).json({
        error: 'Server-side Supabase credentials are not configured.'
      });
    }

    // Get logged-in user's access token
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return res.status(401).json({
        error: 'Missing authorization token.'
      });
    }

    // Validate the logged-in user
    const userClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const {
      data: { user },
      error: userError
    } = await userClient.auth.getUser(token);

    if (userError || !user) {
      console.error('AUTH ERROR:', userError);

      return res.status(401).json({
        error: 'Invalid session.'
      });
    }

    // Server-side admin client
    const adminClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Check management profile
    const {
      data: actor,
      error: actorError
    } = await adminClient
      .from('profiles')
      .select('id, role, active')
      .eq('id', user.id)
      .maybeSingle();

    if (actorError) {
      console.error('PROFILE LOOKUP ERROR:', actorError);

      return res.status(500).json({
        error: 'Unable to verify management profile.',
        details: actorError.message
      });
    }

    if (!actor) {
      console.error('NO PROFILE FOUND FOR USER:', user.id);

      return res.status(403).json({
        error: 'Management profile not found for this account.'
      });
    }

    if (actor.active !== true) {
      return res.status(403).json({
        error: 'Your management account is inactive.'
      });
    }

    if (!['owner', 'admin'].includes(String(actor.role).toLowerCase())) {
      return res.status(403).json({
        error: 'Management access required.'
      });
    }

    // Create new authentication account
    const {
      data: created,
      error: createError
    } = await adminClient.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: String(full_name).trim()
      }
    });

    if (createError) {
      console.error('CREATE USER ERROR:', createError);

      return res.status(400).json({
        error: createError.message
      });
    }

    const newUser = created.user;

    // Create/update staff profile
    const {
      error: profileError
    } = await adminClient
      .from('profiles')
      .upsert({
        id: newUser.id,
        full_name: String(full_name).trim(),
        phone: String(phone || '').trim() || null,
        role,
        active: true
      });

    if (profileError) {
      console.error('PROFILE CREATE ERROR:', profileError);

      await adminClient.auth.admin.deleteUser(newUser.id);

      return res.status(500).json({
        error: profileError.message
      });
    }

    // Audit log
    const { error: auditError } = await adminClient
      .from('audit_log')
      .insert({
        actor_id: user.id,
        action: 'STAFF_CREATED',
        table_name: 'profiles',
        record_id: newUser.id,
        details: {
          staff_name: String(full_name).trim(),
          role,
          email: String(email).trim().toLowerCase()
        }
      });

    if (auditError) {
      console.error('AUDIT LOG ERROR:', auditError);
    }

    return res.status(200).json({
      ok: true,
      id: newUser.id
    });

  } catch (error) {
    console.error('CREATE STAFF SERVER ERROR:', error);

    return res.status(500).json({
      error: error?.message || 'Unexpected server error.'
    });
  }
}