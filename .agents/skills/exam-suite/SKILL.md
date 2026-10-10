---
name: exam-suite
description: >-
  Standard operating procedures, blueprints, and templates for creating, modifying, and maintaining
  secure vocational/academic examination modules with dual backend (Local Node.js Server & Google Apps Script),
  15-minute countdown timers, auto-submit on expiration, anti-cheat screen blur locks, and teacher PIN protection.
---

# Exam Suite Blueprint & Development Skill

This skill provides the architectural guidelines, standardized components, and procedural workflows for creating and maintaining online examination modules across any vocational or academic subjects.

---

## 1. System Architecture

```
                      +-----------------------------+
                      |     Student Client (Web)    |
                      |  15m Timer | Anti-Cheat UI  |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               | (Offline / In-School)                     | (Cloud / Remote)
               v                                           v
    +----------------------+                    +----------------------+
    |   Local Node Server  |                    |  Google Apps Script  |
    |     (server.js)      |                    |      (Code.gs)       |
    |      Port 8888       |                    |    Google Sheets     |
    +----------+-----------+                    +----------+-----------+
               |                                           |
               v                                           v
    +----------------------+                    +----------------------+
    |  data/submissions    |                    |  Responses & Logs    |
    |  data/behavior_logs  |                    |      Spreadsheet     |
    +----------------------+                    +----------------------+
```

### Communication Bridge (`local-adapter.js`)
The exam suite transparently bridges between Local Server and Google Apps Script:
- If running on `http://localhost:*` or LAN IP: `local-adapter.js` intercepts calls to `google.script.run` and routes them to Node.js REST endpoints (`/api/process-quiz`, `/api/check-student`, `/api/log-behavior`).
- If hosted directly on Google Apps Script: calls execute against `Code.gs` without modifications.

---

## 2. Core Pillars of Each Exam Module

Every exam module consists of two main files located in its own folder (e.g. `exam_python/index.html` and `exam_python/Code.gs`):

### 1. Countdown Timer & Auto-Submit (15 นาที) + Pre/Post Test
- **Pre-Test vs Post-Test**: Driven by `?mode=pre` or `?mode=post` (switched via top banner).
  - **Pre-Test**: Baseline assessment. Does NOT reveal answers or explanations upon submission.
  - **Post-Test**: Summative assessment. Automatically matches student's Pre-Test score and computes Learning Gain:
    $$\text{Gain} = \frac{\text{Post} - \text{Pre}}{\text{Total} - \text{Pre}} \times 100\%$$
- **Duration**: Constant `EXAM_DURATION_MINUTES = 15;` (1 minute per question for 15 questions).
- **Reload-Safe**: Stores initial start epoch in `localStorage.getItem('exam_timer_start_' + CURRENT_EXAM_KEY + '_' + EXAM_MODE)`. F5 reload preserves elapsed time separately for each mode.
- **Visual Alert**:
  - Time > 3 mins: Blue badge (`#38bdf8`)
  - Time ≤ 3 mins: Amber warning (`#f59e0b`)
  - Time ≤ 1 min: Red flashing border (`#ef4444`)
- **Auto-Submit on Expiry (00:00)**:
  - Halts countdown and locks form inputs.
  - Injects fallback student ID/name if blank.
  - Automatically marks unanswered questions with `"ไม่ได้ตอบ"`.
  - Dispatches form data to backend silently and displays completion message.

### 2. Anti-Cheat Sentinel
- **Blur / Visibility Loss**: Detects window blur and tab switching. Triggers warning overlay.
- **Screenshot Protection**: Blocks `PrintScreen`, `Ctrl+P`, `Cmd+Shift+3/4`, and Right-Click context menu.
- **3-Strike Lock**: On 3 detected infractions, permanently locks the screen (`#lockScreen`) and logs telemetry to `data/behavior_logs.json` or `Cheat_Logs` sheet.

### 3. Teacher Control Plane (Protected by PIN)
- **Teacher PIN Code**: Standardized `TEACHER_PIN = "1234"` (stored in `sessionStorage.getItem('teacher_auth')`).
- **Hidden by Default**: The teacher settings panel is collapsed (`display: none`).
- **Restricted Actions**: Clicking `👨‍🏫 ส่วนของครูผู้สอน`, `🔄 รีเซ็ตเวลาสอบ`, or `🔓 อนุญาตสอบทันที (Bypass Pre-Test)` prompts for the PIN. Unauthorized attempts are rejected.

