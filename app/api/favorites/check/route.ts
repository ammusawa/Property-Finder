import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ isFavorited: false });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const userId = (session.user as any).id;

    if (!propertyId) {
      return NextResponse.json({ isFavorited: false });
    }

    const [favorites] = await db.query(
      'SELECT id FROM favorites WHERE userId = ? AND propertyId = ?',
      [userId, propertyId]
    ) as any[];

    return NextResponse.json({ isFavorited: favorites.length > 0 });
  } catch (error: any) {
    return NextResponse.json({ isFavorited: false });
  }
}

