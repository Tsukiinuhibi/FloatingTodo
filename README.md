# 桌面代辦 FloatingTodo

Windows 桌面代辦事項懸浮視窗。

## 下載安裝
到 [Releases](https://github.com/Tsukiinuhibi/FloatingTodo/releases/latest) 下載 `FloatingTodo-Setup-x.x.x.exe`，雙擊即自動安裝。
（沒有數位簽章，Windows 跳出「已保護您的電腦」時，點「其他資訊 → 仍要執行」。）

安裝後程式會自動檢查新版本，有更新時視窗上方會出現「立即更新」。

## 功能
- 📌 左上角大頭釘：保持在所有視窗最上層
- 即時日期時間（Windows 系統時間）、月曆、每天幾點要做什麼
- 必做區：每日／每週（可指定週幾）／每月（可指定日期範圍）／每季／每年
- 到期前 1 小時未完成 → Windows 通知提醒
- ⚙ 設定
  - **配色**：8 個部位可自訂，RGB 色環＋滴管、螢幕滴管、預覽後再套用
  - **繼承資料**：匯出繼承檔 → 新電腦匯入，確認同一使用者後合併
  - **更新**：顯示版本、手動檢查更新

## 開發
```
npm install
npm start          # 執行
npm run dist       # 打包 Windows 安裝檔（dist/）
```

## 發布新版本
1. 修改 `package.json` 的 `version`
2. `npm run dist`
3. 在 GitHub 建立 Release（tag 例如 `v0.3.1`），上傳 `dist/` 裡的
   `FloatingTodo-Setup-x.x.x.exe`、`.exe.blockmap`、`latest.yml`
