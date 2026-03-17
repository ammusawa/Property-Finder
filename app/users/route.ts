// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Make sure this path is correct
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

// Helper: Check if the current user is admin
async function isAdmin() {
  const session = await getServerSession(authOptions);
  console.log('[isAdmin] Session:', session); // Debug log
  return session?.user?.role === 'admin';
}

// ─────────────────────────────────────────────────────────────────────────
// GET /api/users → Get all users (admin only)
// GET /api/users?id=xxx → Get single user
// ─────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  console.log('[GET /api/users] Request received');

  const admin = await isAdmin();
  console.log('[GET /api/users] Is admin?', admin);

  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('id');

  try {
    if (userId) {
      // Fetch single user
      const [rows] = await db.query(
        'SELECT id, name, email, image, role, createdAt FROM users WHERE id = ?',
        [userId]
      );

      if (!rows || (rows as any[]).length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json((rows as any[])[0]);
    } else {
      // Fetch all users
      const [rows] = await db.query(
        'SELECT id, name, email, image, role, createdAt FROM users ORDER BY createdAt DESC'
      );

      return NextResponse.json({ users: rows || [] });
    }
  } catch (error: any) {
    console.error('[GET /api/users] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// POST /api/users → Create new user (admin only)
// ─────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  console.log('[POST /api/users] Request received');

  const admin = await isAdmin();
  console.log('[POST /api/users] Is admin?', admin);

  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name?.trim() || !email?.trim() || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, password, role' },
        { status: 400 }
      );
    }

    const validRoles = ['user', 'admin', 'agent', 'owner', 'moderator'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check for duplicate email
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email.trim()]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert new user
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim(), hashedPassword, role]
    );

    const insertId = (result as any).insertId;

    // Fetch the newly created user
    const [newUserRows] = await db.query(
      'SELECT id, name, email, role, createdAt FROM users WHERE id = ?',
      [insertId]
    );

    return NextResponse.json(
      { message: 'User created successfully', user: (newUserRows as any[])[0] },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/users] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create user', details: error.message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// PUT /api/users/[id] → Update user (admin only)
// ─────────────────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  console.log('[PUT /api/users] Request received');

  const admin = await isAdmin();
  console.log('[PUT /api/users] Is admin?', admin);

  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const id = segments[segments.length - 1]; // last segment = user id

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const body = await req.json();
    const { name, email, password, role, image } = body;

    if (!name && !email && !password && !role && image === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    if (role && !['user', 'admin', 'agent', 'owner', 'moderator'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name) {
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (email) {
      updates.push('email = ?');
      values.push(email.trim());

      // Check email uniqueness (exclude current user)
      const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email.trim(), id]
      );
      if ((existing as any[]).length > 0) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
    }
    if (password) {
      const hashed = await bcrypt.hash(password, 12);
      updates.push('password = ?');
      values.push(hashed);
    }
    if (role) {
      updates.push('role = ?');
      values.push(role);
    }
    if (image !== undefined) {
      updates.push('image = ?');
      values.push(image || null);
    }

    values.push(id);

    await db.query(
      `UPDATE users SET ${updates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    // Fetch updated user
    const [updated] = await db.query(
      'SELECT id, name, email, role, image, createdAt FROM users WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      message: 'User updated successfully',
      user: (updated as any[])[0],
    });
  } catch (error: any) {
    console.error('[PUT /api/users] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    );
  }
}