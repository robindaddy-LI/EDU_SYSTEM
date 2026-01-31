# Server Startup Walkthrough

I have successfully started the database, backend, and frontend servers for the EDU system.

## Changes Made

### 1. Database
- Started the PostgreSQL database using Docker Compose.
- Verified the container `edu_system_db` is running.

### 2. Backend Server
- Started the backend server using `npm run dev` in the `backend` directory.
- The server is running at [http://localhost:3000](http://localhost:3000).
- Verified the API response.

### 3. Frontend Server
- Started the Vite development server in the root directory.
- Since port 5173 was in use, the server shifted to [http://localhost:5174](http://localhost:5174).

### 4. Authentication Implementation
- **Backend API**: Connected `Login.tsx` to the `userService.login` API.
- **Test Accounts**: Seeded the database with the following accounts (密碼與帳號相同):
    - `admin` (系統管理員) - 可存取所有功能。
    - `teacher1` (班負責-幼兒班) - 僅可存取儀表板、學員管理、教員管理及班級紀錄簿。
    - `recorder1` (紀錄人員-幼年班) - 僅可存取班級紀錄簿及系統資訊。
- **Security**: Implemented role-based navigation filtering and removed the mock "Demo Mode" switcher.
- **Logout**: Added a dedicated "Logout" button to the sidebar for secure session termination.

### 5. Feature Implementation: Teacher Assignment & Class Logbook
- **Teacher Assignment**:
    - Implemented `TeacherAssignmentConfig.tsx` for managing yearly teacher allocations.
    - Added backend support for creating and viewing assignments.
    - Integrated with Sidebar and Teacher Management views.
- **Class Logbook Refactor**:
    - **Refactoring**: Split the monolithic `ClassLogbook.tsx` into `DashboardView`, `ListView`, and `DetailView`.
    - **Optimization**: Updated `TeacherAssignmentController` to support server-side filtering by `classId` to prevent over-fetching.
    - **Integration**: Updated `AddNewClassSession` to use the optimized API.

## Verification Results

- **Backend Health Check**: Confirmed "Education System API is running!" at port 3000.
- **Authentication**: Verified real API login with test accounts.
- **Authorization**: Confirmed Sidebar menu items change based on user roles.
- **Teacher Assignment**: Verified admin can assign teachers to classes.
- **Class Logbook**: Verified efficient loading of teacher lists when creating sessions.

> [!TIP]
> 您現在可以使用 **admin/admin**, **teacher1/teacher1**, 或 **recorder1/recorder1** 登入 [http://localhost:5174](http://localhost:5174) 進行測試。
