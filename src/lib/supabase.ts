import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Upload PDF to temporary storage
export async function uploadPDFToStorage(file: File): Promise<string> {
  const fileName = `temp-pdf-${Date.now()}-${file.name}`;
  const filePath = `temp-uploads/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('pdf-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return data.path;
}

// Get public URL for uploaded PDF
export async function getPDFUrl(filePath: string): Promise<string> {
  const { data } = supabase.storage
    .from('pdf-files')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

// Clean up temporary file
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await supabase.storage
      .from('pdf-files')
      .remove([filePath]);
  } catch (error) {
    console.warn('Failed to cleanup temp file:', error);
  }
}