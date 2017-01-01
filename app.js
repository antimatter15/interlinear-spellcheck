var CodeMirror = require('codemirror')
var findAndReplaceDOMText = require('findandreplacedomtext')
var nspell = require('nspell');


// load dictionary
var path = require('path');
var fs = require('fs')
var dict = {
	aff: fs.readFileSync(path.join(path.dirname(require.resolve('dictionary-en-us')), './index.aff'), 'utf-8'),
	dic: fs.readFileSync(path.join(path.dirname(require.resolve('dictionary-en-us')), './index.dic'), 'utf-8')
};

console.log(dict)
var spell = nspell(dict);

window.spell = spell

var default_text = fs.readFileSync('README.md', 'utf-8')
var cm = CodeMirror(document.body, {
	value: localStorage.text || default_text,
	singleCursorHeightPerLine: false,
	lineWrapping: true
});
cm._interlinear = []
render(cm)

cm.on('change', function(cm){
	render(cm)
	localStorage.text = cm.getValue()
})


function render(cm){
	clearMarks(cm)
	clearInterlinear(cm)
	eachWord(cm, function(word, from, to){
		if(spell.correct(word)) return;
		markIncorrect(cm, from, to)
		
		var suggestions = spell.suggest(word);
		if(suggestions.length == 0) return;

		var text = suggestions.slice(0, 3).join(', ');
		drawInterlinear(cm, from, to, text)
	})
}


function drawInterlinear(cm, from, to, text){
	var node = document.createElement('div')
	node.className = "interlinear"
	node.innerText = text
	node.setAttribute('cm-ignore-events', 'true')

	findAndReplaceDOMText(node, {
		find: /\w+/g,
		replace: function(portion, match) {
			var link = document.createElement('a')
			link.href = 'javascript:void(0)'
			link.onclick = function(){
				cm.replaceRange(match, from, to)
			}
			link.innerText = match;
			return link
		}
	});

	cm._interlinear.push(node)
	cm.addWidget(from, node)
}

function markIncorrect(cm, from, to){
	var mark = cm.markText(from, to, {
		className: 'unknown'
	})
	mark._inline = true;
}



function clearMarks(cm){
	cm.getAllMarks()
		.filter(function(k){return k._inline})
		.forEach(function(k){k.clear()})

}

function clearInterlinear(cm){
	var w;
	while(w = cm._interlinear.pop()) w.parentNode.removeChild(w);
}

function eachWord(cm, cb){
	var lineNo = 0;
	cm.eachLine(function(line){
		var re = /([\w']+)/g;
		var m;
		while (m = re.exec(line.text)) {
			cb(m[1], 
				{ line: lineNo, ch: m.index }, 
				{ line: lineNo, ch: m.index + m[1].length })
		}
		lineNo++
	})
}
