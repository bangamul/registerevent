import imageCompression from 'browser-image-compression'

export async function compressImage(imageFile: File): Promise<File> {
  const options = {
    maxSizeMB: 0.1, // 100kb max size
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  }
  
  try {
    const compressedFile = await imageCompression(imageFile, options)
    return compressedFile
  } catch (error) {
    console.error('Image compression failed:', error)
    throw error
  }
}
