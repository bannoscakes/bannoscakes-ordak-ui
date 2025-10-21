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
  Cake,
  Award,
  AlertCircle
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import AnalyticsKPI from "@/components/analytics/AnalyticsKPI";
import ChartContainer from "@/components/analytics/ChartContainer";
import { useAnalyticsEnabled } from "@/hooks/useAnalyticsEnabled";

// Mock data for Bannos Analytics
const revenueData = [
  { month: "Jan", revenue: 45000, orders: 320, avgOrder: 140.6 },
  { month: "Feb", revenue: 48000, orders: 340, avgOrder: 141.2 },
  { month: "Mar", revenue: 52000, orders: 365, avgOrder: 142.5 },
  { month: "Apr", revenue: 49000, orders: 345, avgOrder: 142.0 },
  { month: "May", revenue: 55000, orders: 385, avgOrder: 142.9 },
  { month: "Jun", revenue: 58000, orders: 405, avgOrder: 143.2 },
  { month: "Jul", revenue: 62000, orders: 435, avgOrder: 142.5 },
  { month: "Aug", revenue: 66000, orders: 465, avgOrder: 141.9 }
];

const productPerformance = [
  { name: "Wedding Cakes", value: 35, revenue: 24500, color: "#3b82f6" },
  { name: "Birthday Cakes", value: 28, revenue: 18200, color: "#60a5fa" },
  { name: "Cupcakes", value: 20, revenue: 12600, color: "#93c5fd" },
  { name: "Cheesecakes", value: 10, revenue: 8400, color: "#bfdbfe" },
  { name: "Custom Desserts", value: 7, revenue: 6300, color: "#dbeafe" }
];

const qualityMetrics = [
  { month: "Jan", score: 94.2, defects: 12, rework: 8 },
  { month: "Feb", score: 95.1, defects: 10, rework: 6 },
  { month: "Mar", score: 96.8, defects: 8, rework: 4 },
  { month: "Apr", score: 95.5, defects: 11, rework: 7 },
  { month: "May", score: 97.2, defects: 6, rework: 3 },
  { month: "Jun", score: 96.9, defects: 7, rework: 4 },
  { month: "Jul", score: 98.1, defects: 4, rework: 2 },
  { month: "Aug", score: 97.8, defects: 5, rework: 3 }
];

const productionEfficiency = [
  { station: "Filling", efficiency: 94.5, target: 90, output: 1250 },
  { station: "Covering", efficiency: 92.1, target: 88, output: 1180 },
  { station: "Decoration", efficiency: 89.7, target: 85, output: 980 },
  { station: "Packing", efficiency: 96.2, target: 92, output: 1320 }
];

const kpiMetrics: Array<{ title: string; value: number | null | undefined; change: string; trend: "up" | "down"; icon: any; color: string; bg: string }> = [
  { title: "Monthly Revenue", value: undefined, change: "", trend: "up", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
  { title: "Total Orders", value: undefined, change: "", trend: "up", icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
  { title: "Average Order Value", value: undefined, change: "", trend: "down", icon: Target, color: "text-orange-600", bg: "bg-orange-50" },
  { title: "Quality Score", value: undefined, change: "", trend: "up", icon: Award, color: "text-purple-600", bg: "bg-purple-50" }
];

export function BannosAnalyticsPage() {
  const isEnabled = useAnalyticsEnabled();
  const revenueDataUse = isEnabled ? revenueData : [];
  const productPerformanceUse = isEnabled ? productPerformance : [];
  const qualityMetricsUse = isEnabled ? qualityMetrics : [];
  const productionEfficiencyUse = isEnabled ? productionEfficiency : [];
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-100">
            <Cake className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-medium text-foreground">Bannos Analytics</h1>
            <p className="text-muted-foreground">Comprehensive performance insights for cake & dessert operations</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
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
                <AnalyticsKPI
                  title={metric.title}
                  rawValue={metric.value}
                  unit={
                    /Productivity|Attendance|Quality|Training/i.test(metric.title) ? "percent" :
                    /Revenue|Sales|\$|Amount/i.test(metric.title) ? "currency" :
                    /Total|Staff|Orders|Hours|Count/i.test(metric.title) ? "count" :
                    "raw"
                  }
                />
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Revenue & Orders</TabsTrigger>
          <TabsTrigger value="products">Product Performance</TabsTrigger>
          <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          <TabsTrigger value="efficiency">Production Efficiency</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer hasData={revenueDataUse.length > 0}>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueDataUse}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                      <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Orders Volume */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Orders Volume
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer hasData={revenueDataUse.length > 0}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueDataUse}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
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
                <ChartContainer hasData={productPerformanceUse.length > 0}>
                  <ResponsiveContainer width="100%" height={300}>
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
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Product Revenue */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle>Revenue by Product</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer hasData={productPerformanceUse.length > 0}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productPerformanceUse} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={120} />
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
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
                  <Award className="h-5 w-5 text-blue-600" />
                  Quality Score Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer hasData={qualityMetricsUse.length > 0}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={qualityMetricsUse}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[90, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{fill: '#3b82f6', strokeWidth: 2, r: 4}} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Defects & Rework */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
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
                <Target className="h-5 w-5 text-blue-600" />
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
                        className="bg-blue-600 h-3 rounded-full transition-all duration-500 relative"
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
      </Tabs>
    </div>
  );
}