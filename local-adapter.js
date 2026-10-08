/**
 * local-adapter.js
 * Universal Polyfill for google.script.run when running on Local Server
 * Seamlessly integrates with Node.js / Local Python API endpoints
 */
(function() {
    // If native google.script.run is provided by Google Apps Script runtime, do not override
    if (typeof window.google !== 'undefined' && window.google.script && window.google.script.run) {
        return;
    }

    // Identify current exam context from path
    var path = window.location.pathname.toLowerCase();
    var examType = 'exam_wifi';
    if (path.indexOf('webserver') !== -1 || path.indexOf('littlefs') !== -1) {
        examType = 'exam_webserver';
    } else if (path.indexOf('websocket') !== -1) {
        examType = 'exam_websocket';
    } else if (path.indexOf('wifi') !== -1) {
        examType = 'exam_wifi';
    } else if (path.indexOf('digital') !== -1) {
        examType = 'exam_digitalpin_digitalsensor';
    } else if (path.indexOf('analog') !== -1) {
        examType = 'exam_analogpin_analogsensor';
    } else if (path.indexOf('install') !== -1 || path.indexOf('setting') !== -1) {
        examType = 'Install_Setting';
    } else if (path.indexOf('display') !== -1 || path.indexOf('oled') !== -1 || path.indexOf('lcd') !== -1) {
        examType = 'exam_display';
    } else if (path.indexOf('mqtt') !== -1) {
        examType = 'exam_mqtt';
    }

    function LocalScriptRunner() {
        this._successHandler = function() {};
        this._failureHandler = function(err) { console.error("LocalRunner Error:", err); };
    }

    LocalScriptRunner.prototype.withSuccessHandler = function(handler) {
        this._successHandler = handler;
        return this;
    };

    LocalScriptRunner.prototype.withFailureHandler = function(handler) {
        this._failureHandler = handler;
        return this;
    };

    LocalScriptRunner.prototype.checkStudentSubmitted = function(studentId) {
        var self = this;
        fetch('/api/check-student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: studentId, examType: examType })
        })
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP error ' + res.status);
            return res.json();
        })
        .then(function(data) { self._successHandler(data); })
        .catch(function(err) { self._failureHandler(err); });
    };

    LocalScriptRunner.prototype.processQuiz = function(params) {
        var self = this;
        var payload = Object.assign({}, params, { examType: examType });
        fetch('/api/process-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP error ' + res.status);
            return res.json();
        })
        .then(function(data) { self._successHandler(data); })
        .catch(function(err) { self._failureHandler(err); });
    };

    LocalScriptRunner.prototype.logBehavior = function(studentId, studentName, studentRoom, actionType, count) {
        var self = this;
        fetch('/api/log-behavior', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId: studentId,
                studentName: studentName,
                studentRoom: studentRoom,
                actionType: actionType,
                count: count,
                examType: examType
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) { self._successHandler(data); })
        .catch(function(err) { self._failureHandler(err); });
    };

    window.google = {
        script: {
            get run() {
                return new LocalScriptRunner();
            }
        }
    };

    // ฟังก์ชันช่วยคัดลอกลิงก์ข้อสอบชุดนี้สำหรับผู้เรียนจากในหน้าข้อสอบ
    function copyStudentExamLinkFromPage(btn) {
        function doCopy(text) {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(function() {
                    notify(text);
                }).catch(function() {
                    fallback(text);
                });
            } else {
                fallback(text);
            }
        }
        function fallback(text) {
            var ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            notify(text);
        }
        function notify(text) {
            if (btn) {
                var oldText = btn.innerHTML;
                btn.innerHTML = '<span>✅ คัดลอกแล้ว!</span>';
                btn.style.background = '#059669';
                setTimeout(function() {
                    btn.innerHTML = oldText;
                    btn.style.background = '#0284c7';
                }, 2200);
            }
            alert("📋 คัดลอกลิงก์สำหรับผู้เรียนเรียบร้อยแล้ว:\n" + text);
        }

        fetch('/api/server-info').then(function(res) {
            return res.json();
        }).then(function(info) {
            var url = window.location.href;
            if (info && info.primaryIp && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                var port = window.location.port ? ':' + window.location.port : '';
                url = window.location.protocol + '//' + info.primaryIp + port + window.location.pathname;
            }
            doCopy(url);
        }).catch(function() {
            doCopy(window.location.href);
        });
    }

    window.copyStudentExamLinkFromPage = copyStudentExamLinkFromPage;

    function injectCopyButton() {
        var teacherBtn = document.querySelector('button[onclick*="toggleTeacherPanel"]');
        if (teacherBtn && teacherBtn.parentNode && !document.getElementById('btnCopyExamPageLink')) {
            var btn = document.createElement('button');
            btn.id = 'btnCopyExamPageLink';
            btn.type = 'button';
            btn.style.cssText = 'background: #0284c7; color: #ffffff; border: 1px solid #38bdf8; padding: 5px 12px; border-radius: 6px; font-size: 0.85em; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; font-family: inherit; margin-right: 6px; transition: background 0.2s;';
            btn.innerHTML = '<span>📋 คัดลอกลิงก์ให้นักเรียน</span>';
            btn.onclick = function() {
                copyStudentExamLinkFromPage(btn);
            };
            teacherBtn.parentNode.insertBefore(btn, teacherBtn);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectCopyButton);
    } else {
        injectCopyButton();
    }

    console.log("⚡ [Local Adapter] Active for local testing (" + examType + ")");
})();
