const form = document.querySelector('#character-form');
const input = document.querySelector('#character-input');
const status = document.querySelector('#status');
const stage = document.querySelector('#character-stage');
const steps = document.querySelector('#stroke-steps');
const practice = document.querySelector('#practice-grid');
const pinyinInput = document.querySelector('#pinyin-input');
let writer;
let loadSequence = 0;

const svgNS = 'http://www.w3.org/2000/svg';
function svgElement(name, attributes = {}) {
  const node = document.createElementNS(svgNS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function makeCharacterSvg(strokes, mode, current = strokes.length - 1) {
  const svg = svgElement('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' });
  const group = svgElement('g', { transform: HanziWriter.getScalingTransform(100, 100, 5).transform });
  strokes.forEach((stroke, index) => {
    if (mode === 'step' && index > current) return;
    let fill = '#274b46';
    if (mode === 'step') fill = index === current ? '#c16d3f' : '#a6b5af';
    if (mode === 'trace') fill = '#d8e1db';
    group.append(svgElement('path', { d: stroke, fill }));
  });
  svg.append(group);
  return svg;
}

function makeGridCell(className, svg) {
  const cell = document.createElement('div');
  cell.className = `grid ${className}`;
  if (svg) cell.append(svg);
  return cell;
}

function setStatus(message) { status.textContent = message; }

function updatePinyin(value) {
  document.querySelector('#display-pinyin').textContent = value || '—';
  document.querySelector('#sheet-pinyin').textContent = value || '—';
}

async function loadCharacter(char) {
  const sequence = ++loadSequence;
  setStatus('正在准备字帖…');
  form.querySelector('button').disabled = true;
  try {
    if (!window.HanziWriter || !window.pinyinPro) throw new Error('工具加载失败');
    let data;
    if (char === '永') {
      const response = await fetch('data/%E6%B0%B8.json');
      if (response.ok) data = await response.json();
    }
    if (!data) {
      const response = await fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(char)}.json`);
      if (!response.ok) throw new Error('没有找到这个字的笔顺资料');
      data = await response.json();
    }
    if (sequence !== loadSequence) return;
    if (!Array.isArray(data.strokes) || !data.strokes.length) throw new Error('没有找到这个字的笔顺资料');

    const reading = pinyinPro.pinyin(char);
    pinyinInput.value = reading;
    updatePinyin(reading);
    document.querySelector('#display-character').textContent = char;
    document.querySelector('#sheet-character').textContent = char;
    document.querySelector('#stroke-count').textContent = `共 ${data.strokes.length} 画`;
    document.querySelector('#sheet-count').textContent = `${data.strokes.length} 画`;

    stage.replaceChildren();
    const stageSize = stage.clientWidth - 4;
    writer = HanziWriter.create(stage, char, {
      width: stageSize, height: stageSize, padding: Math.round(stageSize * 0.07),
      strokeColor: '#2d655f', outlineColor: '#dce7df',
      showOutline: true, showCharacter: false,
      strokeAnimationSpeed: 1.3, delayBetweenStrokes: 360,
      charDataLoader: () => data
    });
    writer.animateCharacter();

    const stepNodes = data.strokes.map((_, index) => {
      const item = document.createElement('div');
      item.className = 'step';
      item.append(makeGridCell('step-square', makeCharacterSvg(data.strokes, 'step', index)));
      const caption = document.createElement('div');
      caption.className = 'step-caption';
      caption.innerHTML = `第 <strong>${index + 1}</strong> 笔`;
      item.append(caption);
      return item;
    });
    steps.replaceChildren(...stepNodes);

    const practiceNodes = Array.from({ length: 8 }, (_, index) => {
      const mode = index < 2 ? 'full' : index < 5 ? 'trace' : 'blank';
      const svg = mode === 'blank' ? null : makeCharacterSvg(data.strokes, mode);
      return makeGridCell('practice-cell', svg);
    });
    practice.replaceChildren(...practiceNodes);
    setStatus('');
    return { character: char, pinyin: reading, strokeCount: data.strokes.length };
  } catch (error) {
    if (sequence === loadSequence) setStatus(`${error.message}。请检查汉字或稍后重试。`);
  } finally {
    if (sequence === loadSequence) form.querySelector('button').disabled = false;
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const characters = Array.from(input.value.trim());
  if (characters.length !== 1 || !/\p{Script=Han}/u.test(characters[0])) {
    setStatus('请只输入一个汉字。');
    input.focus();
    return;
  }
  loadCharacter(characters[0]);
});

pinyinInput.addEventListener('input', () => updatePinyin(pinyinInput.value.trim()));
document.querySelector('#replay-button').addEventListener('click', () => writer?.animateCharacter());
document.querySelector('#print-button').addEventListener('click', () => window.print());
if (document.modelContext?.registerTool) {
  Promise.resolve(document.modelContext.registerTool({
    name: 'generate_hanzi_copybook',
    title: '生成汉字字帖',
    description: '为一个汉字生成拼音、逐笔笔顺和田字格练习。',
    inputSchema: {
      type: 'object',
      properties: { character: { type: 'string', description: '一个汉字' } },
      required: ['character'], additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    async execute({ character }) {
      if (typeof character !== 'string' || Array.from(character).length !== 1 || !/^\p{Script=Han}$/u.test(character)) {
        throw new Error('请只输入一个汉字。');
      }
      input.value = character;
      const result = await loadCharacter(character);
      if (!result) throw new Error(status.textContent || '字帖生成失败');
      return result;
    }
  })).catch(() => {});
}
loadCharacter('永');
