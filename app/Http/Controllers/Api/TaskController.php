<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class TaskController extends Controller
{
    /**
     * List the authenticated user's tasks.
     *
     * Supports filtering, searching, sorting and database pagination.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => [
                'sometimes',
                'nullable',
                'in:todo,in_progress,done',
            ],
            'priority' => [
                'sometimes',
                'nullable',
                'in:low,medium,high',
            ],
            'search' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d'],
            'page' => [
                'sometimes',
                'integer',
                'min:1',
            ],
            'per_page' => [
                'sometimes',
                'integer',
                'min:1',
                'max:50',
            ],
            'sort_by' => [
                'sometimes',
                'in:created_at,due_date,priority',
            ],
            'sort_direction' => [
                'sometimes',
                'in:asc,desc',
            ],
        ]);

        // Ensure the start date is not later than the end date.
        if (
            !empty($filters['date_from']) &&
            !empty($filters['date_to']) &&
            $filters['date_from'] > $filters['date_to']
        ) {
            throw ValidationException::withMessages([
                'date_to' => 'The end date must be on or after the start date.',
            ]);
        }

        // Always scope the query to the authenticated user.
        $query = $request->user()->tasks();

        // Status filter.
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Priority filter.
        if (! empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        // Date range filter.
        if (! empty($filters['date_from'])) {
            $query->whereDate('due_date', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('due_date', '<=', $filters['date_to']);
        }

        // Search title and description.
        if (! empty($filters['search'])) {
            $search = $filters['search'];

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sorting is restricted to an explicit allowlist.
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDirection = $filters['sort_direction'] ?? 'desc';

        if ($sortBy === 'priority') {
            // Business ordering: high, medium, low.
            $query->orderByRaw(
                "CASE priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                    ELSE 4
                END {$sortDirection}"
            );
        } else {
            $query->orderBy($sortBy, $sortDirection);
        }

        // Stable ordering when primary sort values are equal.
        $query->orderByDesc('id');

        // Default page size is 10; maximum is 50.
        $perPage = $filters['per_page'] ?? 10;

        // paginate() performs pagination at database level.
        $tasks = $query
            ->paginate($perPage)
            ->withQueryString();

        return TaskResource::collection($tasks);
    }

    /**
     * Create a task owned by the authenticated user.
     */
    public function store(StoreTaskRequest $request): JsonResponse
    {
        $data = $request->safe()->only([
            'title',
            'description',
            'status',
            'priority',
            'due_date',
        ]);

        $task = $request->user()->tasks()->create($data);

        return (new TaskResource($task))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Show a task only if it belongs to the authenticated user.
     */
    public function show(Request $request, int $task): TaskResource
    {
        $ownedTask = $request->user()
            ->tasks()
            ->findOrFail($task);

        return new TaskResource($ownedTask);
    }

    /**
     * Update only the supplied, validated fields of an owned task.
     */
    public function update(
        UpdateTaskRequest $request,
        int $task
    ): TaskResource {
        $ownedTask = $request->user()
            ->tasks()
            ->findOrFail($task);

        $data = $request->safe()->only([
            'title',
            'description',
            'status',
            'priority',
            'due_date',
        ]);

        $ownedTask->update($data);
        $ownedTask->refresh();

        return new TaskResource($ownedTask);
    }

    /**
     * Delete a task only if it belongs to the authenticated user.
     */
    public function destroy(Request $request, int $task): Response
    {
        $ownedTask = $request->user()
            ->tasks()
            ->findOrFail($task);

        $ownedTask->delete();

        return response()->noContent();
    }
}
