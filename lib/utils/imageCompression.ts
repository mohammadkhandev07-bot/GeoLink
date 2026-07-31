import imageCompression from 'browser-image-compression'

/**
 * Compresses an image file in the browser before it ever reaches Supabase
 * Storage - this is what actually keeps storage size and egress (bandwidth)
 * usage low on the free plan. Videos are left untouched (this library only
 * handles images); non-image files are returned as-is.
 *
 * A 3-4MB phone photo typically comes back around 100-250KB after this,
 * with no visible quality loss at the sizes the app actually displays.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  // GIFs would lose their animation if run through this (it flattens to a
  // single frame), so leave them alone.
  if (file.type === 'image/gif') return file

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: 'image/webp',
    })
    // Keep a proper filename/extension so downstream code that reads
    // file.name (for the storage path extension) still works correctly.
    return new File([compressed], renameToWebp(file.name), { type: 'image/webp' })
  } catch (err) {
    // If compression fails for any reason, better to upload the original
    // than to block the person's post/story entirely.
    console.error('Image compression failed, uploading original:', err)
    return file
  }
}

function renameToWebp(filename: string) {
  const withoutExt = filename.replace(/\.[^/.]+$/, '')
  return `${withoutExt || 'image'}.webp`
}

// Long cache lifetime is safe here because every upload in this app goes to
// a fresh, uniquely-named path (timestamped filenames, no overwrites) - so
// the content at a given URL never changes, and can be cached aggressively
// both in the browser and on Supabase's CDN edge.
export const LONG_CACHE_CONTROL = '31536000' // seconds = 1 year
