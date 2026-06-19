<?php

namespace App\Services;

class AiContentService
{
    public function isEnabled(): bool
    {
        return (bool) config('services.ai.enabled', env('AI_CONTENT_ENABLED', false));
    }

    /**
     * Stub: Sinh nội dung tin tức bằng AI.
     */
    public function generateNews(array $context): array
    {
        if (! $this->isEnabled()) {
            return [
                'title' => $context['topic'] ?? 'Tin tức giải đấu',
                'excerpt' => 'Nội dung tóm tắt sẽ được sinh bởi AI khi bật tính năng.',
                'content' => '<p>Đây là nội dung mẫu. Cấu hình AI_CONTENT_ENABLED=true và API key để sử dụng.</p>',
                'meta_description' => $context['topic'] ?? '',
                'generated' => false,
            ];
        }

        // TODO: Tích hợp OpenAI / Gemini API
        return [
            'title' => 'AI: ' . ($context['topic'] ?? 'Bài viết'),
            'excerpt' => 'Tóm tắt do AI sinh.',
            'content' => '<p>Nội dung do AI sinh dựa trên: ' . json_encode($context) . '</p>',
            'meta_description' => $context['topic'] ?? '',
            'generated' => true,
        ];
    }

    public function generateMatchReport(int $matchId): array
    {
        return [
            'match_id' => $matchId,
            'report' => 'Báo cáo trận đấu (stub AI).',
            'generated' => $this->isEnabled(),
        ];
    }
}
