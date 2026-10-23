<?php

use App\Http\Controllers\Api\TaskController;
use Illuminate\Support\Facades\Route;

Route::get('/tasks', [TaskController::class, 'index'])
    ->name('tasks.index');

Route::post('/tasks', [TaskController::class, 'store'])
    ->name('tasks.store');

Route::get('/tasks/{task}', [TaskController::class, 'show'])
    ->whereNumber('task')
    ->name('tasks.show');

Route::patch('/tasks/{task}', [TaskController::class, 'update'])
    ->whereNumber('task')
    ->name('tasks.update');

Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])
    ->whereNumber('task')
    ->name('tasks.destroy');
