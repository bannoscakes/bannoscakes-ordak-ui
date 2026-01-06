import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Users,
  Clock,
  Target,
  Calendar,
  Star,
  CheckCircle,
  UserCheck,
  Activity
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getStaffAttendanceRate, getStaffAvgProductivity, getDepartmentPerformance, getStaffStagePerformance, type StaffStagePerformance } from "../lib/rpc-client";
import { toast } from "sonner";
import ChartContainer from "@/components/analytics/ChartContainer";
import { useAnalyticsEnabled } from "@/hooks/useAnalyticsEnabled";
import { useStaffList } from "@/hooks/useSettingsQueries";
import KpiValue from "@/components/analytics/KpiValue";
import { toNumberOrNull } from "@/lib/metrics";

// =============================================================================
// MOCK DATA - TODO: Replace with real data from database when features are implemented
// - Productivity tracking
// - Attendance system
// - Skills/Training management
// - Shift scheduling
// =============================================================================

const staffProductivity = [
  { month: "Jan", productivity: 92.3, hours: 1580, overtime: 120 },
  { month: "Feb", productivity: 94.1, hours: 1620, overtime: 95 },
  { month: "Mar", productivity: 91.8, hours: 1650, overtime: 140 },
  { month: "Apr", productivity: 95.2, hours: 1590, overtime: 85 },
  { month: "May", productivity: 93.7, hours: 1680, overtime: 110 },
  { month: "Jun", productivity: 96.4, hours: 1610, overtime: 75 },
  { month: "Jul", productivity: 94.9, hours: 1720, overtime: 130 },
  { month: "Aug", productivity: 97.1, hours: 1650, overtime: 90 }
];

// departmentPerformance removed - now using real data from getDepartmentPerformance RPC

// TODO: Replace with real staff from database and actual performance metrics
const topPerformers = [
  { 
    name: "Sarah Johnson", 
    role: "Head Baker - Bannos", 
    productivity: 98.5, 
    quality: 97.2, 
    attendance: 100,
    initials: "SJ",
    store: "bannos"
  },
  { 
    name: "Michael Chen", 
    role: "Master Baker - Flourlane", 
    productivity: 97.8, 
    quality: 98.1, 
    attendance: 98,
    initials: "MC",
    store: "flourlane"
  },
  { 
    name: "Emily Rodriguez", 
    role: "Decorator - Bannos", 
    productivity: 96.4, 
    quality: 95.8, 
    attendance: 100,
    initials: "ER",
    store: "bannos"
  },
  { 
    name: "David Wilson", 
    role: "Production Lead - Flourlane", 
    productivity: 95.9, 
    quality: 96.5, 
    attendance: 97,
    initials: "DW",
    store: "flourlane"
  },
  { 
    name: "Lisa Thompson", 
    role: "Quality Inspector", 
    productivity: 97.2, 
    quality: 99.1, 
    attendance: 100,
    initials: "LT",
    store: "both"
  }
];

const attendanceData = [
  { week: "Week 1", present: 22, absent: 1, late: 0 },
  { week: "Week 2", present: 21, absent: 2, late: 1 },
  { week: "Week 3", present: 23, absent: 0, late: 1 },
  { week: "Week 4", present: 22, absent: 1, late: 0 }
];

// Skills & Training mock data removed - replaced with Staff Performance using real data

const shiftDistribution = [
  { name: "Morning (6AM-2PM)", value: 40, employees: 12, color: "#3b82f6" },
  { name: "Afternoon (2PM-10PM)", value: 35, employees: 8, color: "#10b981" },
  { name: "Night (10PM-6AM)", value: 15, employees: 3, color: "#f59e0b" },
  { name: "Weekend", value: 10, employees: 6, color: "#8b5cf6" }
];

// Mock metrics removed - now using real data from RPCs

