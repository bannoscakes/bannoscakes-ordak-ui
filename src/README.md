# SaaS Manufacturing Webapp - Modern Redesign

A comprehensive manufacturing management system with a modern, card-based interface supporting dual-store operations (Bannos and Flourlane) with complete staff management, inventory tracking, and production monitoring.

## 🏪 Store Architecture

### Dual-Store System

- **Bannos** (Cake/Dessert Store) - Blue theme
- **Flourlane** (Cake Shop) - Pink theme

### Shared Resources

- Staff list and management
- Inventory system
- Equipment status

### Separate Data

- Production metrics
- Order queues
- Analytics dashboards
- Store-specific operations

## 🎨 Design System

### Modern Interface Features

- Card-based layout design
- Responsive grid system
- Updated color scheme and typography
- Enhanced visual hierarchy
- Modern icons and progress indicators
- Improved navigation structure

### Brand Colors

- **Bannos**: Blue theme throughout all components
- **Flourlane**: Pink theme throughout all components

## 📁 Project Structure

```
├── App.tsx                          # Main application entry point
├── components/
│   ├── messaging/                   # Messaging System
│   │   ├── ChatWindow.tsx
│   │   ├── ConversationList.tsx
│   │   ├── MessagesPage.tsx
│   │   └── NewConversationModal.tsx
│   ├── inventory/                   # Inventory Management
│   │   ├── AccessoryKeywords.tsx
│   │   ├── BOMsInventory.tsx
│   │   ├── ComponentsInventory.tsx
│   │   ├── ProductRequirements.tsx
│   │   ├── ToolsInventory.tsx
│   │   └── TransactionsInventory.tsx
│   ├── ui/                          # Shadcn/UI Components
│   ├── Dashboard.tsx                # Main admin dashboard
│   ├── StaffWorkspacePage.tsx       # Staff interface
│   ├── SupervisorWorkspacePage.tsx  # Supervisor interface
│   └── [Store]Analytics/Production/Monitor Pages
├── styles/
│   └── globals.css                  # Tailwind V4 global styles
└── guidelines/
    └── Guidelines.md                # Development guidelines
```

## 🚀 Core Features

### 1. Admin Dashboard

- **Analytics Dashboards** - Separate for Bannos and Flourlane
- **Production Pages** - Real-time production monitoring
- **Monitor Pages** - Equipment and status tracking
- **Staff Management** - Comprehensive staff oversight
- **Inventory System** - 6 specialized subpages
- **Settings & Configuration**

### 2. Staff Workspace

- **Personal Dashboard** - Task and schedule management
- **Messages Tab** - Integrated messaging system
- **Production Queue Access** - View assigned tasks
- **Time Tracking** - Clock in/out functionality

### 3. Supervisor Workspace

- **Team Management** - Staff oversight and assignment
- **Production Control** - Queue management and priorities
- **Analytics Access** - Performance metrics and reporting
- **Direct Navigation** - Quick access to store-specific queues

### 4. Messaging System

- **Real-time Communication** - Staff-to-staff messaging
- **Broadcast Messages** - Company-wide announcements
- **Conversation Management** - Organized chat threads
- **Send Message Tile** - Quick access from Admin Dashboard

### 5. Inventory Management

- **Components Inventory** - Raw materials tracking
- **Tools Inventory** - Equipment and tool management
- **BOMs (Bill of Materials)** - Recipe and component lists
- **Product Requirements** - Specification management
- **Transactions** - Inventory movement tracking
- **Accessory Keywords** - Search and categorization

### 6. Staff & Payroll

- **Time Tracking** - Clock in/out with timestamps
- **Payroll Management** - Hours and wage calculation
- **Staff Analytics** - Performance metrics
- **Schedule Management** - Shift planning and assignments

## 🔐 Authentication System

### Multi-Level Access

- **Admin Dashboard** - Full system access
- **Staff Sign-in** - Email + PIN authentication
- **Supervisor Sign-in** - Email + PIN with elevated permissions

### Workspace Routing

- `/workspace/staff` - Staff interface
- `/workspace/supervisor` - Supervisor interface
- `/` - Admin dashboard (default)

## 🛠️ Technical Stack

### Frontend Framework

- **React** with TypeScript
- **Tailwind CSS V4** for styling
- **Vite** for development and building

### UI Components

- **Shadcn/UI** component library
- **Lucide React** for icons
- **Recharts** for analytics visualizations

### State Management

- React hooks for local state
- URL-based routing for navigation
- Session management for user authentication

### Database & Type Generation

- **Supabase** for backend database and authentication
- **Generated TypeScript types** from database schema

#### Regenerating Types

After any database migration, regenerate TypeScript types to keep the codebase in sync:

```bash
npm run gen:types
```

This generates `src/types/supabase.ts` from the live database schema, ensuring type safety for:
- RPC function parameters and return types
- Table row types for CRUD operations
- Enum types matching database constraints

**When to regenerate:**
- After applying new migrations (`supabase db push` or `supabase migration up`)
- After modifying tables, columns, or RPC functions
- When you see type errors related to database operations

## 📱 Responsive Design

- **Mobile-first approach**
- **Tablet optimization**
- **Desktop-enhanced experience**
- **Touch-friendly interfaces**

## 🎯 Key Differentiators

1. **Dual-Store Architecture** - Seamless management of two separate businesses
2. **Modern Card-Based UI** - Contemporary design with improved UX
3. **Comprehensive Messaging** - Built-in communication system
4. **Advanced Inventory** - Six specialized inventory management pages
5. **Role-Based Access** - Three distinct user interfaces
6. **Real-Time Production** - Live monitoring and queue management

## 🔄 Development Status

This is a **UI/UX redesign project** focused on:

- ✅ Modern interface implementation
- ✅ Complete feature set recreation
- ✅ Multi-store architecture
- ✅ Messaging system integration
- ⏳ Data integration (planned for Lovable)

## 📋 Next Steps

1. **Data Integration** - Connect to real backend services
2. **Real-Time Updates** - WebSocket implementation
3. **Advanced Analytics** - Enhanced reporting features
4. **Mobile App** - Native mobile companion
5. **API Development** - Backend service creation

## 🤝 Contributing

This project serves as the foundation for a modern manufacturing management system. The current implementation focuses on UI/UX with mock data, preparing for full backend integration.

---

**Note**: This is a comprehensive redesign maintaining all core functionality while implementing a completely modern interface. All data shown is mock data for demonstration purposes.