'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Property } from '@/types';
import { formatPrice } from '@/lib/utils';
import { showToast } from '@/components/Toast';
import { canManageProperties } from '@/lib/permissions';

export default function MyPropertiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [uploading, setUploading] = useState(false);
  const [customDuration, setCustomDuration] = useState('');
  const [imageModal, setImageModal] = useState<{ images: string[]; currentIndex: number; propertyTitle: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    propertyType: 'apartment',
    listingType: 'sale',
    rentalDuration: '',
    state: '',
    city: '',
    area: '',
    address: '',
    latitude: '',
    longitude: '',
    bedrooms: '0',
    bathrooms: '0',
    parking: '0',
    areaSize: '',
    areaUnit: 'sqm',
    images: [] as string[],
  });

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      // Only allow owners and agents to access this page
      if (userRole !== 'owner' && userRole !== 'agent') {
        router.push('/');
        return;
      }
      fetchProperties();
    }
  }, [status, session, router, userRole]);

  // Handle body scroll lock and keyboard navigation for modals
  useEffect(() => {
    const hasModalOpen = !!imageModal || !!deleteModal;
    
    if (hasModalOpen) {
      // Prevent body scroll when any modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteModal && !deleting) {
          setDeleteModal(null);
        } else if (imageModal) {
          setImageModal(null);
        }
      } else if (imageModal && e.key === 'ArrowLeft' && imageModal.images.length > 1) {
        setImageModal({
          ...imageModal,
          currentIndex: imageModal.currentIndex === 0 ? imageModal.images.length - 1 : imageModal.currentIndex - 1,
        });
      } else if (imageModal && e.key === 'ArrowRight' && imageModal.images.length > 1) {
        setImageModal({
          ...imageModal,
          currentIndex: (imageModal.currentIndex + 1) % imageModal.images.length,
        });
      }
    };

    if (hasModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (hasModalOpen) {
        document.body.style.overflow = 'unset';
      }
    };
  }, [imageModal, deleteModal, deleting]);

  const fetchProperties = async () => {
    try {
      // Always show only the user's own properties
      const url = `/api/properties?userId=${(session?.user as any)?.id}&limit=100`;
      
      const response = await fetch(url);
      const data = await response.json();
      setProperties(data.properties || []);
    } catch (error) {
      // Error fetching properties
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const data = await response.json();
        return data.url;
      } catch (error: any) {
        showToast(`Failed to upload ${file.name}: ${error.message || 'Unknown error'}`, 'error');
        return null;
      }
    });

    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      const successfulUploads = uploadedUrls.filter(url => url !== null) as string[];
      
      if (successfulUploads.length > 0) {
        setFormData({
          ...formData,
          images: [...formData.images, ...successfulUploads],
        });
      }
    } catch (error) {
      // Error processing uploads
    } finally {
      setUploading(false);
      // Reset the input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const propertyData = {
        ...formData,
        price: parseFloat(formData.price),
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseInt(formData.bathrooms),
        parking: parseInt(formData.parking),
        areaSize: formData.areaSize ? parseFloat(formData.areaSize) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        images: formData.images.filter((img) => img.trim() !== ''),
        userId: (session?.user as any)?.id, // Link property to user
      };

      let response;
      if (editingProperty) {
        response = await fetch(`/api/properties/${editingProperty.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(propertyData),
        });
      } else {
        response = await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(propertyData),
        });
      }

      if (!response.ok) {
        let errorMessage = 'Failed to save property';
        try {
          const data = await response.json();
          errorMessage = data.message || data.error || errorMessage;
          if (data.details) {
            errorMessage += `: ${data.details}`;
          }
        } catch (e) {
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      setShowForm(false);
      setEditingProperty(null);
      setFormData({
        title: '',
        description: '',
        price: '',
        propertyType: 'apartment',
        listingType: 'sale',
        rentalDuration: '',
        state: '',
        city: '',
        area: '',
        address: '',
        latitude: '',
        longitude: '',
        bedrooms: '0',
        bathrooms: '0',
        parking: '0',
        areaSize: '',
        areaUnit: 'sqm',
        images: [],
      });
      setCustomDuration('');
      fetchProperties();
      showToast(editingProperty ? 'Property updated successfully' : 'Property created successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Error saving property', 'error');
    }
  };

  const handleEdit = (property: Property) => {
    // Owners/agents can only edit their own properties
    if (property.userId !== (session?.user as any)?.id) {
      showToast('You can only edit your own properties', 'warning');
      return;
    }

    setEditingProperty(property);
    const predefinedDurations = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', '2 years', '3 years', '5 years'];
    const isCustomDuration = property.rentalDuration && !predefinedDurations.includes(property.rentalDuration);
    if (isCustomDuration) {
      setCustomDuration(property.rentalDuration || '');
    } else {
      setCustomDuration('');
    }
    setFormData({
      title: property.title,
      description: property.description,
      price: property.price.toString(),
      propertyType: property.propertyType,
      listingType: property.listingType,
      rentalDuration: isCustomDuration ? 'Custom' : (property.rentalDuration || ''),
      state: property.state,
      city: property.city,
      area: property.area || '',
      address: property.address || '',
      latitude: property.latitude?.toString() || '',
      longitude: property.longitude?.toString() || '',
      bedrooms: property.bedrooms.toString(),
      bathrooms: property.bathrooms.toString(),
      parking: property.parking.toString(),
      areaSize: property.areaSize?.toString() || '',
      areaUnit: property.areaUnit,
      images: property.images || [],
    });
    setShowForm(true);
  };

  const handleDeleteClick = (id: string, title: string, propertyUserId?: string) => {
    // Owners/agents can only delete their own properties
    if (propertyUserId !== (session?.user as any)?.id) {
      showToast('You can only delete your own properties', 'warning');
      return;
    }
    setDeleteModal({ id, title });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/properties/${deleteModal.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to delete property');
      }

      fetchProperties();
      showToast('Property deleted successfully', 'success');
      setDeleteModal(null);
    } catch (error: any) {
      showToast(error.message || 'Error deleting property', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              My Properties
            </h1>
            {(userRole === 'agent' || userRole === 'owner') && (
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingProperty(null);
                  setFormData({
                    title: '',
                    description: '',
                    price: '',
                    propertyType: 'apartment',
                    listingType: 'sale',
                    rentalDuration: '',
                    state: '',
                    city: '',
                    area: '',
                    address: '',
                    latitude: '',
                    longitude: '',
                    bedrooms: '0',
                    bathrooms: '0',
                    parking: '0',
                    areaSize: '',
                    areaUnit: 'sqm',
                    images: [],
                  });
                  setCustomDuration('');
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                Add New Property
              </button>
            )}
          </div>

          {showForm && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">
                {editingProperty ? 'Edit Property' : 'Add New Property'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₦) *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property Type *
                    </label>
                    <select
                      required
                      value={formData.propertyType}
                      onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="apartment">Apartment</option>
                      <option value="house">House</option>
                      <option value="land">Land</option>
                      <option value="commercial">Commercial</option>
                      <option value="office">Office</option>
                      <option value="shop">Shop</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Listing Type *
                    </label>
                    <select
                      required
                      value={formData.listingType}
                      onChange={(e) => {
          setFormData({ ...formData, listingType: e.target.value, rentalDuration: (e.target.value === 'rent' || e.target.value === 'lease') ? formData.rentalDuration : '' });
          setCustomDuration('');
        }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="sale">For Sale</option>
                      <option value="rent">For Rent</option>
                      <option value="lease">For Lease</option>
                    </select>
                  </div>
                  {(formData.listingType === 'rent' || formData.listingType === 'lease') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rental/Lease Duration *
                      </label>
                      <select
                        required
                        value={formData.rentalDuration}
                        onChange={(e) => setFormData({ ...formData, rentalDuration: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Select Duration</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly (3 months)</option>
                        <option value="Semi-Annual">Semi-Annual (6 months)</option>
                        <option value="Annual">Annual (1 year)</option>
                        <option value="2 years">2 years</option>
                        <option value="3 years">3 years</option>
                        <option value="5 years">5 years</option>
                        <option value="Custom">Custom</option>
                      </select>
                      {formData.rentalDuration === 'Custom' && (
                        <input
                          type="text"
                          required
                          placeholder="e.g., 18 months, 2.5 years"
                          value={customDuration}
                          onChange={(e) => {
                            setCustomDuration(e.target.value);
                            setFormData({ ...formData, rentalDuration: e.target.value });
                          }}
                          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        />
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area
                    </label>
                    <input
                      type="text"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parking
                    </label>
                    <input
                      type="number"
                      value={formData.parking}
                      onChange={(e) => setFormData({ ...formData, parking: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Images
                  </label>
                  
                  {/* Image Upload Section */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Images
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploading}
                        />
                        <div className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 transition text-center">
                          {uploading ? (
                            <span className="text-gray-500">Uploading...</span>
                          ) : (
                            <span className="text-gray-600">
                              📁 Click to upload or drag and drop
                              <br />
                              <span className="text-sm text-gray-400">PNG, JPG, GIF up to 10MB</span>
                            </span>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Image URL Input Section */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Or Enter Image URLs (one per line)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.images.filter(img => img.startsWith('http')).join('\n')}
                      onChange={(e) => {
                        const urls = e.target.value.split('\n').filter(url => url.trim() !== '');
                        const uploadedImages = formData.images.filter(img => !img.startsWith('http'));
                        setFormData({ ...formData, images: [...uploadedImages, ...urls] });
                      }}
                      placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  {/* Image Preview */}
                  {formData.images.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preview ({formData.images.length} image{formData.images.length !== 1 ? 's' : ''})
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {formData.images.map((imageUrl, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={imageUrl}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Image+Error';
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newImages = formData.images.filter((_, i) => i !== index);
                                setFormData({ ...formData, images: newImages });
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                  >
                    {editingProperty ? 'Update Property' : 'Add Property'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingProperty(null);
                    }}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {properties.map((property) => {
                  const propertyImages = property.images && Array.isArray(property.images) ? property.images : [];
                  const firstImage = propertyImages.length > 0 ? propertyImages[0] : null;
                  
                  return (
                    <tr key={property.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {firstImage ? (
                          <button
                            onClick={() => {
                              const propertyImages = property.images && Array.isArray(property.images) ? property.images : [];
                              if (propertyImages.length > 0) {
                                setImageModal({
                                  images: propertyImages,
                                  currentIndex: 0,
                                  propertyTitle: property.title,
                                });
                              }
                            }}
                            className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 hover:border-green-500 hover:shadow-md transition-all cursor-pointer group"
                            title="Click to view full image"
                          >
                            <img
                              src={firstImage}
                              alt={property.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://via.placeholder.com/80x80?text=No+Image';
                                target.onerror = null; // Prevent infinite loop
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </button>
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center border border-gray-300">
                            <span className="text-xs text-gray-400">No Image</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{property.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {property.propertyType} - {property.listingType}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatPrice(property.price, property.currency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {property.city}, {property.state}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          {/* View Icon */}
                          <Link
                            href={`/properties/${property.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="View Property"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>

                          {/* Edit Icon */}
                          {property.userId === (session?.user as any)?.id && (
                            <button
                              onClick={() => handleEdit(property)}
                              className="text-green-600 hover:text-green-800 transition-colors"
                              title="Edit Property"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}

                          {/* Delete Icon */}
                          {property.userId === (session?.user as any)?.id && (
                            <button
                              onClick={() => handleDeleteClick(property.id, property.title, property.userId)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Delete Property"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Image Modal/Lightbox */}
      {imageModal && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setImageModal(null)}
        >
          <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => setImageModal(null)}
              className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2 hover:bg-black/70"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Previous Button */}
            {imageModal.images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImageModal({
                    ...imageModal,
                    currentIndex: imageModal.currentIndex === 0 ? imageModal.images.length - 1 : imageModal.currentIndex - 1,
                  });
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-3 hover:bg-black/70"
                aria-label="Previous image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Next Button */}
            {imageModal.images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImageModal({
                    ...imageModal,
                    currentIndex: (imageModal.currentIndex + 1) % imageModal.images.length,
                  });
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-3 hover:bg-black/70"
                aria-label="Next image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Image */}
            <div
              className="relative max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={imageModal.images[imageModal.currentIndex]}
                alt={`${imageModal.propertyTitle} - Image ${imageModal.currentIndex + 1}`}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/800x600?text=Image+Error';
                  target.onerror = null;
                }}
              />
            </div>

            {/* Image Counter */}
            {imageModal.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                {imageModal.currentIndex + 1} / {imageModal.images.length}
              </div>
            )}

            {/* Property Title */}
            <div className="absolute top-4 left-4 z-10 bg-black/50 text-white px-4 py-2 rounded-lg text-sm font-medium max-w-md truncate">
              {imageModal.propertyTitle}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !deleting && setDeleteModal(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Delete Property</h3>
                <p className="text-sm text-gray-500 mt-1">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold">"{deleteModal.title}"</span>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This will permanently remove the property and all associated data from the system.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291a7.962 7.962 0 014.292-1.707M6 18.709A7.962 7.962 0 0112 20c1.892 0 3.636-.617 5.044-1.657M18 15.291a7.962 7.962 0 01-1.707 4.292M20 12a8 8 0 01-8 8v-4a4 4 0 004-4h4z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Property
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
