<?php

namespace App\Services;

use App\Models\Setting;

class SettingService
{
    public function all(): array
    {
        return Setting::query()
            ->orderBy('group')
            ->orderBy('key')
            ->get()
            ->map(fn (Setting $s) => [
                'key' => $s->key,
                'value' => $s->value,
                'group' => $s->group,
                'is_public' => $s->is_public,
            ])
            ->values()
            ->all();
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return Setting::where('key', $key)->value('value') ?? $default;
    }

    public function updateMany(array $settings): void
    {
        foreach ($settings as $item) {
            Setting::updateOrCreate(
                ['key' => $item['key']],
                ['value' => $item['value'] ?? null],
            );
        }
    }
}
