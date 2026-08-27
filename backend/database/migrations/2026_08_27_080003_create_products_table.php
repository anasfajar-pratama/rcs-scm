<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('barcode')->nullable();
            $table->string('name');
            $table->enum('type', ['raw_material', 'finished_good'])->default('finished_good');
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('brand_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('cost', 15, 2)->default(0);
            $table->decimal('sale_price', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('track_batch')->default(true);
            $table->boolean('expiry_required')->default(false);
            $table->integer('shelf_life_days')->nullable();
            $table->decimal('reorder_point', 15, 2)->nullable();
            $table->decimal('reorder_quantity', 15, 2)->nullable();
            $table->decimal('safety_stock', 15, 2)->nullable();
            $table->string('image')->nullable();
            $table->text('description')->nullable();
            $table->json('ingredients')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
