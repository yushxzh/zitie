const form = document.querySelector('#character-form');
const input = document.querySelector('#character-input');
const status = document.querySelector('#status');
const content = document.querySelector('#content');
const template = document.querySelector('#character-template');
const writers = [];
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
    const fill = mode === 'trace' ? '#d8e1db' : '#2d655f';
    group.append(svgElement('path', { d: stroke, fill }));
  });
  svg.append(group);
  return svg;
}

function makeGridCell(className, svg) {
  const cell = document.createElement('div');
  cell.className = 'grid ' + className;
  if (svg) cell.append(svg);
  return cell;
}

function parseCharacters(value) {
  const characters = Array.from(value.trim());
  if (characters.length < 1 || characters.length > 4 || characters.some(char => !/^\p{Script=Han}$/u.test(char))) {
    throw new Error('请输入 1～4 个汉字');
  }
  return characters;
}

async function fetchCharacterData(char) {
  const response = await fetch('data/' + encodeURIComponent(char) + '.json');
  if (!response.ok) throw new Error('没有找到“' + char + '”的笔顺资料');
  const data = await response.json();
  if (!Array.isArray(data.strokes) || !data.strokes.length) throw new Error('没有找到“' + char + '”的笔顺资料');
  return data;
}

function makeSheet(char, reading, data, index, total) {
  const sheet = template.content.firstElementChild.cloneNode(true);
  const setText = (selector, value) => { sheet.querySelector(selector).textContent = value; };
  setText('.sheet-number', (index + 1) + ' / ' + total);
  setText('.sheet-title-character', char);
  setText('.sheet-title-pinyin', reading);
  setText('.display-character', char);
  setText('.display-pinyin', reading);
  setText('.sheet-character', char);
  setText('.sheet-pinyin', reading);
  setText('.stroke-count', '共 ' + data.strokes.length + ' 画');
  setText('.sheet-count', data.strokes.length + ' 画');

  const pinyinInput = sheet.querySelector('.pinyin-input');
  pinyinInput.value = reading;
  pinyinInput.setAttribute('aria-label', '修改“' + char + '”的拼音');
  pinyinInput.id = 'pinyin-' + index;
  sheet.querySelector('.pinyin-label').htmlFor = pinyinInput.id;
  pinyinInput.addEventListener('input', () => {
    const value = pinyinInput.value.trim() || '—';
    setText('.display-pinyin', value);
    setText('.sheet-pinyin', value);
    setText('.sheet-title-pinyin', value);
  });

  const stepNodes = data.strokes.map((_, strokeIndex) => {
    const item = document.createElement('div');
    item.className = 'step';
    item.append(makeGridCell('step-square', makeCharacterSvg(data.strokes, 'step', strokeIndex)));
    const caption = document.createElement('div');
    caption.className = 'step-caption';
    caption.innerHTML = '第 <strong>' + (strokeIndex + 1) + '</strong> 笔';
    item.append(caption);
    return item;
  });
  sheet.querySelector('.stroke-steps').replaceChildren(...stepNodes);

  const practiceNodes = Array.from({ length: 8 }, (_, cellIndex) => {
    const mode = cellIndex < 2 ? 'full' : cellIndex < 5 ? 'trace' : 'blank';
    const svg = mode === 'blank' ? null : makeCharacterSvg(data.strokes, mode);
    return makeGridCell('practice-cell', svg);
  });
  sheet.querySelector('.practice-grid').replaceChildren(...practiceNodes);
  return sheet;
}

async function loadCharacters(value) {
  const characters = parseCharacters(value);
  const sequence = ++loadSequence;
  status.textContent = '正在准备字帖…';
  form.querySelector('button').disabled = true;
  try {
    if (!window.HanziWriter || !window.pinyinPro) throw new Error('工具加载失败');
    const cache = new Map();
    const dataList = await Promise.all(characters.map(char => {
      if (!cache.has(char)) cache.set(char, fetchCharacterData(char));
      return cache.get(char);
    }));
    if (sequence !== loadSequence) return;
    const readings = pinyinPro.pinyin(characters.join(''), { type: 'array' });
    const sheets = characters.map((char, index) => makeSheet(char, readings[index], dataList[index], index, characters.length));
    content.replaceChildren(...sheets);
    writers.length = 0;
    sheets.forEach((sheet, index) => {
      const stage = sheet.querySelector('.character-stage');
      const stageSize = stage.clientWidth - 4;
      const writer = HanziWriter.create(stage, characters[index], {
        width: stageSize, height: stageSize, padding: Math.round(stageSize * 0.07),
        strokeColor: '#2d655f', outlineColor: '#dce7df',
        showOutline: true, showCharacter: false,
        strokeAnimationSpeed: 1.3, delayBetweenStrokes: 360,
        charDataLoader: () => dataList[index]
      });
      sheet.querySelector('.replay-button').addEventListener('click', () => writer.animateCharacter());
      writers.push(writer);
      writer.animateCharacter();
    });
    status.textContent = '';
    return characters.map((char, index) => ({
      character: char, pinyin: readings[index], strokeCount: dataList[index].strokes.length
    }));
  } catch (error) {
    if (sequence === loadSequence) status.textContent = error.message + '。请检查汉字或稍后重试。';
  } finally {
    if (sequence === loadSequence) form.querySelector('button').disabled = false;
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  try {
    parseCharacters(input.value);
    loadCharacters(input.value);
  } catch (error) {
    status.textContent = error.message + '。';
    input.focus();
  }
});

document.querySelector('#print-button').addEventListener('click', async () => {
  await Promise.all(writers.map(writer => writer.showCharacter()));
  window.print();
});

if (document.modelContext?.registerTool) {
  Promise.resolve(document.modelContext.registerTool({
    name: 'generate_hanzi_copybook',
    title: '生成汉字字帖',
    description: '为 1～4 个汉字生成每个字的拼音、逐笔笔顺和田字格练习。',
    inputSchema: {
      type: 'object',
      properties: { characters: { type: 'string', description: '1～4 个汉字' } },
      required: ['characters'], additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    async execute({ characters }) {
      if (typeof characters !== 'string') throw new Error('请输入 1～4 个汉字。');
      parseCharacters(characters);
      input.value = characters.trim();
      const result = await loadCharacters(characters);
      if (!result) throw new Error(status.textContent || '字帖生成失败');
      return { characters: result };
    }
  })).catch(() => {});
}
loadCharacters('永');
