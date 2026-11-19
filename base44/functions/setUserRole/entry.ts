import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// App-admin role changes (Admin / Viewer / Manager). Role values are part of
// the platform's protected User record, so the change is made with the
// service-role client after the caller is confirmed to be an app admin.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { user_id, role } = await req.json();
    const allowed = ['admin', 'user', 'manager'];
    if (!user_id || !allowed.includes(role)) {
      return Response.json({ error: 'A valid user and role are required' }, { status: 400 });
    }
    if (user_id === user.id && role !== 'admin') {
      return Response.json({ error: 'You cannot change your own role' }, { status: 400 });
    }

    await base44.asServiceRole.entities.User.update(user_id, { role });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}