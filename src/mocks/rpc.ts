cat > src/mocks/mock-data.ts <<'TS'
export interface MockOrder {
  id: string; // e.g., "bannos-12345"
  stage: "Filling" | "Covering" | "Decorating" | "Packing" | "Complete";
  assignee_id: string | null;
  product_title: string;
  due_date: string;     // "2025-09-20" (date-only)
  priority: "High" | "Medium" | "Low";
  storage: string;      // e.g., "Fridge-1"
  // operational timestamps (optional in mocks)
  filling_start_ts?: string | null;
  filling_complete_ts?: string | null;
  covering_complete_ts?: string | null;
  decorating_complete_ts?: string | null;
  packing_start_ts?: string | null;
  packing_complete_ts?: string | null;
}

export const MOCK_QUEUE: MockOrder[] = [
  {
    id: "bannos-10001",
    stage: "Filling",
    assignee_id: null,
    product_title: "Chocolate Cake 8\"",
    due_date: "2025-09-20",
    priority: "High",
    storage: "Fridge-1",
    filling_start_ts: null
  },
  {
    id: "flourlane-10002",
    stage: "Covering",
    assignee_id: "staff-123",
    product_title: "Vanilla Cake 6\"",
    due_date: "2025-09-21",
    priority: "Medium",
    storage: "Shelf-A",
    filling_start_ts: "2025-09-16T07:30:00Z",
    filling_complete_ts: "2025-09-16T08:00:00Z"
  }
];
TS
