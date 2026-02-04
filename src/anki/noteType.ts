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
 * 功能：展示中文、输入框、校验按钮、发音按钮、提示按钮
 */
export const FRONT_TEMPLATE = `
<div class="card front">
  <div class="cn-word">{{CN}}</div>
  {{#POS}}<div class="pos">[{{POS}}]</div>{{/POS}}
  
  <div class="input-area">
    <input type="text" id="spell-input" placeholder="输入英文拼写..." autocomplete="off" autocapitalize="off" spellcheck="false">
  </div>
  
  <div class="buttons">
    <div id="btn-audio" class="btn btn-audio" title="听发音" aria-label="听发音" tabindex="0">
      🔊 听发音
    </div>
    <div id="btn-hint" class="btn btn-hint" title="提示" aria-label="提示" tabindex="0">
      💡 提示
    </div>
    <div id="btn-check" class="btn btn-check" title="校验拼写" aria-label="校验拼写" tabindex="0">
      ✓ 校验
    </div>
  </div>
  
  <div id="hint-area" class="hint-area"></div>
  <div id="feedback" class="feedback"></div>
</div>

<script>
(function() {
  // 数据
  var EN = '{{EN}}';
  var AudioURL = '{{AudioURL}}';
  var HintField = '{{Hint}}';
  
  // 状态
  var hintLevel = 0;
  var audio = null;
  
  // 归一化文本
  function normalize(s) {
    return s.trim().toLowerCase()
      .replace(/\\s+/g, ' ')
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/\\s*-\\s*/g, '-');
  }
  
  // 获取所有可接受的答案
  function getAcceptedAnswers() {
    return EN.split(';').map(function(s) { return normalize(s.trim()); }).filter(function(s) { return s.length > 0; });
  }
  
  // 渐进式提示
  function getHint(level) {
    var word = EN.split(';')[0].trim();
    var len = word.length;
    if (level <= 0) return '';
    if (level === 1) {
      return word[0] + '_'.repeat(len - 1) + ' (' + len + '字母)';
    }
    if (level === 2) {
      var show = Math.min(2, len);
      return word.slice(0, show) + '_'.repeat(len - show) + ' (' + len + '字母)';
    }
    if (level === 3 && HintField) {
      return HintField;
    }
    // level >= 3 或 4+: 显示一半
    var showCount = Math.ceil(len / 2);
    return word.slice(0, showCount) + '_'.repeat(len - showCount);
  }
  
  // DOM 元素
  var input = document.getElementById('spell-input');
  var btnAudio = document.getElementById('btn-audio');
  var btnHint = document.getElementById('btn-hint');
  var btnCheck = document.getElementById('btn-check');
  var hintArea = document.getElementById('hint-area');
  var feedback = document.getElementById('feedback');
  
  // 隐藏/禁用音频按钮（如果没有 URL）
  if (!AudioURL) {
    btnAudio.style.display = 'none';
  }
  
  // 播放音频
  function handlePlayAudio() {
    if (!AudioURL) return;
    try {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      audio = new Audio(AudioURL);
      audio.play().catch(function(e) {
        feedback.textContent = '音频播放失败: ' + e.message;
        feedback.className = 'feedback error';
      });
    } catch (e) {
      feedback.textContent = '音频加载失败';
      feedback.className = 'feedback error';
    }
  }
  
  // 显示提示
  function handleHint() {
    hintLevel++;
    var hint = getHint(hintLevel);
    hintArea.textContent = hint;
    hintArea.style.display = 'block';
  }
  
  // 自动翻卡函数（兼容 Anki 桌面版和移动端）
  function showAnswer() {
    // Anki 桌面版
    if (typeof pycmd === 'function') {
      pycmd('ans');
    }
    // AnkiDroid
    else if (typeof AnkiDroidJS !== 'undefined' && typeof AnkiDroidJS.ankiShowAnswer === 'function') {
      AnkiDroidJS.ankiShowAnswer();
    }
    // AnkiMobile (iOS) - 模拟点击显示答案按钮
    else {
      var ansBtn = document.getElementById('anki-show-answer');
      if (ansBtn) ansBtn.click();
    }
  }
  
  // 校验拼写
  function handleCheck() {
    var userInput = input.value;
    if (!userInput.trim()) {
      feedback.textContent = '请输入拼写';
      feedback.className = 'feedback warning';
      return;
    }
    
    var accepted = getAcceptedAnswers();
    var normalizedInput = normalize(userInput);
    var isCorrect = accepted.indexOf(normalizedInput) !== -1;
    
    if (isCorrect) {
      feedback.textContent = '✓ 拼写正确！正在翻卡...';
      feedback.className = 'feedback success';
      input.classList.add('correct');
      input.classList.remove('incorrect');
      // 延迟 500ms 后自动翻卡，让用户看到反馈
      setTimeout(showAnswer, 500);
    } else {
      feedback.textContent = '✗ 拼写错误，可重输/听发音/看提示';
      feedback.className = 'feedback error';
      input.classList.add('incorrect');
      input.classList.remove('correct');
    }
  }
  
  // 绑定事件
  btnAudio.addEventListener('click', handlePlayAudio);
  btnAudio.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePlayAudio(); }
  });
  
  btnHint.addEventListener('click', handleHint);
  btnHint.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleHint(); }
  });
  
  btnCheck.addEventListener('click', handleCheck);
  btnCheck.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCheck(); }
  });
  
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); handleCheck(); }
  });
  
  // 自动聚焦输入框
  setTimeout(function() { input.focus(); }, 100);
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
    <div id="btn-audio-back" class="btn btn-audio" title="听发音" aria-label="听发音" tabindex="0">
      🔊 听发音
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
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePlayAudio(); }
    });
  }
})();
</script>
`;

