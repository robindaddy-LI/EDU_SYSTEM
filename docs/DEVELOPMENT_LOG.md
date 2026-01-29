# 石牌教會教育系統 - 開發紀錄

本文件記錄每次規劃 (Planning) 與實作 (Implementation) 的過程，供後續學習參考。

---

## 2026-01-25 開發紀錄

### 📋 Session 1: 專案現況分析

**目標**：了解專案整體架構與現有進度

**發現**：
- **前端** (`src/`)：React 19 + Vite + TypeScript
  - 頁面元件位於 `src/pages/` (17 個檔案)
  - 共用元件位於 `src/components/` (目前僅 Sidebar)
  - 資料來源為 `src/data/mockData.ts` (假資料)
- **後端** (`backend/`)：Express + Prisma + PostgreSQL
  - 資料模型定義於 `prisma/schema.prisma`
  - 僅 `ClassSessionController` 已實作

**問題識別**：
1. 前後端未串接 (前端仍用 Mock Data)
2. 後端 API 不完整 (僅 ClassSession)
3. 元件過大 (如 `ClassLogbook.tsx` 超過 500 行)

---

### 🔧 Session 2: 後端 API 補完

**目標**：建立完整的 RESTful API

**實作步驟**：

#### Step 1: 建立 StudentController
```
檔案: backend/src/controllers/StudentController.ts
功能: CRUD + 搜尋過濾
端點: GET/POST/PUT/DELETE /api/v1/students
```

#### Step 2: 建立 TeacherController
```
檔案: backend/src/controllers/TeacherController.ts
功能: CRUD + 班級指派
端點: GET/POST/PUT/DELETE /api/v1/teachers
       POST /api/v1/teachers/:id/assign
```

#### Step 3: 建立 ClassController
```
檔案: backend/src/controllers/ClassController.ts
功能: CRUD + 關聯查詢 (學員/教員)
端點: GET/POST/PUT/DELETE /api/v1/classes
```

#### Step 4: 建立 UserController
```
檔案: backend/src/controllers/UserController.ts
功能: CRUD + 簡易登入
端點: GET/POST/PUT/DELETE /api/v1/users
       POST /api/v1/users/login
```

#### Step 5: 註冊路由
```typescript
// backend/src/index.ts
app.use('/api/v1/sessions', classSessionsRouter);
app.use('/api/v1/students', studentsRouter);
app.use('/api/v1/teachers', teachersRouter);
app.use('/api/v1/classes', classesRouter);
app.use('/api/v1/users', usersRouter);
```

**學習重點**：
- RESTful API 設計原則 (資源導向的 URL)
- Prisma ORM 的 CRUD 操作
- Express Router 模組化
- 軟刪除 (Soft Delete) vs 硬刪除

---

### 🔧 Session 3: 前端 Service Layer 建立

**目標**：建立資料存取抽象層，為 API 串接做準備

**實作步驟**：

#### Step 1: 安裝 Axios
```bash
npm install axios
```

#### Step 2: 建立 API Client
```
檔案: src/services/api.ts
功能: Axios 實例 + 攔截器 (錯誤處理)
```

**程式碼重點**：
```typescript
// Request Interceptor - 可加入 Auth Token
apiClient.interceptors.request.use((config) => {
    // const token = localStorage.getItem('authToken');
    // config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Response Interceptor - 統一錯誤處理
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // 導向登入頁
        }
        return Promise.reject(error);
    }
);
```

#### Step 3: 建立各模組 Service
| 檔案 | 對應後端 |
|------|----------|
| `sessionService.ts` | `/api/v1/sessions` |
| `studentService.ts` | `/api/v1/students` |
| `teacherService.ts` | `/api/v1/teachers` |
| `classService.ts` | `/api/v1/classes` |
| `userService.ts` | `/api/v1/users` |

#### Step 4: 統一匯出
```typescript
// src/services/index.ts
export { default as studentService } from './studentService';
export { default as teacherService } from './teacherService';
// ...
```

**學習重點**：
- Axios Instance 與 Interceptors
- TypeScript Interface 定義 API 回傳型別
- 模組化設計 (每個資源一個 Service)
- Barrel Export (index.ts 統一匯出)

---

## 📌 待辦事項

- [x] 將前端元件改為使用 Service (StudentManagement, TeacherManagement, UserManagement)
- [ ] 將 ClassLogbook 改為使用 sessionService
- [ ] 實作真實登入驗證 (JWT)
- [ ] 密碼加密 (bcrypt)
- [ ] 元件重構 (拆分過大的檔案)

---

### 🔧 Session 4: 前端 API 串接

**目標**：將前端元件從 Mock Data 改為使用真實 API

**已完成元件**：

#### StudentManagement.tsx
- 移除 `mockStudents`, `mockClasses` 引用
- 改用 `studentService.getAll()` 和 `classService.getAll()`
- 新增 `isLoading`, `error` 狀態管理
- 新增 Loading Spinner 和錯誤提示 UI
- 使用 `useCallback` + `setTimeout` 實作搜尋防抖 (Debounce)

#### TeacherManagement.tsx
- 同上，改用 `teacherService` 和 `classService`
- 新增載入狀態和錯誤處理

#### UserManagement.tsx
- 改用 `userService` 進行 CRUD 操作
- 新增 `isSaving` 狀態，防止重複提交
- 刪除按鈕改為「停用」(Soft Delete)
- 班級下拉選單改為動態載入

#### ClassLogbook.tsx (最複雜，572 行)
- 包含 3 個子元件：`ClassLogbookDashboardView`, `ClassLogbookListView`, `ClassSessionDetailView`
- 改用 `sessionService` 和 `classService`
- 出席紀錄編輯改用 `sessionService.updateAttendance()` 非同步儲存
- 各子元件都新增載入狀態和錯誤處理

**技術重點**：
```typescript
// 防抖搜尋實作
const fetchData = useCallback(async () => { ... }, [filters]);

useEffect(() => {
    const timeoutId = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(timeoutId);
}, [fetchData]);
```

**型別映射問題**：
- 後端 `Class.name` vs 前端 `Class.className`
- 解決方案：在 `classService.ts` 加入 `mapToClass()` 轉換函數

---

## 🔗 相關檔案

- [Prisma Schema](./backend/prisma/schema.prisma)
- [Backend Index](./backend/src/index.ts)
- [Frontend Services](./src/services/index.ts)
