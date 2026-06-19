<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => 'sometimes|required_without:username|email',
            'username' => 'sometimes|required_without:email|string|min:3',
            'password' => 'required|string|min:6',
            'device_name' => 'nullable|string|max:255',
        ];
    }
}
