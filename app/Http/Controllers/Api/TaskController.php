<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TaskController extends Controller
{
    /**
     * List only the authenticated user's tasks.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['sometimes', 'nullable', 'in:todo,in_progress,done'],
            'priority' => ['sometimes', 'nullable', 'in:low,medium,high'],
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $query = $request->user()->tasks();

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $tasks = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(10)
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
