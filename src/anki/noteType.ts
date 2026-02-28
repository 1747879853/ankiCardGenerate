/**
 * Anki 笔记类型定义：模板（Front/Back）和样式（CSS）
 */

/**
 * 笔记类型名称
 */
export const NOTE_TYPE_NAME = 'CN→EN Active Recall (AudioURL)';

/**
 * 字段定义（顺序很重要）
 */
export const FIELDS = [
  'ID',
  'CN',
  'EN',
  'TypeAnswer',  // 用于 {{type:}} 的输入答案（取 EN 第一个，移动端原生输入可弹出键盘）
  'IPA',
  'POS',
  'AudioURL',
  'ExampleEN',
  'ExampleCN',
  'Hint',
  'Tags',
] as const;

/**
 * 正面模板 HTML + JS
 * 使用自定义 input 替代 {{type:TypeAnswer}}，避免 AnkiDroid 原生输入导致 JS 无法拦截
 * 移动端点击输入框可正常弹出键盘，拼写正确自动翻页+发音
 */
export const FRONT_TEMPLATE = `
<div class="card front">
  <div class="cn-word">{{CN}}</div>
  {{#POS}}<div class="pos">[{{POS}}]</div>{{/POS}}
  
  <div class="input-area tappable">
    <input type="text" id="vocab-input" name="typed" class="vocab-input tappable" placeholder="输入英文拼写..." autocomplete="off" autocorrect="off" autocapitalize="off" enterkeyhint="done" data-focus="true" autofocus />
  </div>
  
  <div class="buttons">
    <div id="btn-audio" class="btn btn-audio tappable" title="听发音 [1]" aria-label="听发音" tabindex="0">
      🔊 听发音 <span class="shortcut">1</span>
    </div>
    <div id="btn-hint" class="btn btn-hint tappable" title="提示 [2]" aria-label="提示" tabindex="0">
      💡 提示 <span class="shortcut">2</span>
    </div>
    <div id="btn-show-answer" class="btn btn-show-answer tappable" title="显示答案 [3]" aria-label="显示答案" tabindex="0">
      👁 显示答案 <span class="shortcut">3</span>
    </div>
  </div>
  
  <div id="hint-area" class="hint-area"></div>
  <div id="spell-status" class="spell-status"></div>
</div>

<script>
(function() {
  if (window.__ankiBackKey0Handler) {
    document.removeEventListener('keydown', window.__ankiBackKey0Handler, true);
    window.__ankiBackKey0Handler = null;
  }
  if (window.__ankiFrontKeyHandler) {
    document.removeEventListener('keydown', window.__ankiFrontKeyHandler, true);
    window.__ankiFrontKeyHandler = null;
  }
  var AudioURL = '{{AudioURL}}';
  var HintField = '{{Hint}}';
  var EN = '{{EN}}';
  var hintLevel = 0;
  var audio = null;
  
  function checkSpelling(input) {
    var trimmed = (input || '').trim();
    if (!trimmed) return { ok: false, msg: '请输入拼写' };
    var answers = EN.split(';').map(function(s) { return s.trim().toLowerCase(); }).filter(Boolean);
    var user = trimmed.toLowerCase();
    for (var i = 0; i < answers.length; i++) {
      if (user === answers[i]) return { ok: true };
    }
    return { ok: false, msg: '拼写错误，可重输/听发音/提示，或点击「显示答案」' };
  }
  
  function getHint(level) {
    var word = EN.split(';')[0].trim();
    var len = word.length;
    if (level <= 0) return '';
    if (level === 1) return word[0] + '_'.repeat(len - 1) + ' (' + len + '字母)';
    if (level === 2) return word.slice(0, Math.min(2, len)) + '_'.repeat(len - Math.min(2, len)) + ' (' + len + '字母)';
    if (level === 3 && HintField) return HintField;
    var showCount = Math.ceil(len / 2);
    return word.slice(0, showCount) + '_'.repeat(len - showCount);
  }
  
  var btnAudio = document.getElementById('btn-audio');
  var btnHint = document.getElementById('btn-hint');
  var btnShowAnswer = document.getElementById('btn-show-answer');
  var hintArea = document.getElementById('hint-area');
  var spellStatus = document.getElementById('spell-status');
  
  function stopProp(e) { e.stopPropagation(); }
  [btnAudio, btnHint, btnShowAnswer].forEach(function(el) {
    if (el) {
      el.addEventListener('touchstart', stopProp, { passive: true });
      el.addEventListener('touchend', stopProp, { passive: true });
      el.addEventListener('click', stopProp);
    }
  });
  
  if (!AudioURL) { if (btnAudio) btnAudio.style.display = 'none'; }
  
  function handlePlayAudio() {
    if (!AudioURL) return;
    try {
      if (audio) { audio.pause(); audio.currentTime = 0; }
      audio = new Audio(AudioURL);
      audio.play().catch(function() {});
    } catch (e) {}
  }
  
  function handleHint() {
    hintLevel++;
    hintArea.textContent = getHint(hintLevel);
    hintArea.style.display = 'block';
  }
  
  function showAnswer() {
    if (AudioURL) {
      try {
        if (audio) { audio.pause(); audio.currentTime = 0; }
        audio = new Audio(AudioURL);
        audio.play().catch(function() {});
      } catch (e) {}
      window.__playedFromFront = true;
    }
    if (typeof pycmd === 'function') pycmd('ans');
    else if (typeof AnkiDroidJS !== 'undefined' && typeof AnkiDroidJS.ankiShowAnswer === 'function') AnkiDroidJS.ankiShowAnswer();
    else { var b = document.getElementById('anki-show-answer'); if (b) b.click(); }
  }
  
  if (btnAudio) {
    btnAudio.addEventListener('click', handlePlayAudio);
    btnAudio.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePlayAudio(); } });
  }
  if (btnHint) {
    btnHint.addEventListener('click', handleHint);
    btnHint.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleHint(); } });
  }
  if (btnShowAnswer) {
    btnShowAnswer.addEventListener('click', showAnswer);
    btnShowAnswer.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showAnswer(); } });
  }
  
  var cardEl = document.querySelector('.card.front');
  var typeEl = document.getElementById('vocab-input');
  
  var answered = false;
  function handleEnterFromTypeans() {
    if (!typeEl) return false;
    var result = checkSpelling(typeEl.value);
    if (spellStatus) {
      spellStatus.className = 'spell-status ' + (result.ok ? 'ok' : 'err');
      spellStatus.textContent = result.ok ? '✓ 拼写正确！' : result.msg;
      spellStatus.style.display = 'block';
    }
    if (result.ok) {
      answered = true;
      if (window.__ankiFrontKeyHandler) {
        document.removeEventListener('keydown', window.__ankiFrontKeyHandler, true);
        window.__ankiFrontKeyHandler = null;
      }
      showAnswer();
    }
    return result.ok;
  }
  
  if (typeEl) {
    typeEl.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        e.stopPropagation();
        handleEnterFromTypeans();
      }
    }, true);
  }
  
  window.__ankiFrontKeyHandler = function(e) {
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    var k = e.key;
    var isEnter = k === 'Enter' || (e.keyCode === 13);
    var fromInput = (e.target && e.target.id === 'vocab-input') || (document.activeElement && document.activeElement.id === 'vocab-input');
    var hasTypedContent = typeEl && (typeEl.value || '').trim().length > 0;
    if (isEnter && (fromInput || hasTypedContent)) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      handleEnterFromTypeans();
      return;
    }
    if (k === '1') { e.preventDefault(); if (AudioURL) handlePlayAudio(); }
    else if (k === '2') { e.preventDefault(); handleHint(); }
    else if (k === '3') { e.preventDefault(); showAnswer(); }
  };
  document.addEventListener('keydown', window.__ankiFrontKeyHandler, true);
  
  if (typeEl) {
    var autoFlipTimer = null;
    var isMobile = document.documentElement.classList.contains('mobile') || document.documentElement.classList.contains('android') || document.documentElement.classList.contains('iphone') || document.documentElement.classList.contains('ipad');
    var autoFlipDelay = isMobile ? 300 : 400;
    function tryAutoFlip() {
      if (answered) return;
      var result = checkSpelling(typeEl.value);
      if (result.ok) {
        answered = true;
        if (window.__ankiFrontKeyHandler) {
          document.removeEventListener('keydown', window.__ankiFrontKeyHandler, true);
          window.__ankiFrontKeyHandler = null;
        }
        if (spellStatus) {
          spellStatus.className = 'spell-status ok';
          spellStatus.textContent = '✓ 拼写正确！';
          spellStatus.style.display = 'block';
        }
        showAnswer();
      }
    }
    typeEl.addEventListener('input', function() {
      if (answered) return;
      if (autoFlipTimer) clearTimeout(autoFlipTimer);
      autoFlipTimer = setTimeout(function() {
        autoFlipTimer = null;
        tryAutoFlip();
      }, autoFlipDelay);
    });
    typeEl.addEventListener('change', function() {
      if (answered) return;
      if (autoFlipTimer) clearTimeout(autoFlipTimer);
      autoFlipTimer = null;
      tryAutoFlip();
    });
    if (isMobile) {
      var pollInterval = setInterval(function() {
        if (answered) { clearInterval(pollInterval); return; }
        if (!typeEl.value || !typeEl.value.trim()) return;
        tryAutoFlip();
      }, 250);
    }
    setTimeout(function() { typeEl.focus(); }, 100);
  }
})();
</script>
`;

