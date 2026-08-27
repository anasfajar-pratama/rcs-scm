<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\SettingService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    use ApiResponse;

    public function __construct(private SettingService $settingService)
    {
    }

    public function index(): JsonResponse
    {
        return $this->success($this->settingService->all());
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string'],
            'settings.*.value' => ['nullable'],
        ]);

        $this->settingService->updateMany($validated['settings']);

        return $this->success($this->settingService->all(), 'Pengaturan berhasil disimpan.');
    }

    public function show(string $key): JsonResponse
    {
        $value = Setting::where('key', $key)->value('value');

        return $this->success(['key' => $key, 'value' => $value]);
    }
}
