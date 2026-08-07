import { useState, useEffect } from 'react';
import { FormInput, ChevronUp, ChevronDown, Plus, Trash2, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchFormConfigs, updateFormConfig, logAction, type FormConfig, type FormField } from '@/lib/admin';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export function AdminForms() {
  const { profile } = useAuth();
  const [forms, setForms] = useState<FormConfig[]>([]);
  const [activeForm, setActiveForm] = useState<FormConfig | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const f = await fetchFormConfigs();
    setForms(f);
    if (f.length > 0 && !activeForm) {
      setActiveForm(f[0]);
      setFields(f[0].fields);
    }
    setLoading(false);
  }

  function selectForm(form: FormConfig) {
    setActiveForm(form);
    setFields(form.fields);
  }

  function moveField(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const newFields = [...fields];
    const tempOrder = newFields[index].order;
    newFields[index].order = newFields[newIndex].order;
    newFields[newIndex].order = tempOrder;
    newFields.sort((a, b) => a.order - b.order);
    setFields(newFields);
  }

  function toggleRequired(index: number) {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], required: !newFields[index].required };
    setFields(newFields);
  }

  function toggleEnabled(index: number) {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], enabled: !newFields[index].enabled };
    setFields(newFields);
  }

  function addField() {
    const newField: FormField = { name: `field_${Date.now()}`, label: 'New Field', type: 'text', required: false, enabled: true, order: fields.length + 1 };
    setFields([...fields, newField]);
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i + 1 })));
  }

  function updateFieldLabel(index: number, label: string) {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], label };
    setFields(newFields);
  }

  async function handleSave() {
    if (!activeForm || !profile) return;
    setSaving(true);
    await updateFormConfig(activeForm.form_key, fields);
    await logAction(profile.id, `Updated form ${activeForm.form_key}`, 'configuration', { formKey: activeForm.form_key });
    setSaving(false);
  }

  if (loading) {
    return (
      <div>
        <PageHeader label="Settings" title="Forms" description="Customise form fields across the platform." />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 " />
          <Skeleton className="col-span-2 h-48 " />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader label="Settings" title="Forms" description="Customise form fields across the platform." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form list */}
        <div className="space-y-2">
          <p className="mb-2 font-mono text-2xs uppercase tracking-wider text-muted-foreground">Available Forms</p>
          {forms.map((f) => (
            <button
              key={f.id}
              onClick={() => selectForm(f)}
              className={`flex w-full items-center gap-3  border p-3 text-left transition-all ${activeForm?.form_key === f.form_key ? 'border-primary bg-primary/5 ' : 'border-border hover:bg-surface-hover'}`}
            >
              <div className={`flex h-9 w-9 items-center justify-center  ${activeForm?.form_key === f.form_key ? 'bg-primary/15 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                <FormInput className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{f.form_name}</p>
                <p className="font-mono text-2xs text-muted-foreground">{f.fields.length} fields</p>
              </div>
            </button>
          ))}
        </div>

        {/* Field editor */}
        <div className="lg:col-span-2">
          {activeForm && (
            <Card>
              <CardHeader
                title={activeForm.form_name}
                subtitle="Reorder fields with the arrows. Toggle required and enabled states."
                icon={<FormInput className="h-5 w-5" />}
                action={<Button size="sm" onClick={handleSave} disabled={saving} loading={saving}><Save className="h-4 w-4" /> Save</Button>}
              />
              <div className="mt-4 space-y-2 p-5 pt-0">
                {fields.map((field, i) => (
                  <div key={i} className="flex items-center gap-3  rounded-xl border border-border bg-background p-3">
                    <div className="flex flex-col">
                      <button onClick={() => moveField(i, -1)} disabled={i === 0} className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                      <button onClick={() => moveField(i, 1)} disabled={i === fields.length - 1} className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                    </div>
                    <span className="flex h-6 w-6 items-center justify-center  bg-secondary font-mono text-2xs font-semibold text-secondary-foreground">{i + 1}</span>
                    <input value={field.label} onChange={(e) => updateFieldLabel(i, e.target.value)} className="input-field flex-1" />
                    <button onClick={() => toggleEnabled(i)} className={`inline-flex h-7 items-center  px-2.5 text-xs font-medium transition-colors ${field.enabled ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {field.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button onClick={() => toggleRequired(i)} className={`inline-flex h-7 items-center  px-2.5 text-xs font-medium transition-colors ${field.required ? 'bg-error/15 text-error' : 'bg-muted text-muted-foreground'}`}>
                      {field.required ? 'Required' : 'Optional'}
                    </button>
                    <button onClick={() => removeField(i)} className=" p-1.5 text-error transition-colors hover:bg-error/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <button onClick={addField} className="flex w-full items-center justify-center gap-2  border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
                  <Plus className="h-4 w-4" /> Add Field
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