/**
 * 背面模板 HTML
 * 展示：完整答案、音标、词性、发音、例句、提示
 */
export const BACK_TEMPLATE = `
<div class="card back">
  <div class="cn-word">{{CN}}</div>
  
  <div class="answer-section">
    <div class="en-word">{{EN}}</div>
    {{#IPA}}<div class="ipa">{{IPA}}</div>{{/IPA}}
    {{#POS}}<div class="pos">[{{POS}}]</div>{{/POS}}
  </div>
  
  {{#AudioURL}}
  <div class="audio-section">
    <div id="btn-audio-back" class="btn btn-audio tappable" title="听发音 [0]" aria-label="听发音" tabindex="0">
      🔊 听发音 <span class="shortcut">0</span>
    </div>
  </div>
  {{/AudioURL}}
  
  {{#ExampleEN}}
  <div class="example-section">
    <div class="example-label">例句</div>
    <div class="example-en">{{ExampleEN}}</div>
    {{#ExampleCN}}<div class="example-cn">{{ExampleCN}}</div>{{/ExampleCN}}
  </div>
  {{/ExampleEN}}
  {{^ExampleEN}}{{#ExampleCN}}
  <div class="example-section">
    <div class="example-label">例句</div>
    <div class="example-cn">{{ExampleCN}}</div>
  </div>
  {{/ExampleCN}}{{/ExampleEN}}
  
  {{#Hint}}
  <div class="hint-section">
    <div class="hint-label">提示/记忆点</div>
    <div class="hint-content">{{Hint}}</div>
  </div>
  {{/Hint}}
</div>

<script>
(function() {
  var AudioURL = '{{AudioURL}}';
  var btnAudio = document.getElementById('btn-audio-back');
  var audio = null;
  
  if (btnAudio && AudioURL) {
    function handlePlayAudio() {
      try {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        audio = new Audio(AudioURL);
        audio.play().catch(function(e) {
          console.error('Audio playback failed:', e);
        });
      } catch (e) {
        console.error('Audio load failed:', e);
      }
    }
    
    btnAudio.addEventListener('click', handlePlayAudio);
    btnAudio.addEventListener('keydown', function(e) {
      if (e.repeat) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePlayAudio(); }
    });
    // 数字快捷键 0=听发音（1-4 留给 Anki 记忆度）
    // 添加前先移除旧监听器，避免切换卡片时多个监听器累积导致重复播放（含上一张卡的发音）
    if (window.__ankiBackKey0Handler) {
      document.removeEventListener('keydown', window.__ankiBackKey0Handler, true);
    }
    window.__ankiBackKey0Handler = function(e) {
      if (e.repeat) return;
      if (!e.ctrlKey && !e.altKey && !e.metaKey && (e.key === '0' || e.keyCode === 48)) {
        e.preventDefault();
        e.stopPropagation();
        handlePlayAudio();
      }
    };
    document.addEventListener('keydown', window.__ankiBackKey0Handler, true);
    if (!window.__playedFromFront) handlePlayAudio();
    else window.__playedFromFront = false;
  }
})();
</script>
`;

