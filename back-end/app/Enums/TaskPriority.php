<?php

namespace App\Enums;

enum TaskPriority: string
{
    case LOW = 'low';
    case MEDIUM = 'medium';
    case HIGH = 'high';

    public function label(): string
    {
        return match ($this) {
            self::LOW => 'Low',
            self::MEDIUM => 'Medium',
            self::HIGH => 'High',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::LOW => '#10B981',
            self::MEDIUM => '#F59E0B',
            self::HIGH => '#EF4444',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}