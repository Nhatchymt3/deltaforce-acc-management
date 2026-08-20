export interface CompressOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

const DEFAULT_OPTIONS: CompressOptions = {
  maxSizeMB: 0.4, // Standard ~400KB to stay well under Vercel payload limits & saves Supabase storage
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  try {
    const browserImageCompression = (await import('browser-image-compression')).default;
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    const compressedBlob = await browserImageCompression(file, mergedOptions);
    return new File([compressedBlob], file.name, {
      type: compressedBlob.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn('[Image Compression Failed, using original file]:', error);
    return file;
  }
}

export async function compressMultipleImages(files: File[], options?: CompressOptions): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, options)));
}
