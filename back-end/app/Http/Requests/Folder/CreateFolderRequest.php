<?php

namespace App\Http\Requests\Folder;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateFolderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'min:3',
                'max:255',
                Rule::unique('folders')->where('user_id', auth()->id())
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'You have created folder name like this before',
        ];
    }
}