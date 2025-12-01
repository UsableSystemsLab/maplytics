"use client";

import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function VisualizeDatasetPage() {
    const [restaurants, setRestaurants] = useState([]);

    useEffect(() => {
        fetch("/restaurants_detailed_data.json")
            .then((res) => res.json())
            .then((data) => setRestaurants(data))
            .catch((err) => console.error("Error loading dataset:", err));
    }, []);

    if (!restaurants.length) {
        return (
            <div className="p-8 text-center text-gray-500">
                Loading restaurant dataset...
            </div>
        );
    }

    return (
        <div className="p-8 space-y-10 min-h-screen">

            <h1 className="text-3xl font-bold">Restaurant Dataset Visualization</h1>

            <div className="mx-auto w-full max-w-3xl h-72 bg-gray-200 border-2 border-dashed border-gray-400 rounded-lg overflow-hidden flex items-center justify-center">
                <img
                    src="/comparasion.png"
                    alt="Comparison Map"
                    className="w-full h-full object-cover"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {restaurants.map((r, idx) => (
                    <RestaurantCard restaurant={r} key={idx} />
                ))}
            </div>

            <ComparisonSection restaurants={restaurants} />

            <div className="h-[15px]" /> {/* Spacer */}
        </div>
    );
}


function computeAverages(orderTimes = {}) {
    const sums = { dine_in: 0, takeaway: 0, delivery: 0 };
    const entries = Object.values(orderTimes);
    if (!entries.length) return { dine_in: 0, takeaway: 0, delivery: 0 };

    entries.forEach((e) => {
        sums.dine_in += e.dine_in;
        sums.takeaway += e.takeaway;
        sums.delivery += e.delivery;
    });

    const count = entries.length;

    return {
        dine_in: Math.round(sums.dine_in / count),
        takeaway: Math.round(sums.takeaway / count),
        delivery: Math.round(sums.delivery / count),
    };
}

function computeAverageRating(reviews = []) {
    if (!reviews.length) return "0.0";
    const avg =
        reviews.reduce((acc, r) => acc + (r.rating ?? 0), 0) / reviews.length;
    return avg.toFixed(1);
}


function RestaurantCard({ restaurant: r }) {
    const avgOrderTimes = computeAverages(r.order_completion_time_per_hour);
    const avgRating = computeAverageRating(r.reviews);

    const trafficHours = Object.keys(r.hourly_traffic_percent);
    const trafficValues = Object.values(r.hourly_traffic_percent);

    const trafficChartData = {
        labels: trafficHours,
        datasets: [
            {
                label: "Traffic %",
                data: trafficValues,
                backgroundColor: "rgba(19, 179, 141, 0.75)",
                borderRadius: 6,
            },
        ],
    };

    const trafficChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: { beginAtZero: true, max: 100 },
        },
    };

    return (
        <div className="p-6 bg-white shadow rounded-xl border">
            <h2 className="text-2xl font-semibold mb-1">{r.restaurant_name}</h2>
            <p className="text-body-text mb-3">
                District: <span className="font-medium">{r.district}</span>
            </p>

            <div className="mb-4">
                <p className="text-body-text font-medium">Coordinates:</p>
                <p className="text-sm text-gray-600 ml-2">
                    Lat: {r.latitude}, Lng: {r.longitude}
                </p>
            </div>

            <div className="mb-6">
                <p className="font-medium text-body-text mb-2">Hourly Traffic % (Bar Chart)</p>

                <div className="h-48 w-full">
                    <Bar data={trafficChartData} options={trafficChartOptions} />
                </div>
            </div>

            <div className="mb-4">
                <p className="font-medium text-body-text mb-2">
                    Hourly Performance (Traffic % + Order Times)
                </p>

                <div className="relative overflow-auto border rounded-md max-h-72">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0 z-10 border-b">
                            <tr className="bg-ocean-blue text-white">
                                <th className="px-3 py-2 text-left">Hour</th>
                                <th className="px-3 py-2 text-left">Traffic %</th>
                                <th className="px-3 py-2 text-left">Dine-in</th>
                                <th className="px-3 py-2 text-left">Takeaway</th>
                                <th className="px-3 py-2 text-left">Delivery</th>
                            </tr>
                        </thead>

                        <tbody>
                            {Object.entries(r.order_completion_time_per_hour).map(
                                ([hour, vals]) => (
                                    <tr key={hour} className="border-t">
                                        <td className="px-3 py-2">{hour}</td>
                                        <td className="px-3 py-2">
                                            {r.hourly_traffic_percent?.[hour]}%
                                        </td>
                                        <td className="px-3 py-2">{vals.dine_in}</td>
                                        <td className="px-3 py-2">{vals.takeaway}</td>
                                        <td className="px-3 py-2">{vals.delivery}</td>
                                    </tr>
                                )
                            )}
                        </tbody>

                        <tfoot className="sticky bottom-0 bg-ocean-blue text-white border-t font-semibold z-10">
                            <tr>
                                <td className="px-3 py-2">Average</td>
                                <td className="px-3 py-2">—</td>
                                <td className="px-3 py-2">{avgOrderTimes.dine_in} min</td>
                                <td className="px-3 py-2">{avgOrderTimes.takeaway} min</td>
                                <td className="px-3 py-2">{avgOrderTimes.delivery} min</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className="mt-4">
                <p className="font-medium text-body-text mb-1">
                    ⭐ Average Rating: {avgRating}/5
                </p>

                <p className="font-medium text-body-text mt-2 mb-1">
                    Customer Reviews
                </p>

                <div className="space-y-3">
                    {r.reviews.map((rev, idx) => (
                        <div
                            key={idx}
                            className="p-2 bg-gray-100 rounded-lg text-sm shadow"
                        >
                            <p className="font-semibold">⭐ {rev.rating}</p>
                            <p>{rev.comment}</p>
                            <p className="text-xs text-body-text mt-1">
                                {rev.date}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


function ComparisonSection({ restaurants }) {
    const avgDeliveryTimes = restaurants.map((r) =>
        computeAverages(r.order_completion_time_per_hour).delivery
    );

    const fastest = avgDeliveryTimes.indexOf(Math.min(...avgDeliveryTimes));
    const slowest = avgDeliveryTimes.indexOf(Math.max(...avgDeliveryTimes));

    return (
        <div className="p-6 bg-white rounded-xl shadow border">
            <h2 className="text-2xl font-bold mb-4">Overall Comparison</h2>

            <p className="mb-2">
                <b>Fastest Delivery:</b>{" "}
                {restaurants[fastest].restaurant_name} (
                {avgDeliveryTimes[fastest]} min)
            </p>

            <p className="mb-2">
                <b>Slowest Delivery:</b>{" "}
                {restaurants[slowest].restaurant_name} (
                {avgDeliveryTimes[slowest]} min)
            </p>

            <p className="text-body-text mt-4">
                Average is based on all recorded hourly delivery times.
            </p>
        </div>
    );
}
