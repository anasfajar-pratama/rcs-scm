<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_requisitions', function (Blueprint $table) {
            $table->id();
            $table->string('pr_no')->unique();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('department')->nullable();
            $table->date('needed_date')->nullable();
            $table->enum('status', ['draft', 'pending', 'approved', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('pr_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_requisition_id')->constrained('purchase_requisitions')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('qty', 15, 4)->default(0);
            $table->foreignId('preferred_supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->decimal('estimated_price', 15, 2)->nullable();
            $table->string('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pr_lines');
        Schema::dropIfExists('purchase_requisitions');
    }
};
