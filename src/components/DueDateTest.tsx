// DueDateTest.tsx
// Test component for due date calculations

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { 
  calculateDueDate, 
  getNextAvailableDates, 
  isDateAvailable, 
  formatDueDate,
  type DueDateSettings 
} from '../lib/due-date-utils';
import { getDueDateSettings } from '../lib/rpc-client';

export function DueDateTest() {
  const store = 'bannos' as const;
  const [settings, setSettings] = useState<DueDateSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [testDate, setTestDate] = useState(new Date());
  const [nextDates, setNextDates] = useState<Date[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      calculateNextDates();
    }
  }, [settings, testDate]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const dueDateSettings = await getDueDateSettings(store);
      setSettings(dueDateSettings);
    } catch (error) {
      console.error('Error loading due date settings:', error);
      // Fallback to default settings
      setSettings({
        defaultDue: '+1 day',
        allowedDays: [true, true, true, true, true, true, false], // Mon-Sat
        blackoutDates: ['2024-12-25', '2024-01-01']
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateNextDates = () => {
    if (!settings) return;
    
    const next7 = getNextAvailableDates(settings, 7, testDate);
    
    setNextDates(next7);
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Due Date Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Due Date Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load settings</p>
        </CardContent>
      </Card>
    );
  }

  const calculatedDueDate = calculateDueDate(settings, testDate);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Due Date Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Settings */}
          <div>
            <h4 className="font-medium mb-2">Current Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Default Due:</span>
                <Badge variant="outline" className="ml-2">{settings.defaultDue}</Badge>
              </div>
              <div>
                <span className="font-medium">Allowed Days:</span>
                <div className="flex gap-1 mt-1">
                  {settings.allowedDays.map((allowed, index) => (
                    <Badge 
                      key={index} 
                      variant={allowed ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {dayNames[index].slice(0, 3)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-medium">Blackout Dates:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {settings.blackoutDates.map((date) => (
                    <Badge key={date} variant="destructive" className="text-xs">
                      {date}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Test Date Input */}
          <div>
            <h4 className="font-medium mb-2">Test Date</h4>
            <input
              type="date"
              value={testDate.toISOString().split('T')[0]}
              onChange={(e) => setTestDate(new Date(e.target.value))}
              className="px-3 py-2 border rounded-md"
            />
          </div>

          {/* Calculated Due Date */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Calculated Due Date
            </h4>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-lg font-medium text-blue-900">
                {formatDueDate(calculatedDueDate)}
              </p>
              <p className="text-sm text-blue-700">
                {calculatedDueDate.toISOString().split('T')[0]}
              </p>
            </div>
          </div>

          {/* Next 7 Available Dates */}
          <div>
            <h4 className="font-medium mb-2">Next 7 Available Dates</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {nextDates.map((date, index) => (
                <div 
                  key={index}
                  className={`p-2 rounded text-sm ${
                    date.getTime() === calculatedDueDate.getTime() 
                      ? 'bg-blue-100 border-2 border-blue-300' 
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="font-medium">{formatDueDate(date)}</div>
                  <div className="text-xs text-gray-600">
                    {date.toISOString().split('T')[0]}
                  </div>
                  {date.getTime() === calculatedDueDate.getTime() && (
                    <Badge variant="default" className="text-xs mt-1">Selected</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Date Availability Checker */}
          <div>
            <h4 className="font-medium mb-2">Date Availability Checker</h4>
            <div className="space-y-2">
              {nextDates.slice(0, 3).map((date, index) => {
                const available = isDateAvailable(date, settings);
                return (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>{formatDueDate(date)}</span>
                    <Badge variant={available ? "default" : "destructive"}>
                      {available ? "Available" : "Not Available"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