/**
 * CSS 样式
 */
export const STYLING = `
/* 基础样式 */
.card {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 18px;
  text-align: center;
  color: #333;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}

.card.front, .card.back {
  background: #fff;
  border-radius: 16px;
  padding: 30px 20px;
  max-width: 500px;
  margin: 0 auto;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
}

/* 中文释义 */
.cn-word {
  font-size: 28px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 10px;
  line-height: 1.4;
}

/* 词性 */
.pos {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 20px;
}

/* 输入区域 */
.input-area {
  margin: 20px 0;
}

#spell-input {
  width: 100%;
  max-width: 300px;
  padding: 12px 16px;
  font-size: 20px;
  border: 2px solid #ddd;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  text-align: center;
}

#spell-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

#spell-input.correct {
  border-color: #27ae60;
  background-color: #e8f8f0;
}

#spell-input.incorrect {
  border-color: #e74c3c;
  background-color: #fdf2f2;
}

/* 按钮组 */
.buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 20px 0;
}

.btn {
  padding: 10px 18px;
  font-size: 14px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  filter: brightness(1.05);
}

.btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn-audio {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.btn-hint {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-check {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* 提示区域 */
.hint-area {
  display: none;
  margin: 15px 0;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 18px;
  font-family: monospace;
  color: #e67e22;
}

/* 反馈信息 */
.feedback {
  margin-top: 15px;
  padding: 12px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
}

.feedback.success {
  background: #d4edda;
  color: #155724;
}

.feedback.error {
  background: #f8d7da;
  color: #721c24;
}

.feedback.warning {
  background: #fff3cd;
  color: #856404;
}

/* === 背面样式 === */

.answer-section {
  margin: 20px 0;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.en-word {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.ipa {
  font-size: 18px;
  opacity: 0.9;
  font-family: "Lucida Sans Unicode", "Arial Unicode MS", sans-serif;
}

.audio-section {
  margin: 20px 0;
}

.example-section {
  margin: 20px 0;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: left;
  border-left: 4px solid #667eea;
}

.example-label, .hint-label {
  font-size: 12px;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.example-en {
  font-size: 16px;
  color: #2c3e50;
  line-height: 1.5;
  margin-bottom: 5px;
}

.example-cn {
  font-size: 14px;
  color: #7f8c8d;
  line-height: 1.5;
}

.hint-section {
  margin: 20px 0;
  padding: 15px;
  background: #fff8e1;
  border-radius: 8px;
  text-align: left;
  border-left: 4px solid #f5576c;
}

.hint-content {
  font-size: 15px;
  color: #5d4037;
  line-height: 1.5;
}

/* 移动端优化 */
@media (max-width: 480px) {
  .card.front, .card.back {
    padding: 20px 15px;
  }
  
  .cn-word {
    font-size: 24px;
  }
  
  .en-word {
    font-size: 26px;
  }
  
  .buttons {
    flex-direction: column;
    gap: 8px;
  }
  
  .btn {
    width: 100%;
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
