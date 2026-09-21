import { useState, ChangeEvent } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('r2-upload-url', {
        body: { restaurantId: RESTAURANT_ID, fileName: file.name, contentType: file.type },
      });

      if (fnError || !data?.uploadUrl) {
        throw new Error("Image upload isn't set up yet — paste an image URL below instead for now.");
      }

      const putResponse = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type },
        body: file,
      });

      if (!putResponse.ok) {
        throw new Error('Upload to storage failed. Please try again.');
      }

      onChange(data.publicUrl as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      {value && <img src={value} alt="" className="mb-2 h-24 w-24 rounded-lg border border-line object-cover" />}
      <label className="inline-block cursor-pointer rounded-lg border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink/70 hover:border-accent/40">
        {uploading ? 'Uploading…' : 'Upload Image'}
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
      </label>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      <input
        type="text"
        placeholder="…or paste an image URL"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </div>
  );
}
