'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Property } from '@/types';
import { formatPrice } from '@/lib/utils';
import { showToast } from '@/components/Toast';
import {
  canManageProperties,
  canDeleteProperties,
  hasElevatedPrivileges as hasElevated,
} from '@/lib/permissions';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'agent' | 'owner' | 'moderator';
  createdAt: string;
  image?: string | null;
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const userRole = (session?.user as any)?.role;
  const currentUserId = (session?.user as any)?.id;

  // ── Properties state ────────────────────────────────────────────────────
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [uploading, setUploading] = useState(false);
  const [customDuration, setCustomDuration] = useState('');
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
  const [imageModal, setImageModal] = useState<{
    images: string[];
    currentIndex: number;
    propertyTitle: string;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Users state ─────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'properties' | 'users'>('properties');

  // ────────────────────────────────────────────────────────────────────────
  // Effects
  // ────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      if (!hasElevated(userRole)) {
        router.push('/');
        return;
      }

      fetchProperties();

      if (userRole === 'admin') {
        fetchUsers();
      }
    }
  }, [status, session, router, userRole]);

  // Modal scroll lock + keyboard handling
  useEffect(() => {
    const hasModalOpen =
      !!imageModal || !!deleteModal || showUserForm || showPropertyForm;

    document.body.style.overflow = hasModalOpen ? 'hidden' : 'unset';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteModal && !deleting) setDeleteModal(null);
        if (imageModal) setImageModal(null);
        if (showUserForm) setShowUserForm(false);
        if (showPropertyForm) setShowPropertyForm(false);
      }
    };

    if (hasModalOpen) window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [imageModal, deleteModal, showUserForm, showPropertyForm, deleting]);

  // ────────────────────────────────────────────────────────────────────────
  // Data fetching
  // ────────────────────────────────────────────────────────────────────────

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const url = hasElevated(userRole)
        ? '/api/properties?limit=100'
        : `/api/properties?userId=${currentUserId}&limit=100`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch properties');

      const data = await response.json();
      setProperties(data.properties || []);
    } catch (error) {
      showToast('Failed to load properties', 'error');
    } finally {
      setLoadingProperties(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/users');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load users');
      }

      setUsers(data.users || []);
    } catch (err) {
      showToast('Error fetching users', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // Property handlers
  // ────────────────────────────────────────────────────────────────────────

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
      const successfulUploads = uploadedUrls.filter((url) => url !== null) as string[];

      if (successfulUploads.length > 0) {
        setFormData({
          ...formData,
          images: [...formData.images, ...successfulUploads],
        });
      }
    } catch (error) {
      showToast('Error processing uploads', 'error');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
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
        userId: currentUserId,
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
        } catch {}
        throw new Error(errorMessage);
      }

      setShowPropertyForm(false);
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
    const canEdit = hasElevated(userRole) || property.userId === currentUserId;
    if (!canEdit) {
      showToast('You can only edit your own properties', 'warning');
      return;
    }

    setEditingProperty(property);
    const predefinedDurations = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', '2 years', '3 years', '5 years'];
    const isCustomDuration = property.rentalDuration && !predefinedDurations.includes(property.rentalDuration);
    setCustomDuration(isCustomDuration ? property.rentalDuration || '' : '');

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
    setShowPropertyForm(true);
  };

  const handleDeleteClick = (id: string, title: string, propertyUserId?: string) => {
    const canDelete = canDeleteProperties(userRole) || propertyUserId === currentUserId;
    if (!canDelete) {
      showToast('You do not have permission to delete this property', 'warning');
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

  // ────────────────────────────────────────────────────────────────────────
  // User handlers
  // ────────────────────────────────────────────────────────────────────────

  const handleAddUserClick = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleUserFormSubmit = async (userData: {
    name: string;
    email: string;
    password?: string;
    role: string;
  }) => {
    try {
      const method = editingUser ? 'PUT' : 'POST';
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      // Handle non-JSON responses (very important!)
      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch {
          errorData = { error: `Server returned ${res.status} - ${res.statusText}` };
        }
        throw new Error(errorData.error || 'Operation failed');
      }

      const result = await res.json();

      showToast(
        editingUser ? 'User updated successfully' : 'User created successfully',
        'success'
      );

      setShowUserForm(false);
      fetchUsers();
    } catch (err: any) {
      console.error('User form error:', err);
      showToast(err.message || 'Failed to save user', 'error');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Change role to ${newRole}?`)) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) throw new Error('Failed to update role');

      showToast('Role updated', 'success');
      fetchUsers();
    } catch (err) {
      showToast('Failed to update role', 'error');
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────

  if (status === 'loading' || loadingProperties || (userRole === 'admin' && loadingUsers)) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tabs */}
          <div className="mb-8 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('properties')}
                className={`pb-4 px-1 border-b-2 font-medium text-lg ${
                  activeTab === 'properties'
                    ? 'border-green-600 text-green-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Properties Management
              </button>

              {userRole === 'admin' && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`pb-4 px-1 border-b-2 font-medium text-lg ${
                    activeTab === 'users'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Users Management
                </button>
              )}
            </nav>
          </div>

          {/* ── Properties Tab ────────────────────────────────────────────── */}
          {activeTab === 'properties' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Property Management</h1>
                {(userRole === 'admin' || userRole === 'agent' || userRole === 'owner') && (
                  <button
                    onClick={() => {
                      setShowPropertyForm(true);
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
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
                  >
                    Add New Property
                  </button>
                )}
              </div>

              {/* Property Form */}
              {showPropertyForm && (
                <div className="fixed inset-0 bg-white bg-opacity-60 flex items-center justify-center z-50 p-4">
                  {/* Click outside to close */}
                  <div
                    className="absolute inset-0"
                    onClick={() => setShowPropertyForm(false)}
                  />

                  <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 z-10 bg-white px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                        {editingProperty ? 'Edit Property' : 'Add New Property'}
                      </h2>
                      <button
                        onClick={() => setShowPropertyForm(false)}
                        className="text-gray-500 hover:text-gray-700 text-3xl leading-none focus:outline-none"
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>
                
                {/* Scrollable content */}
                    <div className="p-6 md:p-8">
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Title *
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="e.g., 3 Bedroom Apartment in Lekki"
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
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="e.g., 45000000"
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
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
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
                                setFormData({
                                  ...formData,
                                  listingType: e.target.value,
                                  rentalDuration:
                                    e.target.value === 'rent' || e.target.value === 'lease'
                                      ? formData.rentalDuration
                                      : '',
                                });
                                setCustomDuration('');
                              }}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
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
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
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
                                  className="w-full mt-2 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="Lagos"
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
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="Lekki"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Area / Estate
                            </label>
                            <input
                              type="text"
                              value={formData.area}
                              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="Phase 1, Ikoyi"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bedrooms
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={formData.bedrooms}
                              onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bathrooms
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={formData.bathrooms}
                              onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Parking Spaces
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={formData.parking}
                              onChange={(e) => setFormData({ ...formData, parking: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description *
                          </label>
                          <textarea
                            required
                            rows={5}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Detailed description of the property..."
                          />
                        </div>

                        {/* Images Section */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Property Images
                          </label>

                          {/* Upload Area */}
                          <div className="mb-6">
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
                                <div className="w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 transition text-center">
                                  {uploading ? (
                                    <div className="flex flex-col items-center">
                                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
                                      <span className="text-gray-600">Uploading...</span>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-3xl mb-2 block">📁</span>
                                      <span className="text-gray-600 font-medium">
                                        Click or drag and drop images here
                                      </span>
                                      <span className="text-sm text-gray-400 mt-1">
                                        PNG, JPG, GIF • Max 10MB per image
                                      </span>
                                    </>
                                  )}
                                </div>
                              </label>
                            </div>
                          </div>

                          {/* URL Input */}
                          <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Or paste Image URLs (one per line)
                            </label>
                            <textarea
                              rows={3}
                              value={formData.images.filter((img) => img.startsWith('http')).join('\n')}
                              onChange={(e) => {
                                const urls = e.target.value
                                  .split('\n')
                                  .map((url) => url.trim())
                                  .filter(Boolean);
                                const existingUploaded = formData.images.filter((img) => !img.startsWith('http'));
                                setFormData({ ...formData, images: [...existingUploaded, ...urls] });
                              }}
                              placeholder="https://example.com/image1.jpg\nhttps://example.com/image2.jpg"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>

                          {/* Preview */}
                          {formData.images.length > 0 && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Preview ({formData.images.length} image{formData.images.length !== 1 ? 's' : ''})
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {formData.images.map((imageUrl, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={imageUrl}
                                      alt={`Preview ${index + 1}`}
                                      className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          'https://via.placeholder.com/300x200?text=Image+Error';
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newImages = formData.images.filter((_, i) => i !== index);
                                        setFormData({ ...formData, images: newImages });
                                      }}
                                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md hover:bg-red-600"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Submit & Cancel */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-200">
                          <button
                            type="submit"
                            className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          >
                            {editingProperty ? 'Update Property' : 'Add Property'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowPropertyForm(false)}
                            className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* Properties Table */}
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
                      const propertyImages = Array.isArray(property.images) ? property.images : [];
                      const firstImage = propertyImages.length > 0 ? propertyImages[0] : null;

                      return (
                        <tr key={property.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {firstImage ? (
                              <button
                                onClick={() => {
                                  if (propertyImages.length > 0) {
                                    setImageModal({
                                      images: propertyImages,
                                      currentIndex: 0,
                                      propertyTitle: property.title,
                                    });
                                  }
                                }}
                                className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 hover:border-green-500 hover:shadow-md transition-all cursor-pointer group"
                              >
                                <img
                                  src={firstImage}
                                  alt={property.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x80?text=No+Image';
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
                              <Link
                                href={`/properties/${property.id}`}
                                target="_blank"
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="View Property"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </Link>

                              {(hasElevated(userRole) || property.userId === currentUserId) && (
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

                              {(canDeleteProperties(userRole) || property.userId === currentUserId) && (
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
          )}

          {/* ── Users Tab ─────────────────────────────────────────────────── */}
          {activeTab === 'users' && userRole === 'admin' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <button
                  onClick={handleAddUserClick}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Add New User
                </button>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No users found
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {user.image && (
                                <img
                                  src={user.image}
                                  alt=""
                                  className="h-10 w-10 rounded-full mr-3 object-cover"
                                />
                              )}
                              <div className="text-sm font-medium text-gray-900">
                                {user.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              className="block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                              <option value="user">User</option>
                              <option value="agent">Agent</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                              <option value="owner">Owner</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Image Modal ───────────────────────────────────────────────────── */}
      {imageModal && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setImageModal(null)}
        >
          <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
            <button
              onClick={() => setImageModal(null)}
              className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2 hover:bg-black/70"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {imageModal.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageModal({
                      ...imageModal,
                      currentIndex: imageModal.currentIndex === 0 ? imageModal.images.length - 1 : imageModal.currentIndex - 1,
                    });
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-3 hover:bg-black/70"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageModal({
                      ...imageModal,
                      currentIndex: (imageModal.currentIndex + 1) % imageModal.images.length,
                    });
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-3 hover:bg-black/70"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            <div
              className="relative max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={imageModal.images[imageModal.currentIndex]}
                alt={`${imageModal.propertyTitle} - Image ${imageModal.currentIndex + 1}`}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x600?text=Image+Error';
                }}
              />
            </div>

            {imageModal.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                {imageModal.currentIndex + 1} / {imageModal.images.length}
              </div>
            )}

            <div className="absolute top-4 left-4 z-10 bg-black/50 text-white px-4 py-2 rounded-lg text-sm font-medium max-w-md truncate">
              {imageModal.propertyTitle}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
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

      {/* ── User Form Modal ───────────────────────────────────────────────── */}
      {showUserForm && (
        <div className="fixed inset-0 bg-white bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 md:p-8">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                  {editingUser ? 'Edit User' : 'Create New User'}
                </h2>
                <button
                  onClick={() => setShowUserForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();

                  const form = e.target as HTMLFormElement;
                  const formData = new FormData(form);

                  const payload: {
                    name: string;
                    email: string;
                    role: string;
                    password?: string;
                  } = {
                    name: formData.get('name') as string,
                    email: formData.get('email') as string,
                    role: formData.get('role') as string,
                  };

                  const password = formData.get('password') as string;
                  const confirmPassword = formData.get('confirmPassword') as string;

                  if (password) {
                    if (password !== confirmPassword) {
                      showToast('Passwords do not match', 'error');
                      return;
                    }
                    if (password.length < 6) {
                      showToast('Password must be at least 6 characters', 'error');
                      return;
                    }
                    payload.password = password;
                  }

                  handleUserFormSubmit(payload);
                }}
                className="space-y-5"
              >
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    defaultValue={editingUser?.name || ''}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="John Doe"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    defaultValue={editingUser?.email || ''}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="user@example.com"
                    disabled={!!editingUser}
                  />
                </div>

                {/* Password fields */}
                {!editingUser && (
                  <>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={6}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        minLength={6}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="••••••••"
                      />
                    </div>
                  </>
                )}

                {editingUser && (
                  <div className="pt-2">
                    <p className="text-sm text-gray-500 italic">
                      Leave password fields blank to keep current password.
                    </p>
                    <div className="mt-4">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        New Password (optional)
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        minLength={6}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Leave blank to keep unchanged"
                      />
                    </div>
                    <div className="mt-3">
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        minLength={6}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Must match new password"
                      />
                    </div>
                  </div>
                )}

                {/* Role */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    id="role"
                    name="role"
                    defaultValue={editingUser?.role || 'user'}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="user">User</option>
                    <option value="agent">Agent</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>

                {/* Profile image URL */}
                <div>
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Image URL (optional)
                  </label>
                  <input
                    id="image"
                    name="image"
                    type="url"
                    defaultValue={editingUser?.image || ''}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                {/* Buttons – NOW INSIDE the form */}
                <div className="flex gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowUserForm(false)}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                  >
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}