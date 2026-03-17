const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'property_finder',
};

// Sample users with different roles
const users = [
  {
    id: 'user-001',
    name: 'Ahmadu Bello',
    email: 'admin@propertyfinder.ng',
    password: 'admin123',
    role: 'admin',
    emailVerified: new Date(),
  },
  {
    id: 'user-002',
    name: 'Umar Sani',
    email: 'umar.sani@example.com',
    password: 'password123',
    role: 'user',
    emailVerified: new Date(),
  },
  {
    id: 'user-003',
    name: 'Fatima Abdullahi',
    email: 'fatima.agent@example.com',
    password: 'password123',
    role: 'agent',
    emailVerified: new Date(),
  },
  {
    id: 'user-004',
    name: 'Musa Haruna',
    email: 'musa.owner@example.com',
    password: 'password123',
    role: 'owner',
    emailVerified: new Date(),
  },
  {
    id: 'user-005',
    name: 'Aisha Lawal',
    email: 'moderator@example.com',
    password: 'password123',
    role: 'moderator',
    emailVerified: new Date(),
  },
  {
    id: 'user-006',
    name: 'Yusuf Ibrahim',
    email: 'yusuf@example.com',
    password: 'password123',
    role: 'agent',
    emailVerified: new Date(),
  },
  {
    id: 'user-007',
    name: 'Zainab Abubakar',
    email: 'zainab@example.com',
    password: 'password123',
    role: 'user',
    emailVerified: new Date(),
  },
];