export function StaffAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [avgProductivity, setAvgProductivity] = useState<number | null>(null);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [departmentPerformanceData, setDepartmentPerformanceData] = useState<any[]>([]);
  const [staffStageData, setStaffStageData] = useState<StaffStagePerformance[]>([]);
  const isEnabled = useAnalyticsEnabled();

  // Fetch staff list using React Query
  const { data: staffData = [], isLoading: isStaffLoading, isError: isStaffError } = useStaffList();
  const totalStaff = isStaffError ? null : staffData.length;

  // Fetch other analytics data
  useEffect(() => {
    async function fetchStaffStats() {
      try {
        // Fetch all metrics in parallel
        const [productivityData, attendanceData, deptData, stageData] = await Promise.all([
          getStaffAvgProductivity(30), // Last 30 days
          getStaffAttendanceRate(30), // Last 30 days
          getDepartmentPerformance(30), // Last 30 days
          getStaffStagePerformance(30) // Last 30 days
        ]);

        setAvgProductivity(productivityData?.avg_productivity || null);
        setAttendanceRate(attendanceData?.attendance_rate || null);
        setDepartmentPerformanceData(deptData || []);
        setStaffStageData(stageData || []);
      } catch (error) {
        console.error('Error fetching staff stats:', error);
        toast.error('Failed to load staff analytics');
      } finally {
        setLoading(false);
      }
    }
    fetchStaffStats();
  }, []);
  
  // Build KPI metrics with real data
  const kpiMetricsWithRealData = [
    {
      title: "Total Staff",
      value: isStaffLoading ? "..." : isStaffError ? "Error" : totalStaff?.toString() ?? "0",
      change: "",
      trend: "neutral" as const,
      icon: Users,
      color: isStaffError ? "text-destructive" : "text-primary",
      bg: isStaffError ? "bg-destructive/10" : "bg-primary/10"
    },
    {
      title: "Avg Productivity",
      value: loading ? "..." : (avgProductivity !== null ? `${avgProductivity.toFixed(1)}%` : "N/A"),
      change: "",
      trend: "neutral" as const,
      icon: Target,
      color: "text-success",
      bg: "bg-success/10"
    },
    {
      title: "Attendance Rate",
      value: loading ? "..." : (attendanceRate !== null ? `${attendanceRate.toFixed(1)}%` : "N/A"),
      change: "",
      trend: "neutral" as const,
      icon: CheckCircle,
      color: "text-purple-600",
      bg: "bg-purple-50"
    }
    // Training Complete removed - not useful per user request
  ];

  // Gate all mock datasets behind feature flag
  const staffProductivityData = isEnabled ? staffProductivity : [];
  const attendanceDataUse = isEnabled ? attendanceData : [];
  // departmentPerformanceData now comes from RPC (real data)
  // staffStageData now comes from RPC (real data)
  const shiftDistributionUse = isEnabled ? shiftDistribution : [];
  const topPerformersData = isEnabled ? topPerformers : [];
  const metrics = kpiMetricsWithRealData;

  // Compute top performers per stage from real data
  const stageTopPerformers = {
    filling: staffStageData.reduce((max, s) => s.filling_count > (max?.filling_count || 0) ? s : max, null as StaffStagePerformance | null),
    covering: staffStageData.reduce((max, s) => s.covering_count > (max?.covering_count || 0) ? s : max, null as StaffStagePerformance | null),
    decorating: staffStageData.reduce((max, s) => s.decorating_count > (max?.decorating_count || 0) ? s : max, null as StaffStagePerformance | null),
    packing: staffStageData.reduce((max, s) => s.packing_count > (max?.packing_count || 0) ? s : max, null as StaffStagePerformance | null),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/40">
            <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-medium text-foreground">Staff Analytics</h1>
            <p className="text-muted-foreground">Comprehensive workforce performance and management insights</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const raw = metric?.value;
          const num = toNumberOrNull(raw);
          const isEnabled = useAnalyticsEnabled();
          const isEmpty = num == null;

          const unit =
            /Productivity|Attendance|Quality|Training/i.test(metric.title) ? "percent" :
            /Revenue|\$|Amount/i.test(metric.title) ? "currency" :
            /Total|Staff|Orders|Hours|Count/i.test(metric.title) ? "count" :
            "raw";

          return (
            <Card key={metric.title}>
              <div className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                  <p className="text-3xl font-semibold text-foreground">
                    <KpiValue value={num} unit={unit as any} />
                  </p>
                  {isEmpty && !isEnabled && (
                    <p className="text-xs text-muted-foreground">No data yet</p>
                  )}
                </div>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="staff-stages">Staff Performance</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Productivity Trend */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  Productivity Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer hasData={staffProductivityData.length > 0}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={staffProductivityData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[85, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="productivity" stroke="#8b5cf6" strokeWidth={3} dot={{fill: '#8b5cf6', strokeWidth: 2, r: 4}} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Working Hours */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  Working Hours & Overtime
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer hasData={staffProductivityData.length > 0}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={staffProductivityData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="hours" fill="#8b5cf6" name="Regular Hours" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="overtime" fill="#f59e0b" name="Overtime" radius={[2, 2, 0, 0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <Card className="p-6">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-purple-600" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-4">
                {topPerformersData.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No data to display</div>
                ) : topPerformersData.map((performer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={`${
                          performer.store === 'bannos' ? 'bg-blue-100 text-blue-600' :
                          performer.store === 'flourlane' ? 'bg-pink-100 text-pink-600' :
                          'bg-purple-100 text-purple-600'
                        }`}>
                          {performer.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-foreground">{performer.name}</h4>
                        <p className="text-sm text-muted-foreground">{performer.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-6 text-center">
                      <div>
                        <p className="font-semibold text-foreground">{performer.productivity}%</p>
                        <p className="text-xs text-muted-foreground">Productivity</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{performer.quality}%</p>
                        <p className="text-xs text-muted-foreground">Quality</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{performer.attendance}%</p>
                        <p className="text-xs text-muted-foreground">Attendance</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <Card className="p-6">
            <CardHeader className="p-0 pb-6">
              <CardTitle>Department Performance Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-6">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading department data...</div>
                ) : departmentPerformanceData.length > 0 ? (
                  departmentPerformanceData.map((dept, index) => (
                    <div key={index} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: dept.color }}></div>
                          <div>
                            <h4 className="font-medium text-foreground">{dept.department}</h4>
                            <p className="text-sm text-muted-foreground">{dept.members} team members</p>
                          </div>
                        </div>
                        <div className="flex gap-6 text-center">
                          <div>
                            <p className="font-semibold text-foreground">{dept.efficiency.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">Efficiency</p>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">N/A</p>
                            <p className="text-xs text-muted-foreground">Satisfaction</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Efficiency</span>
                            <span>{dept.efficiency.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-500"
                              style={{ width: `${dept.efficiency}%`, backgroundColor: dept.color }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Satisfaction</span>
                            <span>N/A</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-500 bg-muted"
                              style={{ width: '0%' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No department data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Attendance */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-purple-600" />
                  Weekly Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer hasData={attendanceDataUse.length > 0}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={attendanceDataUse}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="present" fill="#10b981" name="Present" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="late" fill="#f59e0b" name="Late" radius={[2, 2, 0, 0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Attendance Summary */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle>Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-6">
                  <div className="text-center">
                    {isEnabled ? (
                      <>
                        <p className="text-4xl font-semibold text-green-600">96.8%</p>
                        <p className="text-muted-foreground">Overall Attendance Rate</p>
                      </>
                    ) : (
                      <>
                        <p className="text-4xl font-semibold text-foreground">—</p>
                        <p className="text-sm text-muted-foreground">No data yet</p>
                      </>
                    )}
                  </div>
                  {isEnabled ? (
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="space-y-2">
                        <p className="text-2xl font-semibold text-success">88</p>
                        <p className="text-sm text-muted-foreground">Present</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-2xl font-semibold text-destructive">4</p>
                        <p className="text-sm text-muted-foreground">Absent</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-2xl font-semibold text-warning">2</p>
                        <p className="text-sm text-muted-foreground">Late</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="staff-stages" className="space-y-6">
          {/* Top Performers by Stage */}
          <Card className="p-6">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-purple-600" />
                Top Performers by Stage (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : staffStageData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No stage completion data available</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { stage: 'Filling', data: stageTopPerformers.filling, color: 'bg-blue-100 text-blue-600', count: stageTopPerformers.filling?.filling_count },
                    { stage: 'Covering', data: stageTopPerformers.covering, color: 'bg-green-100 text-green-600', count: stageTopPerformers.covering?.covering_count },
                    { stage: 'Decorating', data: stageTopPerformers.decorating, color: 'bg-pink-100 text-pink-600', count: stageTopPerformers.decorating?.decorating_count },
                    { stage: 'Packing', data: stageTopPerformers.packing, color: 'bg-orange-100 text-orange-600', count: stageTopPerformers.packing?.packing_count },
                  ].map(({ stage, data, color, count }) => (
                    <div key={stage} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-2 rounded-lg ${color}`}>
                          <Star className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-foreground">{stage}</span>
                      </div>
                      {data ? (
                        <div>
                          <p className="text-lg font-semibold text-foreground">{data.staff_name}</p>
                          <p className="text-2xl font-bold text-purple-600">{count}</p>
                          <p className="text-sm text-muted-foreground">orders completed</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No data</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Staff Stage Performance Table */}
          <Card className="p-6">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Orders Completed by Stage (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : staffStageData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No stage completion data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Staff Member</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Filling</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Covering</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Decorating</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Packing</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffStageData.map((staff, idx) => (
                        <tr key={staff.staff_id || idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-purple-100 text-purple-600 text-xs">
                                  {staff.staff_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-foreground">{staff.staff_name}</span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className={staff.filling_count > 0 ? 'font-semibold text-blue-600' : 'text-muted-foreground'}>
                              {staff.filling_count}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className={staff.covering_count > 0 ? 'font-semibold text-green-600' : 'text-muted-foreground'}>
                              {staff.covering_count}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className={staff.decorating_count > 0 ? 'font-semibold text-pink-600' : 'text-muted-foreground'}>
                              {staff.decorating_count}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className={staff.packing_count > 0 ? 'font-semibold text-orange-600' : 'text-muted-foreground'}>
                              {staff.packing_count}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className="font-bold text-purple-600">{staff.total_count}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduling" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shift Distribution */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle>Shift Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer hasData={shiftDistributionUse.length > 0}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={shiftDistributionUse}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({name, value}) => `${name}: ${value}%`}
                      >
                        {shiftDistributionUse.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Shift Details */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle>Shift Details</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-4">
                  {shiftDistributionUse.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data to display</div>
                  ) : shiftDistributionUse.map((shift, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: shift.color }}></div>
                        <div>
                          <h4 className="font-medium text-foreground">{shift.name}</h4>
                          <p className="text-sm text-muted-foreground">{shift.employees} employees</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{shift.value}%</p>
                        <p className="text-xs text-muted-foreground">Coverage</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}