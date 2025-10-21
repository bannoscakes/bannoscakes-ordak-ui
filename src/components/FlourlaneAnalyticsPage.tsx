import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Users, 
  Clock,
  Target,
  Calendar,
  Wheat,
  Award,
  AlertCircle
} from "lucide-react";
import { TallCakeIcon } from "./TallCakeIcon";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import KpiValue from "@/components/analytics/KpiValue";
import { ANALYTICS_ENABLED } from "@/config/flags";

// Mock data for Flourlane Analytics
const revenueData = [
  { month: "Jan", revenue: 32000, orders: 450, avgOrder: 71.1 },
  { month: "Feb", revenue: 34500, orders: 480, avgOrder: 71.9 },
  { month: "Mar", revenue: 38000, orders: 520, avgOrder: 73.1 },
  { month: "Apr", revenue: 36500, orders: 495, avgOrder: 73.7 },
  { month: "May", revenue: 41000, orders: 565, avgOrder: 72.6 },
  { month: "Jun", revenue: 43500, orders: 590, avgOrder: 73.7 },
  { month: "Jul", revenue: 46000, orders: 620, avgOrder: 74.2 },
  { month: "Aug", revenue: 48500, orders: 655, avgOrder: 74.0 }
];

const productPerformance = [
  { name: "Layer Cakes", value: 32, revenue: 18400, color: "#ec4899" },
  { name: "Cupcakes", value: 25, revenue: 14200, color: "#f472b6" },
  { name: "Cheesecakes", value: 18, revenue: 10800, color: "#f9a8d4" },
  { name: "Tiramisu", value: 15, revenue: 7200, color: "#fbb6ce" },
  { name: "Custom Cakes", value: 10, revenue: 5900, color: "#fce7f3" }
];

const qualityMetrics = [
  { month: "Jan", score: 96.8, defects: 8, rework: 5 },
  { month: "Feb", score: 97.2, defects: 6, rework: 4 },
  { month: "Mar", score: 98.1, defects: 4, rework: 2 },
  { month: "Apr", score: 97.5, defects: 7, rework: 3 },
  { month: "May", score: 98.9, defects: 3, rework: 1 },
  { month: "Jun", score: 98.4, defects: 4, rework: 2 },
  { month: "Jul", score: 99.2, defects: 2, rework: 1 },
  { month: "Aug", score: 98.7, defects: 3, rework: 2 }
];

const productionEfficiency = [
  { station: "Filling", efficiency: 96.2, target: 92, output: 2150 },
  { station: "Covering", efficiency: 91.5, target: 88, output: 1850 },
  { station: "Decoration", efficiency: 93.8, target: 90, output: 1980 },
  { station: "Packing", efficiency: 97.3, target: 94, output: 2180 }
];

const bakingSchedule = [
  { time: "04:00", product: "Layer Cakes", batches: 8, temp: "350°F" },
  { time: "05:30", product: "Cupcakes", batches: 6, temp: "325°F" },
  { time: "07:00", product: "Cheesecakes", batches: 12, temp: "300°F" },
  { time: "08:30", product: "Tiramisu", batches: 10, temp: "325°F" },
  { time: "10:00", product: "Custom Cakes", batches: 4, temp: "350°F" }
];

