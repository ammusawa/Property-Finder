import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canDeleteProperties } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [properties] = await db.query(
      'SELECT * FROM properties WHERE id = ?',
      [id]
    ) as any[];

    if (properties.length === 0) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const property = properties[0];
    property.images = typeof property.images === 'string' ? JSON.parse(property.images) : (property.images || []);
    property.features = property.features ? (typeof property.features === 'string' ? JSON.parse(property.features) : property.features) : null;
    property.price = parseFloat(property.price);
    property.areaSize = property.areaSize ? parseFloat(property.areaSize) : null;
    property.latitude = property.latitude ? parseFloat(property.latitude) : null;
    property.longitude = property.longitude ? parseFloat(property.longitude) : null;

    return NextResponse.json(property);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch property', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    const {
      title,
      description,
      price,
      propertyType,
      listingType,
      state,
      city,
      area,
      address,
      latitude,
      longitude,
      bedrooms,
      bathrooms,
      parking,
      areaSize,
      areaUnit,
      features,
      images,
      status,
    } = data;

    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      values.push(price);
    }
    if (propertyType !== undefined) {
      updates.push('propertyType = ?');
      values.push(propertyType);
    }
    if (listingType !== undefined) {
      updates.push('listingType = ?');
      values.push(listingType);
    }
    if (data.rentalDuration !== undefined) {
      updates.push('rentalDuration = ?');
      values.push(data.rentalDuration || null);
    }
    if (state !== undefined) {
      updates.push('state = ?');
      values.push(state);
    }
    if (city !== undefined) {
      updates.push('city = ?');
      values.push(city);
    }
    if (area !== undefined) {
      updates.push('area = ?');
      values.push(area);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address);
    }
    if (latitude !== undefined) {
      updates.push('latitude = ?');
      values.push(latitude);
    }
    if (longitude !== undefined) {
      updates.push('longitude = ?');
      values.push(longitude);
    }
    if (bedrooms !== undefined) {
      updates.push('bedrooms = ?');
      values.push(bedrooms);
    }
    if (bathrooms !== undefined) {
      updates.push('bathrooms = ?');
      values.push(bathrooms);
    }
    if (parking !== undefined) {
      updates.push('parking = ?');
      values.push(parking);
    }
    if (areaSize !== undefined) {
      updates.push('areaSize = ?');
      values.push(areaSize);
    }
    if (areaUnit !== undefined) {
      updates.push('areaUnit = ?');
      values.push(areaUnit);
    }
    if (features !== undefined) {
      updates.push('features = ?');
      values.push(features ? JSON.stringify(features) : null);
    }
    if (images !== undefined) {
      updates.push('images = ?');
      values.push(JSON.stringify(images));
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(id);

    await db.query(
      `UPDATE properties SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [updated] = await db.query(
      'SELECT * FROM properties WHERE id = ?',
      [id]
    ) as any[];

    const property = updated[0];
    property.images = typeof property.images === 'string' ? JSON.parse(property.images) : property.images;
    property.features = property.features ? (typeof property.features === 'string' ? JSON.parse(property.features) : property.features) : null;
    property.price = parseFloat(property.price);

    return NextResponse.json(property);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update property', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the property to check ownership
    const [properties] = await db.query(
      'SELECT * FROM properties WHERE id = ?',
      [id]
    ) as any[];

    if (properties.length === 0) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const property = properties[0];
    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;

    // Check permissions: admin/moderator can delete any, agents/owners can delete their own
    const canDelete = canDeleteProperties(userRole) || property.userId === userId;

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to delete this property' },
        { status: 403 }
      );
    }

    await db.query('DELETE FROM properties WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Property deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete property', message: error.message },
      { status: 500 }
    );
  }
}

