<?php

namespace Tests\Feature\Api;

use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_a_task_with_default_values(): void
    {
        $response = $this->postJson('/api/tasks', [
            'title' => 'Prepare project plan',
            'description' => 'Define the implementation milestones.',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.title', 'Prepare project plan')
            ->assertJsonPath('data.status', 'todo')
            ->assertJsonPath('data.priority', 'medium');

        $this->assertDatabaseHas('tasks', [
            'title' => 'Prepare project plan',
            'status' => 'todo',
            'priority' => 'medium',
        ]);
    }

    public function test_it_rejects_a_missing_or_short_title(): void
    {
        $this->postJson('/api/tasks', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title']);

        $this->postJson('/api/tasks', [
            'title' => 'AB',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title']);
    }

    public function test_it_rejects_invalid_status_and_priority(): void
    {
        $response = $this->postJson('/api/tasks', [
            'title' => 'Write automated tests',
            'status' => 'pending',
            'priority' => 'urgent',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status', 'priority']);
    }

    public function test_it_updates_only_the_supplied_fields(): void
    {
        $task = Task::create([
            'title' => 'Finish API',
            'description' => 'Original description',
        ]);

        $this->patchJson("/api/tasks/{$task->id}", [
            'status' => 'in_progress',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress')
            ->assertJsonPath('data.title', 'Finish API')
            ->assertJsonPath('data.description', 'Original description');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'status' => 'in_progress',
            'title' => 'Finish API',
        ]);
    }

    public function test_it_deletes_a_task(): void
    {
        $task = Task::create([
            'title' => 'Remove obsolete task',
        ]);

        $this->deleteJson("/api/tasks/{$task->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('tasks', [
            'id' => $task->id,
        ]);
    }

    public function test_it_filters_by_status_and_priority_together(): void
    {
        Task::create([
            'title' => 'Matching task',
            'status' => 'todo',
            'priority' => 'high',
        ]);

        Task::create([
            'title' => 'Wrong priority',
            'status' => 'todo',
            'priority' => 'low',
        ]);

        Task::create([
            'title' => 'Wrong status',
            'status' => 'done',
            'priority' => 'high',
        ]);

        $this->getJson('/api/tasks?status=todo&priority=high')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Matching task');
    }

    // public function test_it_returns_paginated_tasks(): void
    // {
    //     Task::factory()->count(12)->create();

    //     $this->getJson('/api/tasks?page=1')
    //         ->assertOk()
    //         ->assertJsonCount(10, 'data')
    //         ->assertJsonPath('meta.per_page', 10)
    //         ->assertJsonPath('meta.total', 12);

    //     $this->getJson('/api/tasks?page=2')
    //         ->assertOk()
    //         ->assertJsonCount(2, 'data');
    // }


    public function test_it_returns_paginated_tasks(): void
    {
        for ($i = 1; $i <= 12; $i++) {
            Task::create([
                'title' => sprintf('Task number %02d', $i),
            ]);
        }

        $this->getJson('/api/tasks?page=1')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 12);

        $this->getJson('/api/tasks?page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }


    public function test_missing_tasks_return_not_found(): void
    {
        $this->getJson('/api/tasks/999999')->assertNotFound();

        $this->patchJson('/api/tasks/999999', [
            'status' => 'done',
        ])->assertNotFound();

        $this->deleteJson('/api/tasks/999999')->assertNotFound();
    }
}
