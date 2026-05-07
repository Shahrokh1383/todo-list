<?php

namespace App\Enums;

enum TaskStatus: string
{
    case TODO = 'todo';
    case IN_PROGRESS = 'in_progress';
    case DONE = 'done';

    public function label(): string
    {
        return match ($this) {
            self::TODO => 'To Do',
            self::IN_PROGRESS => 'In Progress',
            self::DONE => 'Done',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::TODO => '#6B7280',
            self::IN_PROGRESS => '#3B82F6',
            self::DONE => '#10B981',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}