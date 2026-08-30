import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { put } from '@vercel/blob';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 });
  }
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
  }

  const filename = `${randomUUID()}.${extension}`;

  // In production (Vercel), the filesystem is read-only/ephemeral, so real
  // photo storage goes through Vercel Blob. Locally (no token set), fall
  // back to writing straight into public/ for simple dev-time testing.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`flower-images/${filename}`, file, { access: 'public' });
    return NextResponse.json({ url: blob.url });
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'flower-images');
  await mkdir(uploadsDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);

  return NextResponse.json({ url: `/flower-images/${filename}` });
}
