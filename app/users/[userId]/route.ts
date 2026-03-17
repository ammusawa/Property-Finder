import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const [users] = await db.query(
      'SELECT id, name, email, image, role, createdAt FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Don't expose sensitive information
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch user', message: error.message },
      { status: 500 }
    );
  }
}