// Sample properties with Nigerian locations
const properties = [
  {
    id: 'prop-001',
    title: 'Beautiful 3 Bedroom Apartment in Victoria Island',
    description: 'Spacious 3 bedroom apartment with modern amenities in the heart of Victoria Island. Features include fully fitted kitchen, ensuite bathrooms, parking space, and 24/7 security. Perfect for professionals and families. Close to business districts, schools, and shopping malls.',
    price: 25000000,
    currency: 'NGN',
    propertyType: 'apartment',
    listingType: 'sale',
    state: 'Lagos',
    city: 'Lagos Island',
    area: 'Victoria Island',
    address: '15 Ahmadu Bello Way, Victoria Island, Lagos',
    latitude: 6.4281,
    longitude: 3.4219,
    bedrooms: 3,
    bathrooms: 3,
    parking: 2,
    areaSize: 180,
    areaUnit: 'sqm',
    features: JSON.stringify(['Swimming Pool', 'Gym', '24/7 Security', 'Generator', 'Water System']),
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    ]),
    userId: 'user-003',
    status: 'active',
  },
  {
    id: 'prop-002',
    title: 'Luxury 4 Bedroom Duplex in Lekki',
    description: 'Elegant 4 bedroom duplex with BQ in prime Lekki location. Features include marble flooring, imported kitchen cabinets, spacious living areas, master bedroom with walk-in closet, and servant quarters. Ideal for executives and large families.',
    price: 85000000,
    currency: 'NGN',
    propertyType: 'house',
    listingType: 'sale',
    state: 'Lagos',
    city: 'Lekki',
    area: 'Lekki Phase 1',
    address: 'Block 15, Plot 8, Lekki Phase 1, Lagos',
    latitude: 6.4654,
    longitude: 3.4977,
    bedrooms: 4,
    bathrooms: 5,
    parking: 3,
    areaSize: 450,
    areaUnit: 'sqm',
    features: JSON.stringify(['BQ', 'Servant Quarters', 'Generator', 'Water System', 'Security Gate', 'Garden']),
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    ]),
    userId: 'user-004',
    status: 'active',
  },
  {
    id: 'prop-003',
    title: 'Modern 2 Bedroom Self-Contained Flat in Ikeja',
    description: 'Well-furnished 2 bedroom self-contained flat available for rent in Ikeja. Includes air conditioning, fully equipped kitchen, internet-ready, and water heater. Perfect for young professionals or couples. Close to airport and business areas.',
    price: 1500000,
    currency: 'NGN',
    propertyType: 'apartment',
    listingType: 'rent',
    state: 'Lagos',
    city: 'Ikeja',
    area: 'Allen Avenue',
    address: '25 Allen Avenue, Ikeja, Lagos',
    latitude: 6.5244,
    longitude: 3.3792,
    bedrooms: 2,
    bathrooms: 1,
    parking: 1,
    areaSize: 85,
    areaUnit: 'sqm',
    features: JSON.stringify(['Air Conditioning', 'Furnished', 'Internet Ready', 'Water Heater']),
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
    ]),
    userId: 'user-003',
    status: 'active',
  },
  {
    id: 'prop-004',
    title: 'Commercial Office Space in Abuja Central Business District',
    description: 'Prime office space for lease in Abuja CBD. Fully serviced offices with reception area, meeting rooms, and parking. Suitable for businesses, startups, and professional services. Modern facilities with high-speed internet and security.',
    price: 2500000,
    currency: 'NGN',
    propertyType: 'office',
    listingType: 'lease',
    state: 'FCT',
    city: 'Abuja',
    area: 'Central Business District',
    address: 'Plot 123, Central Area, Abuja',
    latitude: 9.0765,
    longitude: 7.3986,
    bedrooms: 0,
    bathrooms: 4,
    parking: 10,
    areaSize: 300,
    areaUnit: 'sqm',
    features: JSON.stringify(['Reception', 'Meeting Rooms', 'Parking', 'Security', 'Internet', 'Air Conditioning']),
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
    ]),
    userId: 'user-006',
    status: 'active',
  },
  {
    id: 'prop-005',
    title: '5 Bedroom Mansion in Gwarinpa, Abuja',
    description: 'Massive 5 bedroom mansion with BQ and swimming pool in Gwarinpa. Features include home cinema, gym, guest house, and landscaped garden. Perfect for high-net-worth individuals. Fully secured estate.',
    price: 120000000,
    currency: 'NGN',
    propertyType: 'house',
    listingType: 'sale',
    state: 'FCT',
    city: 'Abuja',
    area: 'Gwarinpa',
    address: 'Plot 456, Gwarinpa Estate, Abuja',
    latitude: 9.1383,
    longitude: 7.4069,
    bedrooms: 5,
    bathrooms: 6,
    parking: 4,
    areaSize: 750,
    areaUnit: 'sqm',
    features: JSON.stringify(['Swimming Pool', 'Home Cinema', 'Gym', 'BQ', 'Guest House', 'Generator', 'Security']),
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
    ]),
    userId: 'user-003',
    status: 'active',
  },
  {
    id: 'prop-006',
    title: '1 Bedroom Boys Quarters (Face-me-I-face-you) in Surulere',
    description: '1 bedroom boys quarters in a face-me-I-face-you building. Self-contained with private bathroom and kitchen. Water and light available. Perfect for single professionals or students. Close to National Stadium.',
    price: 350000,
    currency: 'NGN',
    propertyType: 'apartment',
    listingType: 'rent',
    state: 'Lagos',
    city: 'Surulere',
    area: 'Surulere',
    address: '12 Adeniran Ogunsanya Street, Surulere, Lagos',
    latitude: 6.5000,
    longitude: 3.3500,
    bedrooms: 1,
    bathrooms: 1,
    parking: 0,
    areaSize: 25,
    areaUnit: 'sqm',
    features: JSON.stringify(['Self-Contained', 'Water Available', 'Light Available']),
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    ]),
    userId: 'user-004',
    status: 'active',
  },
  {
    id: 'prop-007',
    title: 'Vacant Land for Sale in Port Harcourt',
    description: 'Prime land measuring 2 plots (1000 sqm) in Port Harcourt. Suitable for residential or commercial development. Clear title and survey plan available. Located in developing area with good road access.',
    price: 15000000,
    currency: 'NGN',
    propertyType: 'land',
    listingType: 'sale',
    state: 'Rivers',
    city: 'Port Harcourt',
    area: 'Eleme',
    address: 'Along Eleme Road, Port Harcourt',
    latitude: 4.8156,
    longitude: 7.0498,
    bedrooms: 0,
    bathrooms: 0,
    parking: 0,
    areaSize: 1000,
    areaUnit: 'sqm',
    features: JSON.stringify(['Clear Title', 'Survey Plan', 'Good Road Access']),
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    ]),
    userId: 'user-006',
    status: 'active',
  },
  {
    id: 'prop-008',
    title: '3 Bedroom Flat in Ibadan',
    description: 'Comfortable 3 bedroom flat in Ibadan available for rent. Features include spacious living room, modern kitchen, and good ventilation. Close to University of Ibadan and shopping areas.',
    price: 800000,
    currency: 'NGN',
    propertyType: 'apartment',
    listingType: 'rent',
    state: 'Oyo',
    city: 'Ibadan',
    area: 'Agbowo',
    address: 'Block 3, Agbowo Area, Ibadan',
    latitude: 7.4419,
    longitude: 3.8969,
    bedrooms: 3,
    bathrooms: 2,
    parking: 1,
    areaSize: 120,
    areaUnit: 'sqm',
    features: JSON.stringify(['Good Ventilation', 'Spacious']),
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    ]),
    userId: 'user-004',
    status: 'active',
  },
  {
    id: 'prop-009',
    title: 'Shop Space for Lease in Kano',
    description: 'Retail shop space available for lease in busy Kano market area. High foot traffic location perfect for retail business. Includes storage area and parking for customers.',
    price: 500000,
    currency: 'NGN',
    propertyType: 'shop',
    listingType: 'lease',
    state: 'Kano',
    city: 'Kano',
    area: 'Sabon Gari',
    address: 'Shop 15, Sabon Gari Market, Kano',
    latitude: 11.9964,
    longitude: 8.5167,
    bedrooms: 0,
    bathrooms: 1,
    parking: 3,
    areaSize: 50,
    areaUnit: 'sqm',
    features: JSON.stringify(['High Foot Traffic', 'Storage Area', 'Parking']),
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    ]),
    userId: 'user-003',
    status: 'active',
  },
  {
    id: 'prop-010',
    title: 'Commercial Building in Enugu',
    description: '4-storey commercial building for sale in Enugu. Ground floor suitable for shops, upper floors for offices. Great location in commercial hub. Fully serviced with generator and water system.',
    price: 65000000,
    currency: 'NGN',
    propertyType: 'commercial',
    listingType: 'sale',
    state: 'Enugu',
    city: 'Enugu',
    area: 'Independence Layout',
    address: '45 Independence Layout, Enugu',
    latitude: 6.4474,
    longitude: 7.5064,
    bedrooms: 0,
    bathrooms: 8,
    parking: 12,
    areaSize: 800,
    areaUnit: 'sqm',
    features: JSON.stringify(['4 Floors', 'Generator', 'Water System', 'Parking']),
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
    ]),
    userId: 'user-006',
    status: 'active',
  },
];

