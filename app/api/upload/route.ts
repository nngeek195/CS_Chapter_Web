import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'IEEE',
  api_key: process.env.CLOUDINARY_API_KEY || '922542265587147',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'euBvAqlnJ6JPdiTzXZ5eiuNa6yc',
  secure: true,
});

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let fileToUpload: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mimeType = file.type || 'image/jpeg';
      fileToUpload = `data:${mimeType};base64,${buffer.toString('base64')}`;
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      fileToUpload = body.data || body.file || body.image;
    }

    if (!fileToUpload) {
      return NextResponse.json({ error: 'No image data received' }, { status: 400 });
    }

    const uploadResponse = await cloudinary.uploader.upload(fileToUpload, {
      folder: 'ieeecs_chapter',
      resource_type: 'auto',
    });

    return NextResponse.json({
      url: uploadResponse.secure_url || uploadResponse.url,
      public_id: uploadResponse.public_id,
      width: uploadResponse.width,
      height: uploadResponse.height,
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
