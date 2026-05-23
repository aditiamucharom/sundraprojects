# Technical Specification: Simple and Lightweight Activity Log

## 1. Executive Summary
This document outlines the design and integration of a **Simple and Lightweight Activity Log** feature. The activity log tracks key changes (creations, status moves, details updates, and deletions of tasks/projects) within the active workspace and presents them to users in a clean, chronological timeline format.

To maintain visual excellence, keep navigation simple, and ensure the app remains lightweight, this feature will be integrated directly inside the **Reports & Analytics** dashboard (`/dashboard/reports`) using a modern, segmented tab controller.

---

## 2. Requirements

### Functional Requirements
1. **Activity Log Timeline**: Display a list of workspace actions in reverse chronological order (newest first).
2. **Dynamic Log Messaging**: Parse standard log objects and render human-readable messages (e.g. *"Jane Doe moved task 'Verify checklist' to In Progress"*).
3. **Visual Indicators**: Bullet points or badges colored based on the nature of the action:
   - **Green** for Creations (tasks, projects/lists, workspaces)
   - **Blue** for Status/Progress transitions (e.g., Todo to In Progress)
   - **Orange/Yellow** for general updates/edits
   - **Red** for deletions (tasks, projects/lists)
4. **Lightweight Controls**:
   - Limit default retrieved activities to the latest **50 entries** to avoid heavy DOM payload and fast loading.
   - Search input filter: Allow users to filter activity logs by keyword (task title, list name, user name, or action name).
5. **Print Layout Exclusion**: The interactive tab switcher and activity timeline must be hidden during print compiling to keep the printed PDF focused purely on analytics.

### Technical & Storage Requirements
- Utilize the existing `dataService.getActivityLogs(workspaceId)` method to fetch logs from the local storage `KEYS.LOGS` key or Supabase.
- Parallelize fetching with existing tasks/projects data loading using `Promise.all` inside `fetchData` on the Reports page.

---

## 3. UI/UX Design & Layout

### Tab Interface
A segmented control at the top of `/dashboard/reports` page to switch between:
1. **Analytics & Exports** (default view, displaying KPI cards, distribution charts, and detailed task list).
2. **Activity Log** (displaying the timeline log view).

### Timeline Element
Each activity row will follow a beautiful visual hierarchy:
- **Left Column**: Colored timeline dot and vertical line connector.
- **Middle Column**:
  - User avatar badge (initials or profile picture) for high-fidelity visualization.
  - Formatted text: **User Name** + *performed action* on **Target Item** (in bold).
  - List context badge if applicable.
- **Right Column**: Relative time signature (e.g. *"2 minutes ago"*, *"3 hours ago"*, or *"Yesterday"*).

---

## 4. File Layout [MODIFY]

```
src/
└── app/
    └── dashboard/
        └── reports/
            └── page.tsx      [MODIFY] - Integrate activeTab state, fetch activity logs, and render the timeline UI.
```

---

## 5. Verification Plan

### Automated Verification
- Run `npm run build` to verify there are no TypeScript, linting, or route generation errors.

### Manual Verification
1. Open `/dashboard/reports`.
2. Observe the new "Analytics & Exports" vs "Activity Log" tab switcher.
3. Perform a few actions:
   - Create a new task.
   - Move a task's status.
   - Delete a project list.
4. Return to `/dashboard/reports`, switch to the **Activity Log** tab, and verify:
   - The actions are instantly listed at the top of the timeline.
   - Avatars are shown correctly.
   - Text descriptions match the actions performed.
   - Hover and timeline transitions feel fluid and premium.
5. Search by task name in the log filter to verify search functionality.
