import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import type { SettingItem } from '../types';
import { Button, Card, Input, PageHeader, Spinner } from '../components/ui';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<SettingItem[]> => {
      const { data } = await api.get<{ data: SettingItem[] }>('/settings');
      return data.data;
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: async () => {
      const settings = Object.entries(form).map(([key, value]) => ({ key, value }));
      await api.put('/settings', { settings });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const groups = (data ?? []).reduce<Record<string, SettingItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Pengaturan"
        subtitle="Konfigurasi perusahaan, dokumen & inventori"
        action={
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(groups).map(([group, items]) => (
          <Card key={group} className="p-5">
            <h3 className="font-semibold text-gray-800 mb-4 capitalize">{group}</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <Input
                  key={item.key}
                  label={item.key}
                  value={form[item.key] ?? item.value ?? ''}
                  onChange={(v) => set(item.key, v)}
                />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
