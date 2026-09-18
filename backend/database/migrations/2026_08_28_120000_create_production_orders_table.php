<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('production_orders', function (Blueprint $table) {
            $table->id();
            $table->string('po_no')->unique();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->decimal('planned_qty', 15, 4);
            $table->decimal('produced_qty', 15, 4)->default(0);
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->date('order_date')->nullable();
            $table->date('due_date')->nullable();
            $table->enum('status', ['draft', 'in_progress', 'completed', 'cancelled'])->default('draft');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('status');
        });

        Schema::create('production_order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_order_id')->constrained('production_orders')->cascadeOnDelete();
            $table->foreignId('component_id')->constrained('products')->cascadeOnDelete();
            $table->decimal('planned_qty', 15, 4);
            $table->decimal('issued_qty', 15, 4)->default(0);
            $table->decimal('qty_per_unit', 15, 4)->default(0);
            $table->timestamps();
        });

        Schema::create('production_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_order_id')->constrained('production_orders')->cascadeOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained('batches')->nullOnDelete();
            $table->decimal('quantity', 15, 4);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_batches');
        Schema::dropIfExists('production_order_lines');
        Schema::dropIfExists('production_orders');
    }
};
