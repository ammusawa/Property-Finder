import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canManageProperties } from '@/lib/permissions';

// For Cloudinary upload
async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'unsigned_upload';

  if (!cloudName) {
    throw new Error('Cloudinary not configured');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'property-finder');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Upload failed');
  }

  const data = await response.json();
  return data.secure_url;
}

// For base64 conversion (fallback if Cloudinary not configured)
// Note: This works in Node.js server environment using Buffer
async function convertToBase64(file: File): Promise<string> {
  try {
    // Convert File to ArrayBuffer, then to Buffer (Node.js compatible)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Convert to base64
    const base64String = buffer.toString('base64');
    
    // Get the MIME type from the file
    const mimeType = file.type || 'image/jpeg';
    
    // Return data URL format
    return `data:${mimeType};base64,${base64String}`;
  } catch (error: any) {
    throw new Error(`File conversion error: ${error.message || 'Failed to convert file to base64'}`);
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

    const userRole = (session.user as any)?.role;
    if (!canManageProperties(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden - insufficient permissions' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    let imageUrl: string;

    // Check if Cloudinary is configured
    const cloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME.trim() !== '';

    // Try Cloudinary first if configured
    if (cloudinaryConfigured) {
      try {
        imageUrl = await uploadToCloudinary(file);
      } catch (error: any) {
        const errorMessage = error.message || 'Cloudinary upload failed';
        return NextResponse.json(
          { 
            error: 'Failed to upload image to Cloudinary', 
            message: errorMessage.includes('Cloudinary') 
              ? 'Cloudinary upload failed. Please check your configuration or try a different image.' 
              : errorMessage 
          },
          { status: 500 }
        );
      }
    } else {
      // Fallback: convert to base64 for development (not recommended for production)
      // Note: Base64 images are stored directly in database, use Cloudinary for production
      // Validate file size for base64 (5MB max to avoid database issues)
      const base64MaxSize = 5 * 1024 * 1024; // 5MB for base64
      if (file.size > base64MaxSize) {
        return NextResponse.json(
          { 
            error: 'File too large for base64 conversion', 
            message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 5MB limit. Please configure Cloudinary or use a smaller image.` 
          },
          { status: 400 }
        );
      }

      try {
        imageUrl = await convertToBase64(file);
        if (!imageUrl) {
          return NextResponse.json(
            { 
              error: 'Failed to convert image to base64', 
              message: 'Image conversion failed. Please try a different image file.' 
            },
            { status: 500 }
          );
        }
      } catch (error: any) {
        return NextResponse.json(
          { 
            error: 'Failed to convert image', 
            message: error.message || 'Image conversion error. Please try a different image file.' 
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ url: imageUrl });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error.message || 'An unexpected error occurred during upload' 
      },
      { status: 500 }
    );
  }
}

