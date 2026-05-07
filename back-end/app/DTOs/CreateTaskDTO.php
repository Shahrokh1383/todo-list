<?php

namespace App\DTOs;

readonly class CreateTaskDTO
{
    public function __construct(
        public string $title,
        public ?string $description,
        public ?int $folderId,
        public ?string $status,
        public ?string $priority,
        public ?string $dueDate,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            title: $data['title'],
            description: $data['description'] ?? null,
            folderId: $data['folder_id'] ?? null,
            status: $data['status'] ?? 'todo',
            priority: $data['priority'] ?? 'medium',
            dueDate: $data['due_date'] ?? null,
        );
    }

    public function toArray(): array
    {
        return [
            'title' => $this->title,
            'description' => $this->description,
            'folder_id' => $this->folderId,
            'status' => $this->status,
            'priority' => $this->priority,
            'due_date' => $this->dueDate,
        ];
    }
}