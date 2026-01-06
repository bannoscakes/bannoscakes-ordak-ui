import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  DollarSign,
  Package,
  Target,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Truck,
  ShoppingBag
} from "lucide-react";
import { TallCakeIcon } from "./TallCakeIcon";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import ChartContainer from "@/components/analytics/ChartContainer";
import KpiValue from "@/components/analytics/KpiValue";
import {
  getStoreAnalytics,
  getRevenueByDay,
  getTopProducts,
  getWeeklyForecast,
  getDeliveryBreakdown,
  type StoreAnalytics,
  type RevenueByDay,
  type TopProduct,
  type WeeklyForecast,
  type DeliveryBreakdown
} from "../lib/rpc-client";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { format, subDays, startOfWeek, addWeeks, subWeeks, parseISO } from "date-fns";

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COLORS = ['#ec4899', '#f472b6', '#f9a8d4', '#fbb6ce', '#fce7f3'];

type DateRange = '7d' | '30d' | '90d';

export function FlourlaneAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [analytics, setAnalytics] = useState<StoreAnalytics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueByDay[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [weeklyForecast, setWeeklyForecast] = useState<WeeklyForecast[]>([]);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState<DeliveryBreakdown[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const start = subDays(end, days - 1); // inclusive range
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    };
  }, [dateRange]);

  const weekStart = useMemo(() => {
    const now = new Date();
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    const adjusted = weekOffset > 0 ? addWeeks(monday, weekOffset) : weekOffset < 0 ? subWeeks(monday, Math.abs(weekOffset)) : monday;
    return format(adjusted, 'yyyy-MM-dd');
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    const start = parseISO(weekStart);
    const end = subDays(addWeeks(start, 1), 1); // Sun = Mon + 6 days
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }, [weekStart]);

  useEffect(() => {
    async function fetchAnalyticsData() {
      setLoading(true);
      try {
        const [analyticsData, revenue, products] = await Promise.all([
          getStoreAnalytics('flourlane', startDate, endDate),
          getRevenueByDay('flourlane', startDate, endDate),
          getTopProducts('flourlane', startDate, endDate, 5)
        ]);

        setAnalytics(analyticsData);
        setRevenueData(revenue);
        setTopProducts(products);
      } catch (error) {
        console.error('Error fetching Flourlane analytics:', error);
        toast.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalyticsData();
  }, [startDate, endDate]);

  useEffect(() => {
    async function fetchWeeklyData() {
      try {
        const [forecast, delivery] = await Promise.all([
          getWeeklyForecast('flourlane', weekStart),
          getDeliveryBreakdown('flourlane', weekStart)
        ]);
        setWeeklyForecast(forecast);
        setDeliveryBreakdown(delivery);
      } catch (error) {
        console.error('Error fetching weekly data:', error);
      }
    }
    fetchWeeklyData();
  }, [weekStart]);

  const chartRevenueData = useMemo(() => {
    return revenueData.map(d => ({
      date: format(parseISO(d.day), 'MMM d'),
      revenue: Number(d.revenue),
      orders: Number(d.orders)
    }));
  }, [revenueData]);

  const chartForecastData = useMemo(() => {
    return weeklyForecast.map(d => ({
      day: DAY_NAMES[d.day_of_week - 1], // day_of_week is 1-indexed (1=Mon)
      date: format(parseISO(d.day_date), 'MMM d'),
      total: Number(d.total_orders),
      completed: Number(d.completed_orders),
      pending: Number(d.pending_orders)
    }));
  }, [weeklyForecast]);

  const pieDeliveryData = useMemo(() => {
    return deliveryBreakdown.map((d, idx) => ({
      name: d.delivery_method,
      value: Number(d.order_count),
      percentage: Number(d.percentage),
      color: COLORS[idx % COLORS.length]
    }));
  }, [deliveryBreakdown]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-pink-100/70 dark:bg-pink-900/40">
            <TallCakeIcon className="h-8 w-8 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-medium text-foreground">Flourlane Analytics</h1>
            <p className="text-muted-foreground">Performance insights for cake & dessert operations</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as DateRange[]).map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange(range)}
              className={dateRange === range ? "bg-pink-600 hover:bg-pink-700" : ""}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-semibold text-foreground">
                {loading ? '...' : <KpiValue value={analytics?.total_revenue} unit="currency" />}
              </p>
            </div>
            <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-3xl font-semibold text-foreground">
                {loading ? '...' : <KpiValue value={analytics?.total_orders} unit="count" />}
              </p>
            </div>
            <Package className="h-6 w-6 text-pink-600 dark:text-pink-400" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              <p className="text-3xl font-semibold text-foreground">
                {loading ? '...' : <KpiValue value={analytics?.avg_order_value} unit="currency" />}
              </p>
            </div>
            <Target className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pending Today</p>
              <p className="text-3xl font-semibold text-foreground">
                {loading ? '...' : <KpiValue value={analytics?.pending_today} unit="count" />}
              </p>
            </div>
            <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Revenue & Orders</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="forecast">Weekly Forecast</TabsTrigger>
          <TabsTrigger value="delivery">Delivery/Pickup</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer hasData={chartRevenueData.length > 0}>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                      <Area type="monotone" dataKey="revenue" stroke="#ec4899" fill="#ec4899" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Orders Volume */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  Orders Volume
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer hasData={chartRevenueData.length > 0}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="orders" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card className="p-6">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="flex items-center gap-2">
                <TallCakeIcon className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                Top 5 Products by Order Count
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ChartContainer hasData={topProducts.length > 0}>
                <div className="space-y-4">
                  {topProducts.map((product, idx) => {
                    const maxCount = topProducts[0]?.order_count || 1;
                    const percentage = (Number(product.order_count) / Number(maxCount)) * 100;
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground truncate max-w-[60%]">{product.product_title}</span>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">{product.order_count} orders</span>
                            <span className="font-medium text-foreground">${Number(product.total_revenue).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <Card className="p-6">
            <CardHeader className="p-0 pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  Weekly Forecast
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[180px] text-center">{weekLabel}</span>
                  <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {weekOffset !== 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ChartContainer hasData={chartForecastData.length > 0}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartForecastData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="font-medium">{label} ({data.date})</p>
                              <p className="text-sm text-green-600 dark:text-green-400">Completed: {data.completed}</p>
                              <p className="text-sm text-orange-600 dark:text-orange-400">Pending: {data.pending}</p>
                              <p className="text-sm font-medium">Total: {data.total}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Completed" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pending" stackId="a" fill="#f97316" name="Pending" radius={[4, 4, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                    Delivery vs Pickup
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">{weekLabel}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer hasData={pieDeliveryData.length > 0}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieDeliveryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                      >
                        {pieDeliveryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  Breakdown Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-4">
                  {deliveryBreakdown.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No orders this week</p>
                  ) : (
                    deliveryBreakdown.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="font-medium">{item.delivery_method}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">{item.order_count} orders</span>
                          <span className="font-semibold">{item.percentage}%</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