// Sample favorites
const favorites = [
  { userId: 'user-002', propertyId: 'prop-001' },
  { userId: 'user-002', propertyId: 'prop-003' },
  { userId: 'user-007', propertyId: 'prop-002' },
  { userId: 'user-007', propertyId: 'prop-005' },
  { userId: 'user-007', propertyId: 'prop-008' },
];

async function seedDatabase() {
  let connection;
  
  try {
    console.log('🌱 Starting database seeding...\n');
    connection = await mysql.createConnection(dbConfig);
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('⚠️  Clearing existing data...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE favorites');
    await connection.query('TRUNCATE TABLE properties');
    await connection.query('TRUNCATE TABLE accounts');
    await connection.query('TRUNCATE TABLE sessions');
    await connection.query('TRUNCATE TABLE verification_tokens');
    await connection.query('DELETE FROM users WHERE id LIKE "user-%" OR id LIKE "admin-001"');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Existing data cleared\n');
    
    // Seed Users
    console.log('👥 Seeding users...');
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await connection.query(
        `INSERT INTO users (id, name, email, password, role, emailVerified) 
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), password = VALUES(password), role = VALUES(role)`,
        [user.id, user.name, user.email, hashedPassword, user.role, user.emailVerified]
      );
      console.log(`   ✓ ${user.name} (${user.role})`);
    }
    console.log(`✅ Created ${users.length} users\n`);
    
    // Seed Properties
    console.log('🏠 Seeding properties...');
    for (const property of properties) {
      try {
        await connection.query(
          `INSERT INTO properties (
            id, title, description, price, currency, propertyType, listingType,
            state, city, area, address, latitude, longitude,
            bedrooms, bathrooms, parking, areaSize, areaUnit, features, images, status, userId
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            property.id,
            property.title,
            property.description,
            property.price,
            property.currency,
            property.propertyType,
            property.listingType,
            property.state,
            property.city,
            property.area,
            property.address,
            property.latitude,
            property.longitude,
            property.bedrooms,
            property.bathrooms,
            property.parking,
            property.areaSize,
            property.areaUnit,
            property.features,
            property.images,
            property.status,
            property.userId,
          ]
        );
        console.log(`   ✓ ${property.title.substring(0, 50)}...`);
      } catch (err) {
        console.error(`   ✗ Error inserting property: ${err.message}`);
        console.error(`   Property: ${property.title}`);
        throw err;
      }
    }
    console.log(`✅ Created ${properties.length} properties\n`);
    
    // Seed Favorites
    console.log('❤️  Seeding favorites...');
    for (const favorite of favorites) {
      await connection.query(
        `INSERT INTO favorites (id, userId, propertyId) 
         VALUES (UUID(), ?, ?)
         ON DUPLICATE KEY UPDATE userId = userId`,
        [favorite.userId, favorite.propertyId]
      );
    }
    console.log(`✅ Created ${favorites.length} favorites\n`);
    
    // Summary
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [propCount] = await connection.query('SELECT COUNT(*) as count FROM properties');
    const [favCount] = await connection.query('SELECT COUNT(*) as count FROM favorites');
    
    console.log('📊 Database Summary:');
    console.log(`   Users: ${userCount[0].count}`);
    console.log(`   Properties: ${propCount[0].count}`);
    console.log(`   Favorites: ${favCount[0].count}`);
    console.log('\n✅ Database seeding completed successfully!\n');
    
    console.log('🔑 Test Account Credentials:');
    console.log('   Admin: admin@propertyfinder.ng / admin123');
    console.log('   User: umar.sani@example.com / password123');
    console.log('   Agent: fatima.agent@example.com / password123');
    console.log('   Owner: musa.owner@example.com / password123');
    console.log('   Moderator: moderator@example.com / password123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure MySQL is running!');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedDatabase();

