import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getCaller, can, forbidden } from '@/lib/serverAuth';

export const maxDuration = 120;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Node's https module ignores HTTPS_PROXY, and the SDK's own `api_proxy`
// option doesn't actually tunnel. On networks where outbound traffic must go
// through a proxy (e.g. the university network), route uploads through it
// explicitly; with no proxy set (e.g. on Vercel) the agent is not used.
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;


export async function POST(request: NextRequest) {
  try {
    // Only signed-in admins / board members with at least one permission may upload.
    const caller = await getCaller(request);
    if (caller instanceof NextResponse) return caller;
    if (!can(caller)) return forbidden('You do not have permission to upload files');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }
    

    // Convert file to a base64 data URI — avoids stream plumbing timeouts
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    const uploadResponse = await cloudinary.uploader.upload(dataUri, {
      folder: 'ieeecs_chapter',
      resource_type: 'auto',
      // The SDK only reads `timeout` per call, not from cloudinary.config().
      timeout: 120000,
      ...(proxyAgent && { agent: proxyAgent }),
    });

    
    return NextResponse.json({
      url: uploadResponse.secure_url,
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
