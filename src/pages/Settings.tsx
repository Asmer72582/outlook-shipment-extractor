import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Save, FlaskConical, Plus, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readConfiguration, saveConfiguration } from '@/db/repositories/configurationRepository';
import { extractShipmentDetails } from '@/services/shipmentExtractor';
import { useToast } from '@/hooks/use-toast';
import type { ShipmentConfigInput } from '@/types/configuration';
import { DEFAULT_CONFIGURATION } from '@/types/configuration';
import { isValidSenderEmail, normalizeSenderEmails } from '@/utils/configuration';

const SAMPLE_EMAIL = `Shipment Notification

Shipment From: Dubai
Shipment Date: 15/08/2026`;

export function SettingsPage() {
  const { toast } = useToast();
  const config = useLiveQuery(() => readConfiguration(), []);
  const [form, setForm] = useState<ShipmentConfigInput>({
    senderEmails: [...DEFAULT_CONFIGURATION.senderEmails],
    senderName: DEFAULT_CONFIGURATION.senderName,
    subjectContains: DEFAULT_CONFIGURATION.subjectContains,
    shipmentFromLabel: DEFAULT_CONFIGURATION.shipmentFromLabel,
    shipmentDateLabel: DEFAULT_CONFIGURATION.shipmentDateLabel,
    enableInboxViewer: DEFAULT_CONFIGURATION.enableInboxViewer,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({
        senderEmails: config.senderEmails.length ? [...config.senderEmails] : [''],
        senderName: config.senderName,
        subjectContains: config.subjectContains,
        shipmentFromLabel: config.shipmentFromLabel,
        shipmentDateLabel: config.shipmentDateLabel,
        enableInboxViewer: config.enableInboxViewer,
      });
    }
  }, [config]);

  const updateSenderEmail = (index: number, value: string) => {
    setForm((f) => {
      const senderEmails = [...f.senderEmails];
      senderEmails[index] = value;
      return { ...f, senderEmails };
    });
  };

  const addSenderEmail = () => {
    setForm((f) => ({ ...f, senderEmails: [...f.senderEmails, ''] }));
  };

  const removeSenderEmail = (index: number) => {
    setForm((f) => ({
      ...f,
      senderEmails: f.senderEmails.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    const senderEmails = normalizeSenderEmails(form.senderEmails);

    if (senderEmails.length === 0) {
      toast({ title: 'At least one sender email is required', variant: 'destructive' });
      return;
    }

    const invalid = senderEmails.find((email) => !isValidSenderEmail(email));
    if (invalid) {
      toast({ title: `Invalid email: ${invalid}`, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await saveConfiguration({ ...form, senderEmails });
      toast({ title: 'Configuration saved.' });
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestExtraction = () => {
    const result = extractShipmentDetails(SAMPLE_EMAIL, 'text', {
      shipmentFromLabel: form.shipmentFromLabel,
      shipmentDateLabel: form.shipmentDateLabel,
    });
    toast({
      title: 'Test extraction result',
      description: `From: ${result.shipmentFrom || '—'}, Date: ${result.shipmentDate || '—'}, Status: ${result.status}`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shipment Email Configuration</CardTitle>
          <CardDescription>
            Define which senders to process and how to extract shipment details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>Sender Email Addresses</Label>
            <p className="text-xs text-muted-foreground">
              Add one or more shipment notification sender addresses.
            </p>
            <div className="space-y-2">
              {(form.senderEmails.length ? form.senderEmails : ['']).map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="shipment@example.com"
                    value={email}
                    onChange={(e) => updateSenderEmail(index, e.target.value)}
                  />
                  {form.senderEmails.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeSenderEmail(index)}
                      aria-label="Remove sender email"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addSenderEmail}>
              <Plus className="h-4 w-4 mr-2" />
              Add sender email
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="senderName">Sender Name</Label>
            <Input
              id="senderName"
              placeholder="ABC Logistics"
              value={form.senderName}
              onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subjectContains">Subject Contains</Label>
            <Input
              id="subjectContains"
              placeholder="Shipment (leave empty to match all subjects)"
              value={form.subjectContains}
              onChange={(e) => setForm((f) => ({ ...f, subjectContains: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipmentFromLabel">Shipment From Label</Label>
            <Input
              id="shipmentFromLabel"
              placeholder="Shipment From:"
              value={form.shipmentFromLabel}
              onChange={(e) => setForm((f) => ({ ...f, shipmentFromLabel: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipmentDateLabel">Shipment Date Label</Label>
            <Input
              id="shipmentDateLabel"
              placeholder="Shipment Date:"
              value={form.shipmentDateLabel}
              onChange={(e) => setForm((f) => ({ ...f, shipmentDateLabel: e.target.value }))}
            />
          </div>

          <div className="flex items-start gap-3 rounded-md border p-4">
            <input
              id="enableInboxViewer"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-input"
              checked={form.enableInboxViewer}
              onChange={(e) =>
                setForm((f) => ({ ...f, enableInboxViewer: e.target.checked }))
              }
            />
            <div className="space-y-1">
              <Label htmlFor="enableInboxViewer" className="cursor-pointer">
                Show Outlook Inbox in portal
              </Label>
              <p className="text-xs text-muted-foreground">
                Adds an Inbox page to browse your Outlook messages inside this app. Email
                content is loaded on demand and not stored locally.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
            <Button variant="outline" onClick={handleTestExtraction}>
              <FlaskConical className="h-4 w-4 mr-2" />
              Test Extraction
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
