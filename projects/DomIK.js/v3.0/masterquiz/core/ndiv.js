'use strict';

function nProperty(obj, param, type, options = {}) {
	const property = { obj: obj, param: param, type: type, value: null, options: options };
	property.set = (value) => { if (property.value !== value) { property.onChangeValue(value); property.value = value; } }
	property.get = () => { return property.value; }
	property.option = (name, value = 0) => { return options[name] ? options[name] : value };
	Object.defineProperty(obj, param, { set: (value) => { property.set(value); }, get: () => { return property.get(); }, });
	property.onChangeValue = (v) => { };
	if (property.option('init')) property.set(property.option('init'));
	return property;
}

const CSS = {
	hsl: (h, s, l) => { l /= 100; const a = s * Math.min(l, 1 - l) / 100; const f = n => { const k = (n + h / 30) % 12; const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * color).toString(16).padStart(2, '0'); }; return `#${f(0)}${f(8)}${f(4)}`; },
	rgb: (r, g, b) => { return `rgb(${r}, ${g}, ${b})`; },
	grad: (color0 = '#000000', color1 = '#888888', color2 = '#ffffff', level0 = 0, level1 = 50, level2 = 100, turn = 0.25) => { return `linear-gradient( ${turn}turn, ${color0} ${level0}%, ${color1} ${level1}%, ${color2} ${level2}%);`; },
	hex: (color = '#000000') => { return `${color}`; },
	random: () => { return `#${Math.floor(Math.random() * 16777215).toString(16)}` }
}

function nDiv(p, types = 'DIV') {
	const [type, input] = msplit(types, ':');
	const n = document.createElement(type);
	if (type === 'INPUT') n.type = input;
	n.classes = (classes = null) => { if (classes) { classes.split(' ').forEach((c) => { n.classList.add(c); }); }; return n; }
	n.styles = (styles = null) => { if (styles) { styles.split(';').forEach((s) => { const p = (s + ':').split(':'); n.style[p[0].trim()] = p[1].trim(); }); }; return n; }
	n.clear = () => { while (n.hasChildNodes()) { n.removeChild(n.firstChild); } };
	n.parented = (p) => { p.appendChild(n); return n; }
	n.visible = (visible = true) => { n.style.display = visible ? 'flex' : 'none'; return n; }
	if (p) n.parented(p);
	return n;
}

function nRow(p) { return nDiv(p).classes('row'); }
function nColumn(p) { return nDiv(p).classes('column'); }

const extensions = { video: ['.avi', '.ogg', '.mov', '.mp4'], image: ['.png', '.jpg'], sound: ['.aac', '.mp3'], text: ['.txt'], shader: ['.glsl'], pdf: ['.pdf'], model3d: ['.fbx'], addon: ['.dmx'], }

function nText(p, text = '') { const n = nDiv(p); n.text = (text = '') => { n.innerHTML = text; return n; }; n.append = (text = '') => { n.text(n.innerHTML + text); }; n.text(text); return n.classes('text'); }
function nButton(p, label = '', order = null) { const n = nText(p, label); n.run = (order) => { n.order = order; return n; }; n.run(order); n.addEventListener('pointerdown', () => { if (n.order) n.order(); }); return n.classes('button margin'); }

function nInput(p, type) {
	const n = nDiv(p, type);
	let _cast_;
	n.get = () => { return n.value; };
	n.set = (v) => { n.value = v; };
	n.up = (v) => { if (_cast_ !== v) { _cast_ = v; n.set(v); return true; } return false; };
	n.update = () => { if (n.up(n.get()) && n.onChangeValue) n.onChangeValue(_cast_); };
	return n;
}

function nCheck(p, init = true) {
	const n = nInput(p, 'INPUT:CHECKBOX');
	n.get = () => { return n.checked; }
	n.set = (v) => { n.checked = v; }
	n.addEventListener('change', (event) => { n.change(); });
	n.up(init);
	return n;
}

function nNumber(p, init, min = 0, max = 1, step = 0.1) {
	const n = nInput(p, 'INPUT:NUMBER');
	n.get = () => { return (Number(n.value)); }
	n.set = (v) => { n.value = String(v); }
	n.min = min; n.max = max; n.step = step;
	n.onchange = () => { n.change(); };
	n.up(init);
	return n;
}

function nSelect(p, init, options = []) {
	const n = nInput(p, 'SELECT');
	options.forEach((option) => { const o = nDiv(n, 'OPTION'); o.value = option; o.textContent = option; });
	n.onchange = () => { n.update(); };
	n.up(init);
	return n;
}

function nFile(p, label, onload = (file) => { }, types) {
	const n = nInput(p, 'INPUT:FILE');
	n.setAttribute('style', 'display:none');
	n.addEventListener('change', () => { const file = n.files[0]; file.extension = file.name.split('.').pop().toLowerCase(); onload(file); }, false);
	if (types) {
		let accept = ''; types.forEach((type) => { accept = `${accept}${extensions[type]}, `; });
		n.setAttribute('accept', accept);
	}
	const b = nButton(p, label, () => { n.click(); });
	return b;
}

function nWidget(p, property, label) {
	if (property.type) {
		let n;
		switch (property.type) {
			case 'CHECKBOX': n = nCheck(null, property.get()); break;
			case 'SELECT': n = nSelect(null, property.get(), property.option('options', ['empty'])); break;
			case 'NUMBER': n = nNumber(null, property.get(), property.option('min', 0), property.option('max', 1), property.option('step', 0.1)); break;
			case 'FILE': n = nFile(null, property.option('label'), property.option('onload'), property.option('types')); break;
			default: break;
		}
		if (n) {
			const row = nDiv(p).classes('row');
			if (property.type !== 'FILE') { const text = nText(row, label ? label : property.option('label', property.param)); }
			n.parented(row);
			n.onChangeValue = (v) => { property.set(v); }
			property.onChangeValue = (v) => { n.up(v); }
		}
		return n;
	}
}