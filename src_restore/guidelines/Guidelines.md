# SaaS Manufacturing Webapp - Development Guidelines

## Project Overview

This is a modern SaaS Manufacturing webapp supporting dual-store operations (Bannos and Flourlane) with comprehensive staff management, inventory tracking, and production monitoring. The project is currently in a clean state with all mock data removed, ready for backend integration.

## Architecture Guidelines

### Dual-Store System
- **Bannos** uses blue theme throughout all components  
- **Flourlane** uses pink theme throughout all components
- Shared resources: Staff list, inventory system, equipment status
- Separate data: Production metrics, order queues, analytics

### Data Integration Guidelines
- All components are structured to receive data via props or API calls
- Mock data has been removed and replaced with TODO comments indicating where real API integration should occur
- State management uses React hooks with clear separation between UI state and data state

### Component Structure
- Each major feature has dedicated components in organized folders
- Messaging system is fully implemented but requires backend data integration
- Inventory system has 6 specialized subpages ready for data connection
- Analytics components are structured for real-time data visualization

### Authentication & Authorization
- Multi-level access: Admin Dashboard, Staff Workspace, Supervisor Workspace
- Authentication placeholders are in place for real implementation
- Role-based UI rendering is implemented and ready for backend integration

## Design System Guidelines

### Typography
- Base font-size: 14px (defined in globals.css)
- Do not override font sizes, weights, or line-heights unless specifically requested
- Use semantic HTML elements (h1, h2, h3, p, label, button) for consistent typography

### Layout & Spacing
- Use flexbox and grid for responsive layouts
- Avoid absolute positioning unless necessary
- Maintain consistent spacing using Tailwind classes
- Card-based layout with modern visual hierarchy

### Color Theming
- Store-specific themes implemented via CSS custom properties
- Support for both light and dark modes
- Consistent use of semantic color tokens

### Component Guidelines
- Prefer Shadcn/UI components from `/components/ui`
- Custom components should follow the established patterns
- Maintain separation between data logic and presentation

## Backend Integration Readiness

### API Integration Points
- Authentication endpoints for staff/supervisor sign-in
- Real-time data fetching for production queues
- Messaging system API for conversations and messages  
- Inventory management CRUD operations
- Staff management and time tracking
- Analytics data for dashboard metrics

### Data Structures
- TypeScript interfaces are defined for all major data entities
- Components expect specific data shapes documented in interface definitions
- Error handling and loading states are implemented

### State Management
- Ready for integration with external state management (Redux, Zustand, etc.)
- Current React hooks can be easily replaced with global state solutions
- Clear separation between local UI state and server state

## Development Best Practices

### Code Organization
- Keep file sizes manageable with helper functions in separate files
- Refactor code as you develop to maintain clean architecture
- Follow established folder structure for new components

### Responsive Design
- Mobile-first approach with tablet and desktop optimizations
- Touch-friendly interfaces for production floor use
- Consistent breakpoint usage

### Performance Considerations
- Components are optimized for production use
- Ready for real-time updates via WebSocket integration
- Efficient re-rendering patterns with proper React optimizations

## Next Steps for Backend Integration

1. **Authentication Service**: Implement real user authentication and session management
2. **Real-time Data**: Connect to WebSocket services for live production updates  
3. **Database Integration**: Connect inventory, staff, and order management to database
4. **File Uploads**: Implement image and document upload functionality
5. **Notification System**: Add real-time notifications and alerts
6. **Analytics Backend**: Connect charts and metrics to real data sources

## Important Notes

- All mock data has been systematically removed
- Components are structured for easy backend integration
- TODO comments indicate specific integration points
- Maintain the established dual-store architecture during integration
- Preserve the modern card-based UI design during data integration