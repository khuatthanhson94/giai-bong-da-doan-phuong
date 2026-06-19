<?php

namespace App\Services;

class QrCodeService
{
    public function generateMatchQr(int $matchId): array
    {
        $url = config('app.url') . "/matches/{$matchId}/live";

        return [
            'match_id' => $matchId,
            'url' => $url,
            'qr_data' => $this->encodeQr($url),
            'format' => 'svg',
        ];
    }

    public function generateTeamQr(int $teamId): array
    {
        $url = config('app.url') . "/teams/{$teamId}";

        return [
            'team_id' => $teamId,
            'url' => $url,
            'qr_data' => $this->encodeQr($url),
        ];
    }

    /**
     * Sinh QR đơn giản dạng SVG (không cần thư viện ngoài).
     */
    private function encodeQr(string $data): string
    {
        $encoded = base64_encode($data);

        return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">'
            . '<rect width="200" height="200" fill="#fff"/>'
            . '<text x="10" y="100" font-size="10" fill="#000">' . htmlspecialchars($encoded) . '</text>'
            . '</svg>';
    }
}