const kpiMetrics = [
  { title: "Monthly Revenue", value: null, change: "", trend: "up", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
  { title: "Total Orders", value: null, change: "", trend: "up", icon: Package, color: "text-pink-600", bg: "bg-pink-50" },
  { title: "Average Order Value", value: null, change: "", trend: "up", icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
  { title: "Quality Score", value: null, change: "", trend: "up", icon: Award, color: "text-orange-600", bg: "bg-orange-50" }
];

export function FlourlaneAnalyticsPage() {
  const isEnabled = ANALYTICS_ENABLED;
  const revenueDataUse = isEnabled ? revenueData : [];
  const productPerformanceUse = isEnabled ? productPerformance : [];
  const qualityMetricsUse = isEnabled ? qualityMetrics : [];
  const productionEfficiencyUse = isEnabled ? productionEfficiency : [];
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-pink-100">
            <TallCakeIcon className="h-8 w-8 text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-medium text-foreground">Flourlane Analytics</h1>
            <p className="text-muted-foreground">Comprehensive performance insights for cake & dessert operations</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiMetrics.map((metric, index) => (
          <Card key={index} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="font-medium text-muted-foreground">{metric.title}</p>
                <div className="space-y-1">
                  <div className="space-y-1">
                    <p className="text-3xl font-semibold text-foreground">
                      {metric.title === "Quality Score" ? <KpiValue value={null} /> : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">No data yet</p>
                  </div>
                </div>
              </div>
              <div className={`p-3 rounded-xl ${metric.bg}`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="revenue">Revenue & Orders</TabsTrigger>
          <TabsTrigger value="products">Product Performance</TabsTrigger>
          <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          <TabsTrigger value="efficiency">Production Efficiency</TabsTrigger>
          <TabsTrigger value="schedule">Baking Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-pink-600" />
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {revenueDataUse.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No data to display</div>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueDataUse}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#ec4899" fill="#ec4899" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Orders Volume */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-pink-600" />
                  Orders Volume
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {revenueDataUse.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No data to display</div>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueDataUse}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Distribution */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle>Product Category Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={300}>
                  {productPerformanceUse.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data to display</div>
                  ) : (
                  <PieChart>
                    <Pie
                      data={productPerformanceUse}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({name, value}) => `${name}: ${value}%`}
                    >
                      {productPerformanceUse.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Product Revenue */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle>Revenue by Product</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {productPerformanceUse.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No data to display</div>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productPerformanceUse} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#ec4899" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quality Score Trend */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-pink-600" />
                  Quality Score Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {qualityMetricsUse.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No data to display</div>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={qualityMetricsUse}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[95, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#ec4899" strokeWidth={3} dot={{fill: '#ec4899', strokeWidth: 2, r: 4}} />
                  </LineChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Defects & Rework */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-pink-600" />
                  Defects & Rework
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={qualityMetrics}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="defects" fill="#ef4444" name="Defects" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="rework" fill="#f97316" name="Rework" radius={[2, 2, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-6">
          <Card className="p-6">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-pink-600" />
                Production Station Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-6">
                {productionEfficiency.map((station, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{station.station}</h4>
                        <p className="text-sm text-muted-foreground">Target: {station.target}% | Output: {station.output} units</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{station.efficiency}%</p>
                        <Badge 
                          className={station.efficiency >= station.target ? 
                            "bg-green-100 text-green-700" : 
                            "bg-orange-100 text-orange-700"
                          }
                        >
                          {station.efficiency >= station.target ? "Above Target" : "Below Target"}
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div 
                        className="bg-pink-600 h-3 rounded-full transition-all duration-500 relative"
                        style={{ width: `${(station.efficiency / 100) * 100}%` }}
                      >
                        <div 
                          className="absolute top-0 h-3 w-1 bg-red-500"
                          style={{ left: `${station.target}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card className="p-6">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-pink-600" />
                Daily Production Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-medium text-muted-foreground pb-3">Time</th>
                      <th className="text-left font-medium text-muted-foreground pb-3">Product</th>
                      <th className="text-left font-medium text-muted-foreground pb-3">Batches</th>
                      <th className="text-left font-medium text-muted-foreground pb-3">Temperature</th>
                      <th className="text-left font-medium text-muted-foreground pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bakingSchedule.map((item, index) => (
                      <tr key={index} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="py-4 font-medium text-foreground">{item.time}</td>
                        <td className="py-4 text-foreground">{item.product}</td>
                        <td className="py-4 text-foreground">{item.batches}</td>
                        <td className="py-4 text-foreground">{item.temp}</td>
                        <td className="py-4">
                          <Badge className={index < 2 ? "bg-green-100 text-green-700" : index < 4 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-700"}>
                            {index < 2 ? "Completed" : index < 4 ? "In Progress" : "Scheduled"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}