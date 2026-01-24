# 石牌教會宗教教育股學籍系統

這是一個基於 React + Vite + TypeScript 開發的現代化學籍管理系統。

## 🚀 快速開始

### 1. 安裝依賴
初次下載專案後，請先安裝必要的套件：
```bash
npm install
```

### 2. 開發模式 (Development)
使用 Mock Data (假資料) 進行快速 UI 開發：
```bash
npm run dev
```
* 伺服器位置：`http://localhost:5173`
* 特色：支援熱更新 (Hot Reload)，修改存檔即時預覽。

### 3. 建置生產版本 (Build)
編譯出最終的靜態檔案 (位於 `dist` 資料夾)：
```bash
npm run build
```
* 產出的 `dist` 資料夾可直接上傳至 NAS Web Station。

### 4. Docker 全系統測試
模擬伺服器環境 (包含 Nginx 反向代理)：
```bash
docker-compose up --build
```
* 網頁位置：`http://localhost:8080`
* 這會同時啟動前端容器 (Nginx) 與後端容器。

## 📁 專案結構

* `src/` - 原始碼
* `nginx.conf` - Nginx 伺服器設定 (處理 SPA 路由與 API 轉發)
* `Dockerfile` - 前端容器建置腳本
* `docker-compose.yml` - 多容器編排設定 (前端 + 後端 + 資料庫)

## 🔗 API 設定
在開發模式下，API 請求會透過 `vite.config.ts` 的 Proxy 設定轉發至 `http://localhost:3000`。
在 Docker 環境下，API 請求會透過 Nginx 轉發至後端容器 `http://backend:3000`。
