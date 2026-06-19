<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\News;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NewsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = News::query()->with(['author', 'season', 'tournament']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderByDesc('published_at')->paginate());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'season_id' => 'nullable|exists:seasons,id',
            'tournament_id' => 'nullable|exists:tournaments,id',
            'excerpt' => 'nullable|string',
            'meta_title' => 'nullable|string',
            'meta_description' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        $data['slug'] = Str::slug($data['title']);
        $data['author_id'] = $request->user()?->id;

        return response()->json(News::query()->create($data), 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(News::query()->with(['author'])->findOrFail($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $news = News::query()->findOrFail($id);
        $news->update($request->all());

        return response()->json($news);
    }

    public function destroy(int $id): JsonResponse
    {
        News::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'Đã xóa tin tức.']);
    }
}
