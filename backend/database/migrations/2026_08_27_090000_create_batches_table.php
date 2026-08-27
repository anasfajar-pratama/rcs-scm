<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('lot_no');
            $table->date('mfg_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->integer('shelf_life_days')->nullable();
            $table->enum('status', ['available', 'expire_soon', 'expired'])->default('available');
            $table->enum('source_type', ['production', 'receiving', 'opening'])->default('receiving');
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'expiry_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('batches');
    }
};
