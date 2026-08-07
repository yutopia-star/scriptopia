import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createScreenplay, uploadScreenplayFile, fetchPlatformSettings } from '@/lib/writer';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { GENRE_OPTIONS, COUNTRIES } from '@/lib/constants';
import { FORMAT_OPTIONS } from '@/components/app/ScreenplayStatus';
import type { PlatformSettings, ScreenplayFormat } from '@/types/database';

export function UploadScreenplayPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  const [form, setForm] = useState({
    title: '',
    logline: '',
    genre: 'Drama',
    format: 'feature' as ScreenplayFormat,
    estimated_budget: '',
    language: 'English',
    country: 'United States',
    draft_number: 1,
  });

  useEffect(() => {
    fetchPlatformSettings().then(setSettings);
  }, []);

  const maxMb = settings?.max_upload_size_mb ?? 50;

  function handleFile(f: File) {
    setError(null);
    if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }
    if (f.size > maxMb * 1024 * 1024) {
      setError(`File size exceeds the ${maxMb}MB limit.`);
      return;
    }
    setFile(f);
    if (!form.title) {
      const name = f.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      setForm((prev) => ({ ...prev, title: name }));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !file) { setError('Please select a PDF file to upload.'); return; }
    if (!form.title || !form.logline) { setError('Title and logline are required.'); return; }
    setUploading(true);
    setError(null);
    try {
      const tempId = crypto.randomUUID();
      const { path, size } = await uploadScreenplayFile(profile.id, tempId, file);
      const sp = await createScreenplay(profile.id, {
        title: form.title,
        logline: form.logline,
        genre: form.genre,
        format: form.format,
        estimated_budget: form.estimated_budget,
        language: form.language,
        country: form.country,
        draft_number: form.draft_number,
        page_count: null,
        file_path: path,
        file_size_bytes: size,
      });
      if (sp) navigate(`/app/screenplays/${sp.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <PageHeader
        label="Library"
        title="Upload Screenplay"
        description="Upload a PDF screenplay and fill in the required metadata."
        backTo="/app/screenplays"
        backLabel="Back to My Screenplays"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File upload */}
        <Card>
          <CardHeader title="Screenplay File" subtitle={`PDF only, max ${maxMb}MB`} icon={<FileText className="h-5 w-5" />} />
          <div className="p-5 pt-4">
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center  border-2 border-dashed py-12 transition-colors ${
                  dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-surface-hover'
                }`}
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium text-foreground">Drag & drop your PDF here</p>
                <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
              </div>
            ) : (
              <div className="flex items-center gap-3  rounded-xl border border-border bg-background p-4">
                <div className="flex h-10 w-10 items-center justify-center  bg-success/15 text-success">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={() => setFile(null)} className=" p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-error">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader title="Screenplay Metadata" icon={<FileText className="h-5 w-5" />} />
          <div className="space-y-4 p-5 pt-4">
            <Input
              label="Title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="The Last Picture Show"
            />
            <Textarea
              label="Logline"
              required
              value={form.logline}
              onChange={(e) => setForm({ ...form, logline: e.target.value })}
              rows={2}
              placeholder="A one-sentence summary of your screenplay"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Genre <span className="text-error">*</span></label>
                <select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} className="input-field">
                  {GENRE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Format <span className="text-error">*</span></label>
                <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as ScreenplayFormat })} className="input-field">
                  {FORMAT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <Input
                label="Estimated Budget"
                value={form.estimated_budget}
                onChange={(e) => setForm({ ...form, estimated_budget: e.target.value })}
                placeholder="$1M - $5M"
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Language <span className="text-error">*</span></label>
                <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="input-field">
                  {(settings?.supported_languages ?? ['English']).map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Country <span className="text-error">*</span></label>
                <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input-field">
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Input
                label="Draft Number"
                type="number"
                min={1}
                value={form.draft_number}
                onChange={(e) => setForm({ ...form, draft_number: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
          </div>
        </Card>

        {error && (
          <div className="flex items-center gap-2  border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={uploading || !file}>
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Upload Screenplay</>}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/app/screenplays')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
