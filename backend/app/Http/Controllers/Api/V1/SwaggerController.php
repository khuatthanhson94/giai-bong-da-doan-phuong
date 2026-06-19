<?php

namespace App\Http\Controllers\Api\V1;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    title: 'Giải Bóng Đá Đoàn Phường API',
    description: 'REST API quản lý giải bóng đá'
)]
#[OA\Server(url: L5_SWAGGER_CONST_HOST, description: 'API Server')]
#[OA\SecurityScheme(
    securityScheme: 'bearerAuth',
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT'
)]
class SwaggerController
{
}
