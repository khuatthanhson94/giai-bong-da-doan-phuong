# Laravel Backend — PHP 8.3-FPM
FROM php:8.3-fpm-alpine AS base

LABEL maintainer="Doan Phuong <dev@doanphuong.local>"
LABEL description="Laravel API backend for Giải Bóng đá Đoàn phường"

RUN apk add --no-cache \
    bash \
    curl \
    git \
    icu-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    freetype-dev \
    libzip-dev \
    oniguruma-dev \
    postgresql-dev \
    linux-headers \
    $PHPIZE_DEPS \
    && docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
        --with-webp \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        pgsql \
        gd \
        zip \
        intl \
        opcache \
        bcmath \
        pcntl \
        exif \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS \
    && rm -rf /tmp/* /var/cache/apk/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN addgroup -g 1000 -S www && adduser -u 1000 -S www -G www

WORKDIR /var/www/backend

# PHP-FPM & Opcache production tuning
COPY <<'EOF' /usr/local/etc/php/conf.d/99-custom.ini
memory_limit = 256M
upload_max_filesize = 64M
post_max_size = 64M
max_execution_time = 120
date.timezone = Asia/Ho_Chi_Minh

[opcache]
opcache.enable = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 16
opcache.max_accelerated_files = 10000
opcache.validate_timestamps = 0
opcache.revalidate_freq = 0
EOF

# FPM healthcheck helper
RUN echo '#!/bin/sh' > /usr/local/bin/php-fpm-healthcheck \
    && echo 'SCRIPT_NAME=/ping SCRIPT_FILENAME=/ping REQUEST_METHOD=GET cgi-fcgi -bind -connect 127.0.0.1:9000 || exit 1' >> /usr/local/bin/php-fpm-healthcheck \
    && chmod +x /usr/local/bin/php-fpm-healthcheck \
    && apk add --no-cache fcgi

FROM base AS development

RUN apk add --no-cache $PHPIZE_DEPS \
    && pecl install xdebug \
    && docker-php-ext-enable xdebug \
    && apk del $PHPIZE_DEPS

COPY <<'EOF' /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini
xdebug.mode = develop,debug
xdebug.client_host = host.docker.internal
xdebug.start_with_request = yes
EOF

RUN sed -i 's/opcache.validate_timestamps = 0/opcache.validate_timestamps = 1/' /usr/local/etc/php/conf.d/99-custom.ini

USER www
EXPOSE 9000
CMD ["php-fpm"]

FROM base AS production

COPY --chown=www:www . /var/www/backend

RUN if [ -f composer.json ]; then \
        composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist; \
    fi

RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www:www storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

USER www
EXPOSE 9000
CMD ["php-fpm"]
