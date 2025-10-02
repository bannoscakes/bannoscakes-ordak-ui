import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Target,
  Calendar,
  Award,
  AlertCircle,
  Star,
  CheckCircle,
  UserCheck,
  Activity
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, RadialBarChart, RadialBar } from "recharts";
import { getStaffList } from "../lib/rpc-client";
import { toast } from "sonner";

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

const departmentPerformance = [
  { department: "Bannos Production", members: 8, efficiency: 94.5, satisfaction: 87, color: "#3b82f6" },
  { department: "Flourlane Production", members: 6, efficiency: 96.2, satisfaction: 91, color: "#ec4899" },
  { department: "Quality Control", members: 3, efficiency: 98.1, satisfaction: 94, color: "#10b981" },
  { department: "Packaging", members: 4, efficiency: 92.7, satisfaction: 85, color: "#f59e0b" },
  { department: "Maintenance", members: 2, efficiency: 89.3, satisfaction: 82, color: "#8b5cf6" }
];

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

const skillsDistribution = [
  { skill: "Baking Fundamentals", proficient: 18, learning: 4, expert: 1, color: "#3b82f6" },
  { skill: "Cake Decoration", proficient: 12, learning: 8, expert: 3, color: "#ec4899" },
  { skill: "Bread Making", proficient: 14, learning: 6, expert: 3, color: "#10b981" },
  { skill: "Quality Control", proficient: 8, learning: 12, expert: 3, color: "#f59e0b" },
  { skill: "Equipment Operation", proficient: 16, learning: 6, expert: 1, color: "#8b5cf6" }
];

const trainingProgress = [
  { name: "Food Safety Certification", completed: 20, total: 23, progress: 87 },
  { name: "Advanced Decorating", completed: 8, total: 15, progress: 53 },
  { name: "Equipment Maintenance", completed: 12, total: 18, progress: 67 },
  { name: "Customer Service", completed: 19, total: 23, progress: 83 },
  { name: "Leadership Development", completed: 5, total: 8, progress: 63 }
];

const shiftDistribution = [
  { name: "Morning (6AM-2PM)", value: 40, employees: 12, color: "#3b82f6" },
  { name: "Afternoon (2PM-10PM)", value: 35, employees: 8, color: "#10b981" },
  { name: "Night (10PM-6AM)", value: 15, employees: 3, color: "#f59e0b" },
  { name: "Weekend", value: 10, employees: 6, color: "#8b5cf6" }
];

const kpiMetrics = [
  {
    title: "Total Staff",
    value: "23",
    change: "+2",
    trend: "up",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50"
  },
  {
    title: "Avg Productivity",
    value: "97.1%",
    change: "+2.2%", 
    trend: "up",
    icon: Target,
    color: "text-green-600",
    bg: "bg-green-50"
  },
  {
    title: "Attendance Rate",
    value: "96.8%",
    change: "+1.1%",
    trend: "up",
    icon: CheckCircle,
    color: "text-purple-600",
    bg: "bg-purple-50"
  },
  {
    title: "Training Complete",
    value: "74%",
    change: "+12%",
    trend: "up", 
    icon: Award,
    color: "text-orange-600",
    bg: "bg-orange-50"
  }
];

export function StaffAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [totalStaff, setTotalStaff] = useState(0);
  const [activeStaff, setActiveStaff] = useState(0);
  
  // Fetch real staff data
  useEffect(() => {
    async function fetchStaffStats() {
      try {
        const staffList = await getStaffList(null, true); // Get all active staff
        setTotalStaff(staffList.length);
        setActiveStaff(staffList.filter(s => s.is_active).length);
      } catch (error) {
        console.error('Error fetching staff stats:', error);
        toast.error('Failed to load staff analytics');
      } finally {
        setLoading(false);
      }
    }
    fetchStaffStats();
  }, []);
  
  // Update KPI metrics with real data
  const kpiMetricsWithRealData = [
    {
      title: "Total Staff",
      value: loading ? "..." : totalStaff.toString(),
      change: "+2",
      trend: "up",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    ...kpiMetrics.slice(1) // Keep other mock metrics for now
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-100">
            <Users className="h-8 w-8 text-purple-600" />
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiMetricsWithRealData.map((metric, index) => (
          <Card key={index} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="font-medium text-muted-foreground">{metric.title}</p>
                <div className="space-y-1">
                  <p className="text-3xl font-semibold text-foreground">{metric.value}</p>
                  <div className="flex items-center gap-1">
                    {metric.trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                      {metric.change}
                    </span>
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
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="skills">Skills & Training</TabsTrigger>
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
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={staffProductivity}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[85, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="productivity" stroke="#8b5cf6" strokeWidth={3} dot={{fill: '#8b5cf6', strokeWidth: 2, r: 4}} />
                  </LineChart>
                </ResponsiveContainer>
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
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={staffProductivity}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#8b5cf6" name="Regular Hours" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="overtime" fill="#f59e0b" name="Overtime" radius={[2, 2, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
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
                {topPerformers.map((performer, index) => (
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
                {departmentPerformance.map((dept, index) => (
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
                          <p className="font-semibold text-foreground">{dept.efficiency}%</p>
                          <p className="text-xs text-muted-foreground">Efficiency</p>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{dept.satisfaction}%</p>
                          <p className="text-xs text-muted-foreground">Satisfaction</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Efficiency</span>
                          <span>{dept.efficiency}%</span>
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
                          <span>{dept.satisfaction}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ width: `${dept.satisfaction}%`, backgroundColor: dept.color }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attendanceData}>
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
                    <p className="text-4xl font-semibold text-green-600">96.8%</p>
                    <p className="text-muted-foreground">Overall Attendance Rate</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-2">
                      <p className="text-2xl font-semibold text-green-600">88</p>
                      <p className="text-sm text-muted-foreground">Present</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-2xl font-semibold text-red-600">4</p>
                      <p className="text-sm text-muted-foreground">Absent</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-2xl font-semibold text-orange-600">2</p>
                      <p className="text-sm text-muted-foreground">Late</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Skills Distribution */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle>Skills Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-4">
                  {skillsDistribution.map((skill, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium text-foreground">{skill.skill}</span>
                        <span className="text-sm text-muted-foreground">
                          {skill.expert + skill.proficient + skill.learning} staff
                        </span>
                      </div>
                      <div className="flex w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500 transition-all duration-500"
                          style={{ width: `${(skill.expert / (skill.expert + skill.proficient + skill.learning)) * 100}%` }}
                        />
                        <div 
                          className="bg-blue-500 transition-all duration-500"
                          style={{ width: `${(skill.proficient / (skill.expert + skill.proficient + skill.learning)) * 100}%` }}
                        />
                        <div 
                          className="bg-orange-500 transition-all duration-500"
                          style={{ width: `${(skill.learning / (skill.expert + skill.proficient + skill.learning)) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Expert: {skill.expert}</span>
                        <span>Proficient: {skill.proficient}</span>
                        <span>Learning: {skill.learning}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Training Progress */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle>Training Progress</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-6">
                  {trainingProgress.map((training, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium text-foreground">{training.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {training.completed}/{training.total}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${training.progress}%` }}
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-foreground">{training.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scheduling" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shift Distribution */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle>Shift Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={shiftDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({name, value}) => `${name}: ${value}%`}
                    >
                      {shiftDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Shift Details */}
            <Card className="p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle>Shift Details</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-4">
                  {shiftDistribution.map((shift, index) => (
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