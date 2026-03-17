import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    const [favorites] = await db.query(
      `SELECT f.*, p.* FROM favorites f
       INNER JOIN properties p ON f.propertyId = p.id
       WHERE f.userId = ? AND p.status = 'active'
       ORDER BY f.createdAt DESC`,
      [userId]
    ) as any[];

    const formattedFavorites = favorites.map((fav: any) => {
      const property = { ...fav };
      property.images = typeof property.images === 'string' ? JSON.parse(property.images) : property.images;
      property.price = parseFloat(property.price);
      return property;
    });

    return NextResponse.json({ favorites: formattedFavorites });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch favorites', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { propertyId } = await request.json();
    const userId = (session.user as any).id;

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    // Check if already favorited
    const [existing] = await db.query(
      'SELECT id FROM favorites WHERE userId = ? AND propertyId = ?',
      [userId, propertyId]
    ) as any[];

    if (existing.length > 0) {
      return NextResponse.json({ message: 'Already favorited' });
    }

    const favoriteId = crypto.randomUUID();
    await db.query(
      'INSERT INTO favorites (id, userId, propertyId) VALUES (?, ?, ?)',
      [favoriteId, userId, propertyId]
    );

    return NextResponse.json({ message: 'Added to favorites', id: favoriteId });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to add favorite', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const userId = (session.user as any).id;

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    await db.query(
      'DELETE FROM favorites WHERE userId = ? AND propertyId = ?',
      [userId, propertyId]
    );

    return NextResponse.json({ message: 'Removed from favorites' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to remove favorite', message: error.message },
      { status: 500 }
    );
  }
}

