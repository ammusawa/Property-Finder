'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';
import { Property } from '@/types';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const imageUrl = property.images && property.images.length > 0 
    ? property.images[0] 
    : 'https://via.placeholder.com/400x300?text=No+Image';

  return (
    <Link href={`/properties/${property.id}`}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative h-48 w-full bg-gray-200">
          {imageUrl && imageUrl !== 'https://via.placeholder.com/400x300?text=No+Image' ? (
            imageUrl.startsWith('data:') || imageUrl.startsWith('http') ? (
              imageUrl.startsWith('data:') ? (
                // Base64 image - use regular img tag
                <img
                  src={imageUrl}
                  alt={property.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                    target.onerror = null;
                  }}
                />
              ) : (
                // HTTP/HTTPS URL - use Next.js Image component
                <Image
                  src={imageUrl}
                  alt={property.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                  }}
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              property.listingType === 'sale' 
                ? 'bg-blue-500 text-white' 
                : 'bg-green-500 text-white'
            }`}>
              {property.listingType === 'sale' ? 'For Sale' : property.listingType === 'rent' ? 'For Rent' : 'For Lease'}
            </span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1 text-gray-900">
            {property.title}
          </h3>
          <p className="text-green-600 font-bold text-xl mb-2">
            {formatPrice(property.price, property.currency)}
            {(property.listingType === 'rent' || property.listingType === 'lease') && property.rentalDuration && (
              <span className="text-sm font-normal text-gray-500 ml-1">
                / {property.rentalDuration}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-2">
            <span>{property.bedrooms} Bed</span>
            <span>•</span>
            <span>{property.bathrooms} Bath</span>
            {property.parking > 0 && (
              <>
                <span>•</span>
                <span>{property.parking} Parking</span>
              </>
            )}
            {property.areaSize && (
              <>
                <span>•</span>
                <span>{property.areaSize} {property.areaUnit}</span>
              </>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate">
            {property.area || property.city}, {property.state}
          </p>
        </div>
      </div>
    </Link>
  );
}
