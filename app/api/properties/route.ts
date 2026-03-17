import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { PropertySearchParams } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const session = await getServerSession(authOptions);
    
    const params: PropertySearchParams = {
      state: searchParams.get('state') || undefined,
      city: searchParams.get('city') || undefined,
      propertyType: searchParams.get('propertyType') || undefined,
      listingType: searchParams.get('listingType') || undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      bedrooms: searchParams.get('bedrooms') ? parseInt(searchParams.get('bedrooms')!) : undefined,
      bathrooms: searchParams.get('bathrooms') ? parseInt(searchParams.get('bathrooms')!) : undefined,
      parking: searchParams.get('parking') ? parseInt(searchParams.get('parking')!) : undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '12'),
    };

    // Support filtering by userId for agent/owner views
    const userId = searchParams.get('userId') || undefined;

    let query = 'SELECT * FROM properties WHERE status = "active"';
    const conditions: string[] = [];
    const values: any[] = [];

    // Filter by userId if provided (for agent/owner to see only their properties)
    if (userId) {
      conditions.push('userId = ?');
      values.push(userId);
    }

    if (params.state) {
      conditions.push('state = ?');
      values.push(params.state);
    }

    if (params.city) {
      conditions.push('city = ?');
      values.push(params.city);
    }

    if (params.propertyType) {
      conditions.push('propertyType = ?');
      values.push(params.propertyType);
    }

    if (params.listingType) {
      conditions.push('listingType = ?');
      values.push(params.listingType);
    }

    if (params.minPrice) {
      conditions.push('price >= ?');
      values.push(params.minPrice);
    }

    if (params.maxPrice) {
      conditions.push('price <= ?');
      values.push(params.maxPrice);
    }

    if (params.bedrooms) {
      conditions.push('bedrooms >= ?');
      values.push(params.bedrooms);
    }

    if (params.bathrooms) {
      conditions.push('bathrooms >= ?');
      values.push(params.bathrooms);
    }

    if (params.parking) {
      conditions.push('parking >= ?');
      values.push(params.parking);
    }

    if (params.search) {
      conditions.push('(title LIKE ? OR description LIKE ? OR area LIKE ? OR address LIKE ?)');
      const searchTerm = `%${params.search}%`;
      values.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await db.query(countQuery, values) as any[];
    const total = countResult[0].total;

    // Add pagination
    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    const offset = (params.page - 1) * params.limit;
    values.push(params.limit, offset);

    const [properties] = await db.query(query, values) as any[];

    // Parse JSON fields
    const formattedProperties = properties.map((prop: any) => ({
      ...prop,
      images: typeof prop.images === 'string' ? JSON.parse(prop.images) : (prop.images || []),
      features: prop.features ? (typeof prop.features === 'string' ? JSON.parse(prop.features) : prop.features) : null,
      price: parseFloat(prop.price),
      areaSize: prop.areaSize ? parseFloat(prop.areaSize) : null,
      latitude: prop.latitude ? parseFloat(prop.latitude) : null,
      longitude: prop.longitude ? parseFloat(prop.longitude) : null,
    }));

    return NextResponse.json({
      properties: formattedProperties,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch properties', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const session = await getServerSession(authOptions);
    
    const {
      title,
      description,
      price,
      currency = 'NGN',
      propertyType,
      listingType,
      rentalDuration,
      state,
      city,
      area,
      address,
      latitude,
      longitude,
      bedrooms = 0,
      bathrooms = 0,
      parking = 0,
      areaSize,
      areaUnit = 'sqm',
      features,
      images = [],
      userId: providedUserId,
    } = data;

    if (!title || !description || !price || !propertyType || !listingType || !state || !city) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate rental duration for rent/lease properties
    if ((listingType === 'rent' || listingType === 'lease') && !rentalDuration) {
      return NextResponse.json(
        { error: 'Rental/lease duration is required for rent or lease properties' },
        { status: 400 }
      );
    }

    // Truncate rentalDuration if it's too long (database limit is VARCHAR(50))
    const finalRentalDuration = (listingType === 'rent' || listingType === 'lease') 
      ? (rentalDuration ? String(rentalDuration).substring(0, 50) : null)
      : null;

    // Use provided userId or session userId
    const userId = providedUserId || (session?.user as any)?.id || null;

    const propertyId = crypto.randomUUID();
    const imagesJson = JSON.stringify(images);
    const featuresJson = features ? JSON.stringify(features) : null;

    await db.query(
      `INSERT INTO properties (
        id, title, description, price, currency, propertyType, listingType, rentalDuration,
        state, city, area, address, latitude, longitude,
        bedrooms, bathrooms, parking, areaSize, areaUnit, features, images, userId, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        propertyId,
        title,
        description,
        price,
        currency,
        propertyType,
        listingType,
        finalRentalDuration,
        state,
        city,
        area || null,
        address || null,
        latitude || null,
        longitude || null,
        bedrooms,
        bathrooms,
        parking,
        areaSize || null,
        areaUnit,
        featuresJson,
        imagesJson,
        userId,
        'active',
      ]
    );

    const [newProperty] = await db.query(
      'SELECT * FROM properties WHERE id = ?',
      [propertyId]
    ) as any[];

    const property = newProperty[0];
    property.images = typeof property.images === 'string' ? JSON.parse(property.images) : property.images;
    property.features = property.features ? (typeof property.features === 'string' ? JSON.parse(property.features) : property.features) : null;
    property.price = parseFloat(property.price);

    return NextResponse.json(property, { status: 201 });
  } catch (error: any) {
    // Provide more detailed error information
    const errorMessage = error.message || 'Unknown error occurred';
    const errorCode = error.code || 'UNKNOWN_ERROR';
    
    return NextResponse.json(
      { 
        error: 'Failed to create property', 
        message: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
