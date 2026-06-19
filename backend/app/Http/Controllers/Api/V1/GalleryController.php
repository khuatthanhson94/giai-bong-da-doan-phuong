<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Album;
use App\Models\GalleryImage;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GalleryController extends Controller
{
    public function albums(Request $request): JsonResponse
    {
        return response()->json(Album::query()->withCount('images')->paginate());
    }

    public function storeAlbum(Request $request): JsonResponse
    {
        $data = $request->validate(['title' => 'required|string|max:255']);
        $data['slug'] = Str::slug($data['title']);

        return response()->json(Album::query()->create($data), 201);
    }

    public function showAlbum(Album $album): JsonResponse
    {
        return response()->json($album->load('images'));
    }

    public function storeImage(Request $request, Album $album): JsonResponse
    {
        $data = $request->validate([
            'title' => 'nullable|string',
            'image_path' => 'required|string',
            'caption' => 'nullable|string',
        ]);
        $data['album_id'] = $album->id;

        return response()->json(GalleryImage::query()->create($data), 201);
    }

    public function videos(Request $request): JsonResponse
    {
        return response()->json(Video::query()->paginate());
    }

    public function storeVideo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string',
            'video_url' => 'required|url',
            'thumbnail' => 'nullable|string',
        ]);
        $data['slug'] = Str::slug($data['title']);

        return response()->json(Video::query()->create($data), 201);
    }
}
