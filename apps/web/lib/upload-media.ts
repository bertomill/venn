'use client'

import { createSupabaseBrowserClient } from './supabase-browser'

export interface UploadedMedia {
  url: string
  type: 'image' | 'video'
  width: number
  height: number
  durationSeconds?: number
}

export interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

/**
 * Get image dimensions from a File
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Get video dimensions and duration from a File
 */
export const getVideoDimensions = (file: File): Promise<{ width: number; height: number; duration: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Math.round(video.duration)
      })
      URL.revokeObjectURL(video.src)
    }
    video.onerror = reject
    video.src = URL.createObjectURL(file)
  })
}

/**
 * Upload a single media file to Supabase storage
 */
export const uploadMedia = async (
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedMedia> => {
  const supabase = createSupabaseBrowserClient()

  // Determine media type
  const isVideo = file.type.startsWith('video/')
  const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image'

  // Get dimensions
  let width = 0
  let height = 0
  let durationSeconds: number | undefined

  if (isVideo) {
    const dims = await getVideoDimensions(file)
    width = dims.width
    height = dims.height
    durationSeconds = dims.duration
  } else {
    const dims = await getImageDimensions(file)
    width = dims.width
    height = dims.height
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

  // Upload to Supabase storage
  const { data, error } = await supabase.storage
    .from('post-media')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('post-media')
    .getPublicUrl(data.path)

  return {
    url: urlData.publicUrl,
    type: mediaType,
    width,
    height,
    durationSeconds
  }
}

/**
 * Upload multiple media files
 */
export const uploadMultipleMedia = async (
  files: File[],
  userId: string,
  onProgress?: (index: number, progress: UploadProgress) => void
): Promise<UploadedMedia[]> => {
  const results: UploadedMedia[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const result = await uploadMedia(
      file,
      userId,
      onProgress ? (p) => onProgress(i, p) : undefined
    )
    results.push(result)
  }

  return results
}

/**
 * Create a post with media
 */
export const createPost = async (
  userId: string,
  caption: string,
  media: UploadedMedia[],
  tags?: string[], // interest IDs
  location?: string
): Promise<string> => {
  const supabase = createSupabaseBrowserClient()

  // Create the post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      caption,
      location
    })
    .select('id')
    .single()

  if (postError || !post) {
    throw new Error(`Failed to create post: ${postError?.message}`)
  }

  // Add media
  if (media.length > 0) {
    const mediaRecords = media.map((m, index) => ({
      post_id: post.id,
      media_url: m.url,
      media_type: m.type,
      width: m.width,
      height: m.height,
      duration_seconds: m.durationSeconds,
      display_order: index
    }))

    const { error: mediaError } = await supabase
      .from('post_media')
      .insert(mediaRecords)

    if (mediaError) {
      throw new Error(`Failed to add media: ${mediaError.message}`)
    }
  }

  // Add tags
  if (tags && tags.length > 0) {
    const tagRecords = tags.map(interestId => ({
      post_id: post.id,
      interest_id: interestId
    }))

    const { error: tagError } = await supabase
      .from('post_tags')
      .insert(tagRecords)

    if (tagError) {
      console.error('Failed to add tags:', tagError)
      // Don't throw - tags are optional
    }
  }

  return post.id
}

/**
 * Delete a media file from storage
 */
export const deleteMedia = async (mediaUrl: string): Promise<void> => {
  const supabase = createSupabaseBrowserClient()

  // Extract path from URL
  const url = new URL(mediaUrl)
  const pathMatch = url.pathname.match(/\/post-media\/(.+)$/)

  if (pathMatch) {
    const { error } = await supabase.storage
      .from('post-media')
      .remove([pathMatch[1]])

    if (error) {
      console.error('Failed to delete media:', error)
    }
  }
}
