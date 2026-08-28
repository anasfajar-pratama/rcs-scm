<?php

namespace App\Providers;

use App\Models\Activity;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\Location;
use App\Models\Opportunity;
use App\Models\PriceList;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\SalesQuotation;
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
            Lead::class,
            Opportunity::class,
            Activity::class,
            SalesQuotation::class,
            SalesOrder::class,
        ];

        foreach ($audited as $model) {
            $model::observe(AuditObserver::class);
        }
    }
}