/**
 * CSS 样式 - 毛玻璃 + 苹果风
 */
export const STYLING = `
/* === 基础：苹果风字体与毛玻璃背景 === */
.card {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 17px;
  text-align: center;
  color: #1d1d1f;
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  /* 毛玻璃背景：柔和渐变 + 若支持则模糊 */
  background: linear-gradient(160deg, #e8ecf4 0%, #d4dce8 35%, #e2e8f0 70%, #f0f4f8 100%);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 卡片主体：毛玻璃效果 */
.card.front, .card.back {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  padding: 32px 24px;
  max-width: 480px;
  margin: 0 auto;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06),
              0 1px 3px rgba(0, 0, 0, 0.04),
              inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* 中文释义 */
.cn-word {
  font-size: 26px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 8px;
  line-height: 1.45;
  text-align: left;
  white-space: pre-line;
  letter-spacing: -0.02em;
}

/* 词性 */
.pos {
  font-size: 13px;
  color: #86868b;
  margin-bottom: 20px;
  font-weight: 500;
}

/* 输入区域 */
.input-area {
  margin: 20px 0;
}

/* 输入框：苹果风圆角 + 毛玻璃边框 */
#vocab-input, #typeans {
  width: 100%;
  max-width: 280px;
  padding: 14px 18px;
  font-size: 19px !important;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  outline: none;
  text-align: center;
  min-height: 48px;
  box-sizing: border-box;
  display: block;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #1d1d1f;
  transition: border-color 0.2s, box-shadow 0.2s;
}

#vocab-input::placeholder, #typeans::placeholder {
  color: #86868b;
}

#vocab-input:focus, #typeans:focus {
  border-color: rgba(0, 113, 227, 0.5);
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.15);
}

/* AnkiMobile 触摸 */
.tappable {
  cursor: pointer;
}

/* 按钮组 */
.buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 20px 0;
}

/* 按钮：毛玻璃 + 苹果风 */
.btn {
  padding: 12px 20px;
  font-size: 15px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1);
  font-weight: 500;
  letter-spacing: -0.01em;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06),
              inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.btn:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.btn:active {
  transform: translateY(0) scale(0.98);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.btn-audio {
  background: rgba(52, 199, 89, 0.85);
  color: white;
}

.btn-hint {
  background: rgba(255, 149, 0, 0.85);
  color: white;
}

.btn-show-answer {
  background: rgba(0, 113, 227, 0.85);
  color: white;
}

.shortcut {
  font-size: 11px;
  opacity: 0.9;
  margin-left: 3px;
}

/* 提示区域：毛玻璃 */
.hint-area {
  display: none;
  margin: 16px 0;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 149, 0, 0.2);
  border-radius: 12px;
  font-size: 17px;
  font-family: "SF Mono", "Menlo", "Monaco", monospace;
  color: #1d1d1f;
}

/* 拼写状态：毛玻璃 */
.spell-status {
  display: none;
  margin: 16px 0;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 15px;
  text-align: center;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.spell-status.ok {
  background: rgba(52, 199, 89, 0.2);
  color: #1d7a2e;
  border: 1px solid rgba(52, 199, 89, 0.3);
}

.spell-status.err {
  background: rgba(255, 59, 48, 0.12);
  color: #c62828;
  border: 1px solid rgba(255, 59, 48, 0.2);
}

/* === 背面样式 === */

.answer-section {
  margin: 20px 0;
  padding: 22px;
  background: rgba(0, 113, 227, 0.12);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 113, 227, 0.2);
  border-radius: 16px;
  color: #1d1d1f;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.en-word {
  font-size: 30px;
  font-weight: 700;
  margin-bottom: 6px;
  letter-spacing: -0.03em;
  color: #1d1d1f;
}

.ipa {
  font-size: 17px;
  color: #86868b;
  font-family: "Lucida Sans Unicode", "Arial Unicode MS", sans-serif;
}

.audio-section {
  margin: 20px 0;
}

/* 例句区：毛玻璃 */
.example-section {
  margin: 20px 0;
  padding: 18px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  text-align: left;
  border-left: 4px solid rgba(0, 113, 227, 0.5);
}

.example-label, .hint-label {
  font-size: 11px;
  color: #86868b;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 8px;
  font-weight: 600;
}

.example-en {
  font-size: 16px;
  color: #1d1d1f;
  line-height: 1.55;
  margin-bottom: 6px;
}

.example-cn {
  font-size: 14px;
  color: #86868b;
  line-height: 1.5;
}

/* 提示区：毛玻璃 */
.hint-section {
  margin: 20px 0;
  padding: 18px;
  background: rgba(255, 204, 0, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 149, 0, 0.15);
  border-radius: 12px;
  text-align: left;
  border-left: 4px solid rgba(255, 149, 0, 0.5);
}

.hint-content {
  font-size: 15px;
  color: #1d1d1f;
  line-height: 1.55;
}

/* 移动端隐藏「显示答案」按钮（点击不好用） */
.mobile .btn-show-answer,
.android .btn-show-answer,
.iphone .btn-show-answer,
.ipad .btn-show-answer {
  display: none !important;
}

/* 移动端优化 */
@media (max-width: 480px) {
  .card.front, .card.back {
    padding: 24px 18px;
    border-radius: 18px;
    overflow-x: hidden;
    box-sizing: border-box;
  }
  
  .cn-word {
    font-size: 22px;
  }
  
  .en-word {
    font-size: 26px;
  }
  
  .buttons {
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    min-width: 0;
  }
  
  .btn {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    min-height: 48px;
    box-sizing: border-box;
    padding: 12px 16px;
  }
  
  #vocab-input, #typeans {
    font-size: 17px !important;
    min-height: 50px;
    padding: 16px 18px;
    max-width: 100%;
    box-sizing: border-box;
  }
}
`;

/**
 * 获取完整的笔记类型配置
 */
export const getNoteTypeConfig = () => ({
  name: NOTE_TYPE_NAME,
  fields: FIELDS,
  templates: [{
    name: 'CN→EN',
    qfmt: FRONT_TEMPLATE,
    afmt: BACK_TEMPLATE,
  }],
  css: STYLING,
});
