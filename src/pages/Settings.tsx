import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Save, FlaskConical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readConfiguration, saveConfiguration } from '@/db/repositories/configurationRepository';
import { extractShipmentDetails } from '@/services/shipmentExtractor';
import { useToast } from '@/hooks/use-toast';
import type { ShipmentConfiguration } from '@/types/configuration';
import { DEFAULT_CONFIGURATION } from '@/types/configuration';

const SAMPLE_EMAIL = `Shipment Notification

Shipment From: Dubai
Shipment Date: 15/08/2026`;

export function SettingsPage() {
  const { toast } = useToast();
  const config = useLiveQuery(() => readConfiguration(), []);
  const [form, setForm] = useState<Omit<ShipmentConfiguration, 'id' | 'updatedAt'>>(DEFAULT_CONFIGURATION);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({
        senderEmail: config.senderEmail,
        senderName: config.senderName,
        subjectContains: config.subjectContains,
        shipmentFromLabel: config.shipmentFromLabel,
        shipmentDateLabel: config.shipmentDateLabel,
      });
    }
  }, [config]);

  const handleSave = async () => {
    if (!form.senderEmail.trim()) {
      toast({ title: 'Sender email is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await saveConfiguration(form);
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
          <CardDescription>Define which emails to process and how to extract shipment details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="senderEmail">Sender Email Address</Label>
            <Input
              id="senderEmail"
              type="email"
              placeholder="shipment@example.com"
              value={form.senderEmail}
              onChange={(e) => setForm((f) => ({ ...f, senderEmail: e.target.value }))}
            />
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
              placeholder="Shipment"
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