### 4. Sequential Lock & Learning Gain Engine (Pre-Test ➔ Post-Test)
- **Sequential Lock**: When in Post-Test mode (`?mode=post`), student ID input triggers real-time query (`/api/check-student` or `checkStudentSubmitted`). If no completed Pre-Test is found:
  - Form submit is disabled.
  - A red notice banner is displayed with a 1-click shortcut: `[👉 คลิกที่นี่เพื่อไปทำแบบทดสอบก่อนเรียน (Pre-Test) ทันที]`.
- **Teacher Bypass**: In `#teacherPanel`, teacher can click `🔓 อนุญาตสอบทันที (ครูกด)` with PIN `1234` to grant `teacher_bypass_pre` in `sessionStorage`, allowing students to test directly without Pre-Test.
- **Learning Gain**: Automatic comparison: `Gain = PostScore - PreScore`, `Gain% = round((Gain / (15 - PreScore)) * 100)`. Displayed on completion screen and server scoreboard.

### 5. Smart QR Engine & Link Sharing System
- **Dual Network Generator**: Supports both `Online (GitHub Pages)` and `Wi-Fi โรงเรียน (LAN IP)`.
- **Pre/Post Test Direct Switch**: Switch between Pre-Test and Post-Test dynamically updates QR code, direct URL, and LINE broadcast message template.
- **1-Click Copy Buttons**: Includes `[📋 คัดลอกลิงก์]` and `[💬 คัดลอกข้อความส่ง LINE]` with pre-formatted announcements for teacher-student communication.

---

## 3. Step-by-Step: Creating a New Exam for Any Subject

### Method A: Using the CLI Generator (Fastest)

Run the generator script with the folder name and subject title:

```bash
node scripts/create_exam.js <exam_folder_name> "<Subject Title>"
```

**Example:**
```bash
node scripts/create_exam.js exam_python "การเขียนโปรแกรมภาษา Python เบื้องต้น"
```

This creates:
- `exam_python/index.html` (Complete template with title, timer, PIN, and anti-cheat pre-configured)
- `exam_python/Code.gs` (Google Apps Script template)

### Method B: Manual Duplication from `template_exam/`

1. Copy the `template_exam/` folder to your new subject folder:
   ```bash
   cp -R template_exam exam_network
   ```
2. In `exam_network/index.html`:
   - Replace `{{EXAM_TITLE}}` with your subject name (e.g., `ระบบเครือข่ายคอมพิวเตอร์`).
   - Replace `{{EXAM_KEY}}` with your folder key (e.g., `exam_network`).
   - Update the 15 question blocks and option labels (`q_0` to `q_14`).
3. In `exam_network/Code.gs`:
   - Update `answerKeys` with the correct answers for each question (`q_0` to `q_14`).

---

## 4. Registering with Local Server (`server.js`)

When testing or running locally with `node server.js`:
Add the answer keys to `QUIZ_ANSWER_KEYS` in [server.js](file:///Users/allarmmac/myjob_folder/MyLaB/Exam_IoT/server.js):

```javascript
exam_network: {
    title: "แบบทดสอบ: ระบบเครือข่ายคอมพิวเตอร์",
    keys: {
        "q_0": "คำตอบที่ถูกต้องข้อ 1",
        "q_1": "คำตอบที่ถูกต้องข้อ 2",
        // ... จนถึง q_14
    }
}
```

---

## 5. Deployment Options

1. **Local School / LAN Deployment (Zero Internet Required)**:
   - Start local server: `node server.js`
   - Students open: `http://<SERVER_IP>:8888/<exam_folder_name>/`
   - Teacher views real-time scoreboard at: `http://<SERVER_IP>:8888#scoreboard`

2. **Google Cloud / Sheets Deployment**:
   - Create a Google Sheets document.
   - Go to **Extensions > Apps Script**, paste `Code.gs` and create `Index.html` pasting `index.html`.
   - Set `SPREADSHEET_ID` in `Code.gs`.
   - Deploy as Web App (**Execute as: Me**, **Who has access: Anyone**).
