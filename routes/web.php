<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Web\TaskPageController;

Route::view('/', 'tasks')->name('tasks.index');

Route::get('/tasks', [TaskPageController::class, 'index'])
    ->name('tasks.index');