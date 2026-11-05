<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        Sanctum::actingAs($this->user);
    }

    /*
    |--------------------------------------------------------------------------
    | Task creation
    |--------------------------------------------------------------------------
    */

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
            'user_id' => $this->user->id,
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

    public function test_it_rejects_a_title_that_exceeds_the_maximum_length(): void
    {
        $this->postJson('/api/tasks', [
            'title' => str_repeat('A', 121),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title']);
    }

    public function test_it_rejects_invalid_status_and_priority(): void
    {
        $this->postJson('/api/tasks', [
            'title' => 'Write automated tests',
            'status' => 'pending',
            'priority' => 'urgent',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status', 'priority']);
    }

    public function test_it_rejects_an_invalid_due_date(): void
    {
        $this->postJson('/api/tasks', [
            'title' => 'Prepare project report',
            'due_date' => '04-11-2026',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['due_date']);
    }

    public function test_it_accepts_a_valid_due_date(): void
    {
        $this->postJson('/api/tasks', [
            'title' => 'Prepare project report',
            'due_date' => '2026-11-10',
        ])
            ->assertCreated()
            ->assertJsonPath('data.due_date', '2026-11-10');
    }

    public function test_a_user_cannot_assign_a_task_to_another_user(): void
    {
        $anotherUser = User::factory()->create();

        $this->postJson('/api/tasks', [
            'title' => 'My private task',
            'user_id' => $anotherUser->id,
        ])->assertCreated();

        $this->assertDatabaseHas('tasks', [
            'title' => 'My private task',
            'user_id' => $this->user->id,
        ]);

        $this->assertDatabaseMissing('tasks', [
            'title' => 'My private task',
            'user_id' => $anotherUser->id,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Task retrieval
    |--------------------------------------------------------------------------
    */

    public function test_it_returns_a_single_task(): void
    {
        $task = $this->user->tasks()->create([
            'title' => 'Review API implementation',
            'description' => 'Check all API endpoints.',
            'status' => 'in_progress',
            'priority' => 'high',
        ]);

        $this->getJson("/api/tasks/{$task->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $task->id)
            ->assertJsonPath('data.title', 'Review API implementation')
            ->assertJsonPath('data.status', 'in_progress')
            ->assertJsonPath('data.priority', 'high');
    }

    public function test_it_only_lists_tasks_belonging_to_the_authenticated_user(): void
    {
        $anotherUser = User::factory()->create();

        $this->user->tasks()->create([
            'title' => 'My task',
        ]);

        $anotherUser->tasks()->create([
            'title' => 'Another users task',
        ]);

        $this->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'My task');
    }

    /*
    |--------------------------------------------------------------------------
    | Task updates
    |--------------------------------------------------------------------------
    */

    public function test_it_updates_only_the_supplied_fields(): void
    {
        $task = $this->user->tasks()->create([
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
            'user_id' => $this->user->id,
            'status' => 'in_progress',
            'title' => 'Finish API',
        ]);
    }

    public function test_it_rejects_invalid_update_data(): void
    {
        $task = $this->user->tasks()->create([
            'title' => 'Update my task',
        ]);

        $this->patchJson("/api/tasks/{$task->id}", [
            'title' => 'AB',
            'status' => 'invalid',
            'priority' => 'urgent',
            'due_date' => 'not-a-date',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'title',
                'status',
                'priority',
                'due_date',
            ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Task deletion
    |--------------------------------------------------------------------------
    */

    public function test_it_deletes_a_task(): void
    {
        $task = $this->user->tasks()->create([
            'title' => 'Remove obsolete task',
        ]);

        $this->deleteJson("/api/tasks/{$task->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('tasks', [
            'id' => $task->id,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Task ownership and authorization
    |--------------------------------------------------------------------------
    */

    public function test_an_unauthenticated_user_cannot_access_tasks(): void
    {
        // Remove the authenticated user established in setUp().
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/tasks')
            ->assertUnauthorized();

        $this->postJson('/api/tasks', [
            'title' => 'Unauthenticated task',
        ])->assertUnauthorized();
    }

    public function test_a_user_cannot_view_another_users_task(): void
    {
        $anotherUser = User::factory()->create();

        $task = $anotherUser->tasks()->create([
            'title' => 'Private task',
        ]);

        $this->getJson("/api/tasks/{$task->id}")
            ->assertNotFound();
    }

    public function test_a_user_cannot_update_another_users_task(): void
    {
        $anotherUser = User::factory()->create();

        $task = $anotherUser->tasks()->create([
            'title' => 'Private task',
        ]);

        $this->patchJson("/api/tasks/{$task->id}", [
            'title' => 'Attempted modification',
        ])->assertNotFound();

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Private task',
            'user_id' => $anotherUser->id,
        ]);
    }

    public function test_a_user_cannot_delete_another_users_task(): void
    {
        $anotherUser = User::factory()->create();

        $task = $anotherUser->tasks()->create([
            'title' => 'Private task',
        ]);

        $this->deleteJson("/api/tasks/{$task->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'user_id' => $anotherUser->id,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Filtering and searching
    |--------------------------------------------------------------------------
    */

    public function test_it_filters_by_status_and_priority_together(): void
    {
        $this->user->tasks()->create([
            'title' => 'Matching task',
            'status' => 'todo',
            'priority' => 'high',
        ]);

        $this->user->tasks()->create([
            'title' => 'Wrong priority',
            'status' => 'todo',
            'priority' => 'low',
        ]);

        $this->user->tasks()->create([
            'title' => 'Wrong status',
            'status' => 'done',
            'priority' => 'high',
        ]);

        $this->getJson('/api/tasks?status=todo&priority=high')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Matching task');
    }

    public function test_it_filters_tasks_by_due_date(): void
    {
        $this->user->tasks()->create([
            'title' => 'Matching due date',
            'due_date' => '2026-11-10',
        ]);

        $this->user->tasks()->create([
            'title' => 'Different due date',
            'due_date' => '2026-11-15',
        ]);

        $this->getJson('/api/tasks?date_from=2026-11-10&date_to=2026-11-10')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Matching due date');
    }

    public function test_it_searches_task_titles_and_descriptions(): void
    {
        $this->user->tasks()->create([
            'title' => 'Prepare report',
            'description' => 'Review monthly financial figures.',
        ]);

        $this->user->tasks()->create([
            'title' => 'Update dashboard',
            'description' => 'Improve dashboard layout.',
        ]);

        $this->getJson('/api/tasks?search=financial')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Prepare report');
    }

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    public function test_it_returns_paginated_tasks(): void
    {
        for ($i = 1; $i <= 12; $i++) {
            $this->user->tasks()->create([
                'title' => sprintf('Task number %02d', $i),
            ]);
        }

        $this->getJson('/api/tasks?page=1')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 12)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 2);

        $this->getJson('/api/tasks?page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.current_page', 2);
    }

    public function test_it_supports_a_custom_page_size(): void
    {
        for ($i = 1; $i <= 25; $i++) {
            $this->user->tasks()->create([
                'title' => "Task {$i}",
            ]);
        }

        $this->getJson('/api/tasks?per_page=20')
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.per_page', 20)
            ->assertJsonPath('meta.total', 25);
    }

    public function test_it_does_not_allow_more_than_fifty_tasks_per_page(): void
    {
        $this->getJson('/api/tasks?per_page=51')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['per_page']);
    }

    public function test_it_rejects_an_invalid_page_size(): void
    {
        $this->getJson('/api/tasks?per_page=0')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['per_page']);
    }

    public function test_it_supports_the_maximum_page_size(): void
    {
        for ($i = 1; $i <= 55; $i++) {
            $this->user->tasks()->create([
                'title' => "Task {$i}",
            ]);
        }

        $this->getJson('/api/tasks?per_page=50')
            ->assertOk()
            ->assertJsonCount(50, 'data')
            ->assertJsonPath('meta.per_page', 50)
            ->assertJsonPath('meta.total', 55);

        $this->getJson('/api/tasks?per_page=50&page=2')
            ->assertOk()
            ->assertJsonCount(5, 'data');
    }

    /*
    |--------------------------------------------------------------------------
    | Sorting
    |--------------------------------------------------------------------------
    */

    public function test_it_sorts_tasks_by_priority(): void
    {
        $this->user->tasks()->create([
            'title' => 'Low priority task',
            'priority' => 'low',
        ]);

        $this->user->tasks()->create([
            'title' => 'High priority task',
            'priority' => 'high',
        ]);

        $this->user->tasks()->create([
            'title' => 'Medium priority task',
            'priority' => 'medium',
        ]);

        $this->getJson('/api/tasks?sort_by=priority&sort_direction=asc')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'High priority task')
            ->assertJsonPath('data.1.title', 'Medium priority task')
            ->assertJsonPath('data.2.title', 'Low priority task');
    }

    public function test_it_sorts_tasks_by_due_date(): void
    {
        $this->user->tasks()->create([
            'title' => 'Later task',
            'due_date' => '2026-11-20',
        ]);

        $this->user->tasks()->create([
            'title' => 'Earlier task',
            'due_date' => '2026-11-05',
        ]);

        $this->getJson('/api/tasks?sort_by=due_date&sort_direction=asc')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Earlier task')
            ->assertJsonPath('data.1.title', 'Later task');
    }

    public function test_it_rejects_an_unsupported_sort_column(): void
    {
        $this->getJson('/api/tasks?sort_by=user_id')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sort_by']);
    }

    public function test_it_rejects_an_unsupported_sort_direction(): void
    {
        $this->getJson('/api/tasks?sort_direction=random')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sort_direction']);
    }

    /*
    |--------------------------------------------------------------------------
    | Not found responses
    |--------------------------------------------------------------------------
    */

    public function test_missing_tasks_return_not_found(): void
    {
        $this->getJson('/api/tasks/999999')
            ->assertNotFound();

        $this->patchJson('/api/tasks/999999', [
            'status' => 'done',
        ])->assertNotFound();

        $this->deleteJson('/api/tasks/999999')
            ->assertNotFound();
    }

    public function test_it_filters_tasks_by_due_date_range(): void
    {
        $this->user->tasks()->create([
            'title' => 'Task before range',
            'due_date' => '2026-10-30',
        ]);

        $this->user->tasks()->create([
            'title' => 'Task inside range',
            'due_date' => '2026-11-05',
        ]);

        $this->user->tasks()->create([
            'title' => 'Task after range',
            'due_date' => '2026-11-15',
        ]);

        $response = $this->actingAs($this->user)->getJson(
            '/api/tasks?date_from=2026-11-01&date_to=2026-11-10'
        );

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment([
                'title' => 'Task inside range',
            ]);
    }

    public function test_it_filters_tasks_from_a_start_date(): void
    {
        $this->user->tasks()->create([
            'title' => 'Earlier task',
            'due_date' => '2026-10-30',
        ]);

        $this->user->tasks()->create([
            'title' => 'Later task',
            'due_date' => '2026-11-05',
        ]);

        $response = $this->actingAs($this->user)->getJson(
            '/api/tasks?date_from=2026-11-01'
        );

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment([
                'title' => 'Later task',
            ]);
    }

    public function test_it_rejects_an_invalid_due_date_range(): void
    {
        $response = $this->actingAs($this->user)->getJson(
            '/api/tasks?date_from=2026-11-10&date_to=2026-11-01'
        );

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['date_to']);
    }
}
