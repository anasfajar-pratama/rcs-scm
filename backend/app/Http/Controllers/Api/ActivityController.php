<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $search = $request->query('search');
        $status = $request->query('status');
        $type = $request->query('type');
        $relatedType = $request->query('related_type');
        $relatedId = $request->query('related_id');

        $query = Activity::query()
            ->when($search, fn ($q) => $q->where('subject', 'like', "%$search%"))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($type, fn ($q) => $q->where('type', $type))
            ->when($relatedType, fn ($q) => $q->where('related_type', $relatedType))
            ->when($relatedId, fn ($q) => $q->where('related_id', $relatedId))
            ->latest();

        return $this->successPagination($query->paginate($perPage), 'OK', fn ($p) => $p->items());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'in:call,email,meeting,task,follow_up'],
            'due_date' => ['nullable', 'date'],
            'status' => ['nullable', 'in:open,done,cancelled'],
            'priority' => ['nullable', 'in:low,medium,high'],
            'notes' => ['nullable', 'string'],
            'related_type' => ['nullable', 'in:lead,opportunity,customer'],
            'related_id' => ['nullable', 'integer'],
        ]);

        $activity = Activity::create([
            'subject' => $validated['subject'],
            'type' => $validated['type'] ?? 'task',
            'due_date' => $validated['due_date'] ?? null,
            'status' => $validated['status'] ?? 'open',
            'priority' => $validated['priority'] ?? 'medium',
            'notes' => $validated['notes'] ?? null,
            'related_type' => $validated['related_type'] ?? null,
            'related_id' => $validated['related_id'] ?? null,
            'created_by' => auth()->id(),
        ]);

        return $this->success($activity, 'Activity dibuat.', 201);
    }

    public function show(Activity $activity): JsonResponse
    {
        return $this->success($activity);
    }

    public function update(Request $request, Activity $activity): JsonResponse
    {
        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'in:call,email,meeting,task,follow_up'],
            'due_date' => ['nullable', 'date'],
            'status' => ['nullable', 'in:open,done,cancelled'],
            'priority' => ['nullable', 'in:low,medium,high'],
            'notes' => ['nullable', 'string'],
            'related_type' => ['nullable', 'in:lead,opportunity,customer'],
            'related_id' => ['nullable', 'integer'],
        ]);

        $activity->update($validated);

        return $this->success($activity, 'Activity diperbarui.');
    }

    public function destroy(Activity $activity): JsonResponse
    {
        $activity->delete();

        return $this->success(null, 'Activity dihapus.');
    }

    public function markDone(Activity $activity): JsonResponse
    {
        $activity->update(['status' => 'done']);

        return $this->success($activity->fresh(), 'Activity selesai.');
    }
}
