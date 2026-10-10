// ==========================================
// แบบทดสอบ: {{EXAM_TITLE}}
// Backend Google Apps Script (Code.gs)
// ==========================================

// 1. ฟังก์ชันเปิดหน้าเว็บข้อสอบเข้าคู่กับ Index.html
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('แบบทดสอบ: {{EXAM_TITLE}}')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// ⚠️ เปลี่ยน ID ของ Google Sheets ของคุณตรงนี้ (คัดลอกมาจาก URL ของแผ่นงาน)
const SPREADSHEET_ID = "ใส่_ID_ของ_GOOGLE_SHEETS_ตรงนี้"; 

// 2. ฟังก์ชันตรวจสอบว่ารหัสนักเรียนเคยส่งข้อสอบแล้วหรือไม่ (เช็คแยกตามรอบ Pre-Test / Post-Test)
function checkStudentSubmitted(studentId, examMode) {
  try {
    if (!studentId || String(studentId).trim() === "") {
      return { submitted: false };
    }
    var cleanId = String(studentId).trim();
    var mode = (examMode || "pre").toLowerCase() === "post" ? "post" : "pre";
    var modeLabel = mode === "pre" ? "ก่อนเรียน (Pre-Test)" : "หลังเรียน (Post-Test)";

    if (SPREADSHEET_ID && SPREADSHEET_ID !== "ใส่_ID_ของ_GOOGLE_SHEETS_ตรงนี้") {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var responseSheet = ss.getSheetByName("Responses");
      if (responseSheet) {
        var lastRow = responseSheet.getLastRow();
        if (lastRow > 1) {
          // ดึงข้อมูลคอลัมน์ ID (col 2) และ รอบการสอบ (col 5)
          var data = responseSheet.getRange(2, 1, lastRow - 1, 5).getValues();
          for (var i = 0; i < data.length; i++) {
            var rowId = String(data[i][1]).trim();
            var rowMode = String(data[i][4]).trim();
            if (rowId === cleanId && rowMode.indexOf(mode === "pre" ? "Pre" : "Post") !== -1) {
              return {
                submitted: true,
                message: "รหัสประจำตัว " + cleanId + " เคยส่งแบบทดสอบรอบ" + modeLabel + "ไปแล้ว"
              };
            }
          }
        }
      }
    }
    return { submitted: false };
  } catch (e) {
    return { submitted: false, error: e.toString() };
  }
}

