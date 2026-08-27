<?php

namespace App\Providers;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Location;
use App\Models\PriceList;
use App\Models\Product;
use App\Models\Setting;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Observers\AuditObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $audited = [
            User::class,
            Brand::class,
            Category::class,
            Customer::class,
            PriceList::class,
            Product::class,
            Setting::class,
            Supplier::class,
            Unit::class,
            Warehouse::class,
            Location::class,
        ];

        foreach ($audited as $model) {
            $model::observe(AuditObserver::class);
        }
    }
}
