import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return res.status(500).json({
        error: "Supabase server configuration is missing."
      });
    }

    // Verify the logged-in user using the normal Supabase client.
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const {
      data: { user },
      error: userError
    } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Invalid or expired session." });
    }

    // Service-role client is used only on the server.
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check the caller's profile/role.
    const { data: caller, error: callerError } = await admin
      .from("profiles")
      .select("id, full_name, role, active")
      .eq("id", user.id)
      .maybeSingle();

    if (callerError) {
      return res.status(500).json({ error: callerError.message });
    }

    if (!caller || caller.active === false) {
      return res.status(403).json({ error: "Your account is inactive." });
    }

    if (!["owner", "admin"].includes(caller.role)) {
      return res.status(403).json({
        error: "Only an Owner or Admin can delete staff accounts."
      });
    }

    const { id } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: "Staff account ID is required." });
    }

    // Never allow someone to delete their own account.
    if (id === user.id) {
      return res.status(400).json({
        error: "You cannot delete your own account."
      });
    }

    // Find the staff member.
    const { data: member, error: memberError } = await admin
      .from("profiles")
      .select("id, full_name, role, active")
      .eq("id", id)
      .maybeSingle();

    if (memberError) {
      return res.status(500).json({ error: memberError.message });
    }

    if (!member) {
      return res.status(404).json({
        error: "Staff account not found."
      });
    }

    // Protect the final active Owner.
    if (member.role === "owner" && member.active !== false) {
      const { count, error: ownerError } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "owner")
        .eq("active", true);

      if (ownerError) {
        return res.status(500).json({ error: ownerError.message });
      }

      if ((count || 0) <= 1) {
        return res.status(400).json({
          error: "At least one active Owner must remain."
        });
      }
    }

    // Remove the profile first.
    const { error: profileError } = await admin
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileError) {
      return res.status(500).json({
        error: `Could not delete staff profile: ${profileError.message}`
      });
    }

    // Then remove the Supabase Auth account.
    const { error: authError } = await admin.auth.admin.deleteUser(id);

    if (authError) {
      return res.status(500).json({
        error: `Profile was removed, but the login account could not be deleted: ${authError.message}`
      });
    }

    return res.status(200).json({
      success: true,
      message: `${member.full_name || "Staff account"} was deleted successfully.`
    });

  } catch (error) {
    console.error("Delete staff error:", error);

    return res.status(500).json({
      error: error?.message || "Could not delete staff account."
    });
  }
}