// 3. ฟังก์ชันประมวลผลคำตอบและบันทึกคะแนน (รองรับ Pre-Test และ Post-Test)
function processQuiz(params) {
  try {
    var studentId = String(params.studentId || "").trim();
    var studentName = params.studentName || "ไม่ได้ระบุชื่อ";
    var studentRoom = params.studentRoom || "ไม่ได้ระบุห้อง";
    var examMode = (params.examMode || "pre").toLowerCase() === "post" ? "post" : "pre";
    var modeLabel = examMode === "pre" ? "ก่อนเรียน (Pre-Test)" : "หลังเรียน (Post-Test)";
    var timestamp = new Date();
    
    if (!studentId) {
      return { success: false, message: "กรุณาระบุรหัสประจำตัวผู้เข้าสอบ" };
    }

    // ตรวจสอบการส่งซ้ำในรอบปัจจุบัน
    var checkResult = checkStudentSubmitted(studentId, examMode);
    if (checkResult.submitted) {
      return {
        success: false,
        alreadySubmitted: true,
        message: checkResult.message
      };
    }

    // ==========================================
    // 🔑 เฉลยคำตอบ 15 ข้อ (ปรับแต่งตามรายวิชา)
    // ==========================================
    var answerKeys = {
      "q_0": "คำตอบที่ถูกต้องข้อ 1",
      "q_1": "คำตอบที่ถูกต้องข้อ 2",
      "q_2": "คำตอบที่ถูกต้องข้อ 3",
      "q_3": "คำตอบที่ถูกต้องข้อ 4",
      "q_4": "คำตอบที่ถูกต้องข้อ 5",
      "q_5": "คำตอบที่ถูกต้องข้อ 6",
      "q_6": "คำตอบที่ถูกต้องข้อ 7",
      "q_7": "คำตอบที่ถูกต้องข้อ 8",
      "q_8": "คำตอบที่ถูกต้องข้อ 9",
      "q_9": "คำตอบที่ถูกต้องข้อ 10",
      "q_10": "คำตอบที่ถูกต้องข้อ 11",
      "q_11": "คำตอบที่ถูกต้องข้อ 12",
      "q_12": "คำตอบที่ถูกต้องข้อ 13",
      "q_13": "คำตอบที่ถูกต้องข้อ 14",
      "q_14": "คำตอบที่ถูกต้องข้อ 15"
    };

    var score = 0;
    var totalQuestions = 15;
    var answersRow = [];

    for (var i = 0; i < totalQuestions; i++) {
      var key = "q_" + i;
      var userAnswer = params[key] || "ไม่ได้ตอบ";
      answersRow.push(userAnswer);
      if (userAnswer === answerKeys[key]) {
        score++;
      }
    }

    var preScore = null;
    var diffScore = null;
    var gainPercent = null;

    if (SPREADSHEET_ID && SPREADSHEET_ID !== "ใส่_ID_ของ_GOOGLE_SHEETS_ตรงนี้") {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var responseSheet = ss.getSheetByName("Responses");
      
      // สร้างชีตหากยังไม่มี
      if (!responseSheet) {
        responseSheet = ss.insertSheet("Responses");
        var headers = ["Timestamp", "Student ID", "ชื่อ-นามสกุล", "ห้อง", "รอบการสอบ", "คะแนน", "คะแนนเต็ม", "คะแนนก่อนเรียน", "พัฒนาการ (+/-)", "ร้อยละพัฒนาการ (%)"];
        for (var h = 1; h <= totalQuestions; h++) {
          headers.push("ข้อ " + h);
        }
        responseSheet.appendRow(headers);
        responseSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
      }

      // หากเป็นรอบ Post-Test ให้ค้นหาคะแนนรอบ Pre-Test ในชีตเพื่อคำนวณพัฒนาการ
      if (examMode === "post") {
        var lastRow = responseSheet.getLastRow();
        if (lastRow > 1) {
          var allData = responseSheet.getRange(2, 1, lastRow - 1, 7).getValues();
          for (var r = 0; r < allData.length; r++) {
            var rId = String(allData[r][1]).trim();
            var rMode = String(allData[r][4]).trim();
            if (rId === studentId && rMode.indexOf("Pre") !== -1) {
              preScore = Number(allData[r][5]);
              diffScore = score - preScore;
              var maxGain = totalQuestions - preScore;
              gainPercent = maxGain > 0 ? Math.round((diffScore / maxGain) * 100) : 100;
              break;
            }
          }
        }
      }

      var rowData = [
        timestamp,
        studentId,
        studentName,
        studentRoom,
        modeLabel,
        score,
        totalQuestions,
        preScore !== null ? preScore : "-",
        diffScore !== null ? diffScore : "-",
        gainPercent !== null ? gainPercent + "%" : "-"
      ].concat(answersRow);

      responseSheet.appendRow(rowData);
    }

    return {
      success: true,
      score: score,
      total: totalQuestions,
      examMode: examMode,
      preScore: preScore,
      diffScore: diffScore,
      gainPercent: gainPercent,
      studentName: studentName,
      studentRoom: studentRoom
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// 4. ฟังก์ชันบันทึกพฤติกรรมหลุดโฟกัส / ต้องสงสัย
function logSuspiciousBehavior(params) {
  try {
    if (!SPREADSHEET_ID || SPREADSHEET_ID === "ใส่_ID_ของ_GOOGLE_SHEETS_ตรงนี้") {
      return { success: false, message: "No Spreadsheet ID configured" };
    }
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var logSheet = ss.getSheetByName("Cheat_Logs");
    if (!logSheet) {
      logSheet = ss.insertSheet("Cheat_Logs");
      logSheet.appendRow(["วัน-เวลา", "รหัสประจำตัว", "ห้อง", "ชื่อ-นามสกุล", "พฤติกรรมที่ตรวจพบ", "จำนวนครั้งสะสม"]);
      logSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#fee2e2");
    }
    logSheet.appendRow([
      new Date(),
      params.studentId || "ไม่ระบุ",
      params.studentRoom || "ไม่ระบุ",
      params.studentName || "ไม่ระบุ",
      params.actionType || "สลับหน้าจอ/เปิดแอปอื่น",
      params.count || 1
    ]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
