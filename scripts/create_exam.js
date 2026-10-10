#!/usr/bin/env node
/**
 * create_exam.js - CLI Generator for ESP32 Examination Suite
 * Creates a new standardized exam module from template_exam
 * 
 * Usage:
 *   node scripts/create_exam.js <folder_name> "<Subject Title>"
 * 
 * Example:
 *   node scripts/create_exam.js exam_python "การเขียนโปรแกรมภาษา Python"
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'template_exam');

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('\n❌ กรุณาระบุชื่อโฟลเดอร์ และชื่อรายวิชาให้ครบถ้วน');
    console.log('📌 ตัวอย่างการใช้งาน:');
    console.log('   node scripts/create_exam.js exam_python "การเขียนโปรแกรมภาษา Python"');
    console.log('   node scripts/create_exam.js exam_network "ระบบเครือข่ายคอมพิวเตอร์เบื้องต้น"\n');
    process.exit(1);
}

const folderName = args[0].trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
const examTitle = args[1].trim();
const targetDir = path.join(ROOT_DIR, folderName);

if (fs.existsSync(targetDir)) {
    console.error(`\n❌ โฟลเดอร์ "${folderName}" มีอยู่แล้ว กรุณาใช้ชื่ออื่น\n`);
    process.exit(1);
}

if (!fs.existsSync(TEMPLATE_DIR)) {
    console.error(`\n❌ ไม่พบโฟลเดอร์ต้นแบบ template_exam\n`);
    process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

// 1. Generate index.html
const templateHtmlPath = path.join(TEMPLATE_DIR, 'index.html');
let htmlContent = fs.readFileSync(templateHtmlPath, 'utf8');
htmlContent = htmlContent.replace(/\{\{EXAM_TITLE\}\}/g, examTitle);
htmlContent = htmlContent.replace(/\{\{EXAM_KEY\}\}/g, folderName);
fs.writeFileSync(path.join(targetDir, 'index.html'), htmlContent, 'utf8');

// 2. Generate Code.gs
const templateGsPath = path.join(TEMPLATE_DIR, 'Code.gs');
let gsContent = fs.readFileSync(templateGsPath, 'utf8');
gsContent = gsContent.replace(/\{\{EXAM_TITLE\}\}/g, examTitle);
fs.writeFileSync(path.join(targetDir, 'Code.gs'), gsContent, 'utf8');

console.log('\n============================================================');
console.log(`✅ สร้างแบบทดสอบวิชาใหม่สำเร็จ!`);
console.log('============================================================');
console.log(`📁 โฟลเดอร์:      ${folderName}/`);
console.log(`📖 ชื่อวิชา:       ${examTitle}`);
console.log(`📄 ไฟล์ที่สร้าง:   ${folderName}/index.html`);
console.log(`               ${folderName}/Code.gs`);
console.log('------------------------------------------------------------');
console.log('🛠️ สิ่งที่ต้องทำต่อ:');
console.log(`1. เปิดไฟล์ ${folderName}/index.html เพื่อแก้ไขคำถามและตัวเลือก 15 ข้อ`);
console.log(`2. นำเฉลยคำตอบไปใส่ใน server.js (ในตัวแปร QUIZ_ANSWER_KEYS) สำหรับตรวจคะแนนใน Local`);
console.log(`3. ทดสอบเข้าทำข้อสอบที่: http://localhost:8888/${folderName}/`);
console.log('============================================================\n');
