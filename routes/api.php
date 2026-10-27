<?php

use App\Http\Controllers\Api\TaskController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

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

// Public authentication endpoints.
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:5,1');

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

// Authenticated endpoints.
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::apiResource('tasks', TaskController::class);
});

