<?php

namespace App\Http\Requests\Task;

use Illuminate\Foundation\Http\FormRequest;
use App\Enums\TaskStatus;
use App\Enums\TaskPriority;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'min:3', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'folder_id' => ['nullable', 'exists:folders,id'],
            'status' => ['nullable', 'in:' . implode(',', TaskStatus::values())],
            'priority' => ['nullable', 'in:' . implode(',', TaskPriority::values())],
            'due_date' => ['nullable', 'date'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->folder_id) {
                $folder = \App\Models\Folder::find($this->folder_id);
                if (!$folder || $folder->user_id !== auth()->id()) {
                    $validator->errors()->add('folder_id', 'This folder does not belong to you');
                }
            }
        });
    }
}