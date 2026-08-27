<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_opname_headers', function (Blueprint $table) {
            $table->id();
            $table->string('opname_no')->unique();
            $table->foreignId('warehouse_id')->constrained()->restrictOnDelete();
            $table->date('opname_date')->nullable();
            $table->enum('status', ['draft', 'counted', 'posted'])->default('draft');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('stock_opname_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_opname_header_id')->constrained('stock_opname_headers')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('qty_system', 15, 4)->default(0);
            $table->decimal('qty_count', 15, 4)->default(0);
            $table->decimal('qty_diff', 15, 4)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_opname_lines');
        Schema::dropIfExists('stock_opname_headers');
    }
};
