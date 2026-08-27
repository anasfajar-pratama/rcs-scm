<?php

namespace App\Services;

class DocumentNumberService
{
    public function generate(string $prefix, ?string $table = null, string $column = null, mixed $model = null): string
    {
        $date = now()->format('Ymd');
        $base = strtoupper($prefix) . '-' . $date . '-';

        $count = $this->nextSequence($base, $table, $column, $model);
        $count = str_pad((string) $count, 5, '0', STR_PAD_LEFT);

        return $base . $count;
    }

    private function nextSequence(string $base, ?string $table, ?string $column, mixed $model): int
    {
        if ($table && $column) {
            $last = \DB::table($table)->where($column, 'like', "$base%")->latest('id')->value($column);
            if ($last) {
                return (int) substr($last, -5) + 1;
            }

            return 1;
        }

        return \DB::table($table ?? 'transfer_headers')->count() + 1;
    }
}
