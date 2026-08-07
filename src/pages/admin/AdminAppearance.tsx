import { useState, useEffect } from 'react';
import { Palette, Save, RotateCcw, Type, Square, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchThemeSettings, updateThemeSettings, logAction, type ThemeSettings } from '@/lib/admin';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

const COLOR_FIELDS: { key: keyof ThemeSettings; label: string; group: string }[] = [
  { key: 'primary_color', label: 'Primary', group: 'Core' },
  { key: 'secondary_color', label: 'Secondary', group: 'Core' },
  { key: 'accent_color', label: 'Accent', group: 'Core' },
  { key: 'background_color', label: 'Background', group: 'Surfaces' },
  { key: 'card_color', label: 'Cards', group: 'Surfaces' },
  { key: 'border_color', label: 'Borders', group: 'Surfaces' },
  { key: 'status_success', label: 'Success', group: 'Status' },
  { key: 'status_warning', label: 'Warning', group: 'Status' },
  { key: 'status_error', label: 'Error', group: 'Status' },
  { key: 'status_info', label: 'Info', group: 'Status' },
  { key: 'chart_color_1', label: 'Chart 1', group: 'Charts' },
  { key: 'chart_color_2', label: 'Chart 2', group: 'Charts' },
  { key: 'chart_color_3', label: 'Chart 3', group: 'Charts' },
  { key: 'chart_color_4', label: 'Chart 4', group: 'Charts' },
  { key: 'chart_color_5', label: 'Chart 5', group: 'Charts' },
];

const DEFAULT_THEME: ThemeSettings = {
  id: 1, primary_color: '#2563eb', secondary_color: '#64748b', accent_color: '#0ea5e9',
  background_color: '#ffffff', card_color: '#f8fafc', border_color: '#e2e8f0',
  button_radius: '8px', font_heading: 'Inter', font_body: 'Inter',
  status_success: '#22c55e', status_warning: '#f59e0b', status_error: '#ef4444', status_info: '#3b82f6',
  chart_color_1: '#2563eb', chart_color_2: '#0ea5e9', chart_color_3: '#22c55e', chart_color_4: '#f59e0b', chart_color_5: '#8b5cf6',
  updated_at: '',
};

export function AdminAppearance() {
  const { profile } = useAuth();
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThemeSettings().then((t) => { setTheme(t ?? DEFAULT_THEME); setLoading(false); });
  }, []);

  async function handleSave() {
    if (!theme || !profile) return;
    setSaving(true);
    await updateThemeSettings(theme);
    await logAction(profile.id, 'Updated theme settings', 'theme', { theme });
    setSaving(false);
  }

  function handleReset() {
    setTheme(DEFAULT_THEME);
  }

  if (loading) {
    return (
      <div>
        <PageHeader label="Settings" title="Appearance" description="Customise the platform theme. Changes apply platform-wide." />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 " />)}
        </div>
      </div>
    );
  }

  const groups = [...new Set(COLOR_FIELDS.map((f) => f.group))];

  return (
    <div>
      <PageHeader
        label="Settings"
        title="Appearance"
        description="Customise the platform theme. Changes apply platform-wide."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleReset}><RotateCcw className="h-4 w-4" /> Reset</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} loading={saving}>Save Theme</Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Color editors */}
        <div className="space-y-6">
          {groups.map((group) => (
            <Card key={group}>
              <CardHeader title={group} subtitle={`${group} colours`} icon={<Palette className="h-5 w-5" />} />
              <div className="mt-4 grid gap-3 p-5 pt-0 sm:grid-cols-2">
                {COLOR_FIELDS.filter((f) => f.group === group).map(({ key, label }) => (
                  <div key={key}>
                    <label className="mb-1.5 block font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme?.[key] as string ?? '#000000'}
                        onChange={(e) => setTheme(theme ? { ...theme, [key]: e.target.value } : theme)}
                        className="h-10 w-12 cursor-pointer  border border-border"
                      />
                      <input
                        type="text"
                        value={theme?.[key] as string ?? ''}
                        onChange={(e) => setTheme(theme ? { ...theme, [key]: e.target.value } : theme)}
                        className="input-field flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {/* Typography */}
          <Card>
            <CardHeader title="Typography" subtitle="Font families" icon={<Type className="h-5 w-5" />} />
            <div className="mt-4 grid gap-3 p-5 pt-0 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block font-mono text-2xs uppercase tracking-wider text-muted-foreground">Heading Font</label>
                <select value={theme?.font_heading ?? 'Inter'} onChange={(e) => setTheme(theme ? { ...theme, font_heading: e.target.value } : theme)} className="input-field">
                  <option value="Inter">Inter</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Merriweather">Merriweather</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-2xs uppercase tracking-wider text-muted-foreground">Body Font</label>
                <select value={theme?.font_body ?? 'Inter'} onChange={(e) => setTheme(theme ? { ...theme, font_body: e.target.value } : theme)} className="input-field">
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                  <option value="Source Sans Pro">Source Sans Pro</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Button radius */}
          <Card>
            <CardHeader title="Buttons" subtitle="Button styling" icon={<Square className="h-5 w-5" />} />
            <div className="mt-4 p-5 pt-0">
              <label className="mb-1.5 block font-mono text-2xs uppercase tracking-wider text-muted-foreground">Border Radius</label>
              <select value={theme?.button_radius ?? '8px'} onChange={(e) => setTheme(theme ? { ...theme, button_radius: e.target.value } : theme)} className="input-field sm:w-48">
                <option value="0px">Sharp (0px)</option>
                <option value="4px">Subtle (4px)</option>
                <option value="8px">Rounded (8px)</option>
                <option value="12px">Very Rounded (12px)</option>
                <option value="9999px">Pill</option>
              </select>
            </div>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader title="Live Preview" subtitle="See how the theme looks" icon={<Eye className="h-5 w-5" />} />
            <div
              className="mt-4 overflow-hidden  border"
              style={{ backgroundColor: theme?.background_color ?? '#fff', borderColor: theme?.border_color ?? '#e2e8f0' }}
            >
              <div className="p-6">
                <h3 className="font-display text-xl font-bold" style={{ color: theme?.primary_color, fontFamily: theme?.font_heading }}>
                  Sample Heading
                </h3>
                <p className="mt-2 text-sm" style={{ color: theme?.secondary_color, fontFamily: theme?.font_body }}>
                  This is sample body text showing how the selected fonts and colours appear together.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    className="px-4 py-2 text-sm font-medium text-white"
                    style={{ backgroundColor: theme?.primary_color, borderRadius: theme?.button_radius }}
                  >
                    Primary Button
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-medium text-white"
                    style={{ backgroundColor: theme?.accent_color, borderRadius: theme?.button_radius }}
                  >
                    Accent Button
                  </button>
                </div>
                <div className="mt-4  p-4" style={{ backgroundColor: theme?.card_color, border: `1px solid ${theme?.border_color}` }}>
                  <p className="text-sm" style={{ color: theme?.secondary_color }}>Card component preview</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <span className=" px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: theme?.status_success }}>Success</span>
                  <span className=" px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: theme?.status_warning }}>Warning</span>
                  <span className=" px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: theme?.status_error }}>Error</span>
                  <span className=" px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: theme?.status_info }}>Info</span>
                </div>
                <div className="mt-4 flex gap-1">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className="h-4 flex-1 rounded" style={{ backgroundColor: (theme as Record<string, string>)?.[`chart_color_${i}`] }} />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
