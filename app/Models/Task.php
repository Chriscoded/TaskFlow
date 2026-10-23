<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'status',
        'priority',
        'due_date',
    ];

    protected $attributes = [
        'status' => 'todo',
        'priority' => 'medium',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
        ];
    }
}