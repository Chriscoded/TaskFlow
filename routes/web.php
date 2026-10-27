<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Web\TaskPageController;

Route::view('/', 'tasks')->name('tasks.index');

Route::get('/tasks', [TaskPageController::class, 'task'])
    ->name('tasks.task');

Route::get('/dashboard', [TaskPageController::class, 'index'])
    ->name('dashboard.index');