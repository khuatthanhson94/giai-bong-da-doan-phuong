<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Page;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SiteSetting::query();

        if ($request->boolean('public_only')) {
            $query->where('is_public', true);
        }

        return response()->json($query->get()->mapWithKeys(
            fn ($s) => [$s->key => $s->getCastedValue()]
        ));
    }

    public function update(Request $request): JsonResponse
    {
        $settings = $request->validate(['settings' => 'required|array']);

        foreach ($settings['settings'] as $key => $value) {
            SiteSetting::query()->updateOrCreate(
                ['key' => $key],
                ['value' => is_array($value) ? json_encode($value) : (string) $value]
            );
        }

        return response()->json(['message' => 'Đã cập nhật cài đặt.']);
    }

    public function pages(): JsonResponse
    {
        return response()->json(Page::query()->where('is_published', true)->get());
    }

    public function updatePage(Request $request, string $slug): JsonResponse
    {
        $page = Page::query()->where('slug', $slug)->firstOrFail();
        $page->update($request->all());

        return response()->json($page);
    }
}
