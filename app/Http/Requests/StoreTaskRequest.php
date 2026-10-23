<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authentication is explicitly out of scope for Week 1.
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => [
                'required',
                'string',
                'min:3',
                'max:120',
            ],
            'description' => [
                'sometimes',
                'nullable',
                'string',
                'max:1000',
            ],
            'status' => [
                'sometimes',
                'required',
                Rule::in(['todo', 'in_progress', 'done']),
            ],
            'priority' => [
                'sometimes',
                'required',
                Rule::in(['low', 'medium', 'high']),
            ],
            'due_date' => [
                'sometimes',
                'nullable',
                'date_format:Y-m-d',
            ]
        ];
    }
}
