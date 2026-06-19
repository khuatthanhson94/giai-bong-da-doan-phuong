<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as NotificationFacade;

class NotificationService
{
    public function sendToUser(User $user, Notification $notification): void
    {
        $user->notify($notification);
    }

    public function sendToRole(string $role, Notification $notification): void
    {
        $users = User::query()->where('role', $role)->where('is_active', true)->get();
        NotificationFacade::send($users, $notification);
    }

    public function markAsRead(User $user, string $notificationId): void
    {
        $notification = $user->notifications()->findOrFail($notificationId);
        $notification->markAsRead();
    }

    public function getUnread(User $user, int $limit = 20)
    {
        return $user->unreadNotifications()->limit($limit)->get();
    }
}
