import fonts from './fonts.js';
import * as Length from './Length.js';

import traced_tex from './traced_tex.js';

window.fonts = fonts;
window.traced_tex = traced_tex;

const page = document.querySelector('#page svg');

const IMMEDIATE = true;

export function set_page_dimensions(width,height) {
    document.body.style.setProperty('--width',width);
    document.body.style.setProperty('--height',height);
    const page = document.querySelector('#page svg');
    page.setAttribute('width',width);
    page.setAttribute('height',height);
    page.setAttribute('viewBox',`0 0 ${width} ${height}`);
}

export function clear() {
    const page = document.querySelector('#page svg');
    page.innerHTML = '';
}

export function uniform(a,b) {
    return Math.random()*(b-a)+a;
}

export function choice(l) {
    return l[Math.floor(Math.random()*l.length)];
}

export function element(name,attr,content) {
    const page = document.querySelector('#page svg');
    const e = document.createElementNS('http://www.w3.org/2000/svg',name);
    if(attr) {
        Object.entries(attr).forEach(([k,v]) => e.setAttribute(k,v));
    }
    if(content) {
        e.innerHTML = content;
    }
    if(IMMEDIATE && page) {
        page.appendChild(e);
    }
    return e;
}

export function ignore(e) {
    e.classList.add('ignore');
    return e;
}

export function fill(e,color='white') {
    e.setAttribute('fill',color);
    e.style.fill = color;
    return e;
}

export function stroke(e,color='black') {
    e.setAttribute('stroke',color);
    e.style.stroke = color;
    return e;
}

export function dash(e,pattern) {
    e.setAttribute('stroke-dasharray',pattern.join(' '));
    return e;
}

export function group() {
    return element('g',...arguments);
}

export function circle(cx,cy,r) {
    const c = element('circle',{cx,cy,r});
    return stroke(c,'black');
}

export function line(x1,y1,x2,y2) {
    return stroke(element('line',{x1,y1,x2,y2}),'black');
}

export function rect(x,y,width,height) {
    return stroke(element('rect',{x,y,width,height}),'black');
}

export function path(d) {
    return stroke(element('path',{d}),'black');
}

export function polyline(points,close) {
    if(close) {
        points = points.slice();
        points.push(points[0]);
    }
    return stroke(element('polyline', {points: points.map(([x,y]) => `${x} ${y}`).join(' ')}),'black');
}
export function attr(e, attr) {
    Object.entries(attr).forEach(([k,v]) => e.setAttribute(k,v));
    return e;
}

export function text(str,tx,ty,options={}) {
    const defaults = {
        fontname: 'EMSDelight',
        size: 10,
        maxwidth: undefined,
        maxheight: undefined,
        halign: 'left',
        valign: 'top',
        fit_width: false
    }
    let {fontname, size, maxwidth, halign, maxheight, valign, fit_width} = Object.assign({},defaults,options);
    const font = fonts[fontname];
    let scale = size/1000;
    let [x,y] = [0,0];
    let line = [];
    const lines = [];
    const line_height = -1000*1.2;
    const math_margin = 100;

    function output_line(line,ha) {
        ha = ha || halign;
        line.halign = ha;
        if(line.length>0) {
            lines.push(line);
        }
        y += line_height;
    }

    for(let j=0;j<str.length;j++) {
        const c = str[j];
        if(c=='\n') {
            output_line(line);
            line = [];
            x = 0;
            continue;
        }
        let ismath = false;
        let displaymath = false;
        let startmath = '';
        let endmath = '';
        if(c=='$') { 
            ismath = true;
            endmath = '$';
            startmath = '$';
        } else if(str.slice(j,j+2)=='\\[') {
            ismath = true;
            displaymath = true;
            startmath = '\\[';
            endmath = '\\]';
        }
        if(ismath) {
            if(displaymath && line.length) {
                output_line(line);
                line = [];
                x = 0;
            }
            j += startmath.length;
            const tex_start = j;
            for(;j<str.length && str.slice(j,j+endmath.length)!=endmath;j++) {
            }
            const tex = str.slice(tex_start,j);
            j += endmath.length-1;
            const mg = mathSync(tex,x,y,1000,displaymath);
            const math = mg.querySelector('[data-mml-node="math"]');
            const b = math.getBBox();
            mg.parentElement.removeChild(mg);
            const horizontal_advance_x = b.width + math_margin;
            const height = b.height + math.margin;
            line.push({type:'tex', tex, math, x: x,y, horizontal_advance_x, height});
            if(displaymath) {
                output_line(line,displaymath ? 'center' : halign);
                line = [];
                x = 0;
            } else {
                x += horizontal_advance_x;
            }
        } else {
            const glyph = font[c];
            line.push({type:'character', c,glyph,x,y, horizontal_advance_x: glyph.horizontal_advance_x, vertical_advance_y: glyph.vertical_advance_y, height: line_height});
            x += glyph.horizontal_advance_x;
            y += glyph.vertical_advance_y;
        }
        if(maxwidth/scale!==undefined && x>maxwidth/scale && !fit_width) {
            let i = line.length-1;
            for(;i>=0 && (line[i].type=='tex' || !line[i].c.match(/\s/));i--) {
            }
            if(i>0) {
                output_line(line.slice(0,i));
                line = line.slice(i);
                i = 0;
                for(;i<line.length && (line[i].type=='character' && line[i].c.match(/\s/));i++) {}
                line = line.slice(i);
                if(line.length) {
                    const sx = line[0].x;
                    x -= sx;
                    line.forEach(d=>{d.x -= sx; d.y = y});
                } else {
                    x = 0;
                }
            }
        }
    }
    output_line(line);

    if(fit_width) {
        const biggest = lines.reduce((w,line)=>{
            return Math.max(w,line[line.length-1].x+line[line.length-1].horizontal_advance_x)
        },0);
        scale *= maxwidth/scale/biggest;
    }

    if(maxwidth/scale!==undefined) {
        lines.forEach(line => {
            const last = line[line.length-1];
            const width = last.x + last.horizontal_advance_x;
            let shift_x = 0;
            switch(line.halign) {
                case 'center':
                    shift_x = maxwidth===undefined ? -width/2 : (maxwidth/scale-width)/2;
                    break;
                case 'right':
                    shift_x = maxwidth===undefined ? -width : (maxwidth/scale-width);
            }
            line.forEach(c=>c.x += shift_x);
        });
    }

    if(lines.length>0) {
        const height = -lines[lines.length-1][0].y - 1000;
        let shift_y = 0;
        if(!isNaN(maxheight/scale)) {
            switch(valign) {
                case 'center':
                    shift_y = (maxheight/scale-height)/2;
                    break;
                case 'bottom':
                    shift_y = (maxheight/scale-height);
                    break;
            }
        } else {
            switch(valign) {
                case 'center':
                    shift_y = -height/4;
                    break;
            }
        }
        lines.forEach(line=>line.forEach(c=>c.y -= shift_y));
    }

    const group = element('g',{
        transform: `translate(${tx} ${ty}) scale(${scale} -${scale})`,
    });
    function draw_line(line) {
        const g = element('g');
        group.appendChild(g);
        for(let s of line) {
            const {glyph,x,y,math,type} = s;
            let p;
            switch(type) {
                case 'character':
                    p = element('path',{
                        transform: `translate(${x} ${y})`,
                        d: glyph.d,
                        fill: 'none'
                    });
                    p.style['stroke-width'] = 0.35/scale;
                    break;
                case 'tex':
                    p = element('g',{
                        transform: `translate(${x} ${y})`
                    });
                    p.appendChild(math);
                    for(let pp of p.querySelectorAll('path')) {
                        pp.style['stroke-width'] = 0.35/scale;
                    }
                    break;
            }
            g.appendChild(p);
        }
    }
    lines.forEach(draw_line);
    return stroke(group,'black');
}

function font_picker(select) {
    for(let n of Object.keys(fonts)) {
        const option = document.createElement('option');
        option.setAttribute('value',n);
        option.textContent = n;
        select.appendChild(option);
    }
}
for(let select of document.querySelectorAll('select.font')) {
    font_picker(select);
}

export function extract_mathjax_symbols(symbols) {
    const s2 = document.createElementNS('http://www.w3.org/2000/svg','svg');
    s2.setAttribute('viewBox','-200 -1000 2000 2000');
    const g = element('g',{opacity:0.5});
    s2.appendChild(g);
    let i = 0;
    for(let p of Object.values(symbols)) {
      const p2 = p.cloneNode(true);
      p2.setAttribute('transform','');
      g.appendChild(p2);
      i += 1;
    }
    console.info(s2.outerHTML);
}

export function math() {
    return mathjax_ready.then(() => {
        return mathSync(...arguments);
    });
}

function fiddlePoint(x,y,options) {
    options = Object.assign({},{error:10},options||{});
    const r = (Math.random())*options.error;
    const t = uniform(0,2*Math.PI);
    return {x: x+r*Math.cos(t), y: y+r*Math.sin(t)};
}

function fiddlePathSegment(s,options) {
    let p;
    if(s.x!==undefined) {
        p = fiddlePoint(s.x,s.y,options);
        s.x = p.x;
        s.y = p.y;
    }
    if(s.x1!==undefined) {
        p = fiddlePoint(s.x1,s.y1,options);
        s.x1 = p.x;
        s.y1 = p.y;
    }
    if(s.x2!==undefined) {
        p = fiddlePoint(s.x2,s.y2,options);
        s.x2 = p.x;
        s.y2 = p.y;
    }
}
function fiddlePath(p,options) {
    for(let s of p.pathSegList) {
        fiddlePathSegment(s,options)
    }
}

export function mathSync(tex,tx,ty,size,display,valign,error) {
    valign = valign || 'center';
    error = error===undefined ? 25 : error;

    const target_svg = document.querySelector('#page svg');

    MathJax.texReset();
    var options = {em: 16, ex: 9, display: display};
    const node = MathJax.tex2svg(tex, options);
    const svg = node.querySelector('svg');
    const dy = parseFloat(svg.style['vertical-align'].replace('ex',''));
    const vb = svg.viewBox.baseVal;
    const rw = parseFloat(svg.getAttribute('width').replace('ex',''));
    const rh = parseFloat(svg.getAttribute('height').replace('ex',''));
    const w = rw * 9;
    const h = rh * 9;
    const xscale = w/vb.width*size/9;
    const yscale = h/vb.height*size/9;
    const x = tx;
    let y = ty + dy
    switch(valign) {
        case 'top':
            y += h/2/9 - vb.y*yscale;
            break;
    }

    const g = element('g',{transform: `translate(${x} ${y}) scale(${xscale} ${yscale})`});
    g.style['stroke-width'] = `${1/xscale}px !important`;
    for(let sg of Array.from(svg.children)) {
        if(sg.tagName=='g') {
            g.appendChild(sg);
        }
    }
    const stroke_width = 0.1/xscale;
    const untraced_symbols = {};
    let has_untraced_symbols = false;
    for(let u of g.querySelectorAll('use')) {
        const ref = u.getAttribute('xlink:href');
        const sid = ref.replace(/^#MJX-\d+-/,'');
        let p;
        if(traced_tex[sid]) {
            p = path(traced_tex[sid]);
            //fiddlePath(p,{error});
        } else {
            p = svg.querySelector(ref).cloneNode(true);
            if(!untraced_symbols[sid] && p.getAttribute('d')) {
                untraced_symbols[sid] = p;
                has_untraced_symbols = true;
            }
        } 
        const transform = u.getAttribute('transform');
        if(transform) {
            p.setAttribute('transform',transform);
        }
        p.style['stroke-width'] = stroke_width;
        u.replaceWith(p);
    }
    for(let r of g.querySelectorAll('rect')) {
        const [x,y] = [parseFloat(r.getAttribute('x')),parseFloat(r.getAttribute('y'))];
        const [w,h] = [parseFloat(r.getAttribute('width')),parseFloat(r.getAttribute('height'))];
        const l = path(`M ${x} ${y+h/2} L ${x+w} ${y+h/2}`);
        l.style['stroke-width'] = stroke_width;
        r.replaceWith(l);
    }
    MathJax.startup.document.clear();
    MathJax.startup.document.updateDocument();

    if(has_untraced_symbols) {
        console.info("There are some untraced MathJax symbols");
        extract_mathjax_symbols(untraced_symbols);
    }
    return g;
}

export function input(label,value,onchange) {
    const l = document.createElement('label');
    l.textContent = label;
    const inp = document.createElement('input');
    inp.value = value;
    inp.addEventListener('change',onchange);
    document.getElementById('page-controls').appendChild(l);
    document.getElementById('page-controls').appendChild(inp);
    return inp;
}

export function number_input(min,max) {
    const inp = input(...Array.from(arguments).slice(2));
    inp.setAttribute('type','number');
    inp.setAttribute('min',min);
    inp.setAttribute('max',max);
    return inp;
}

export function replace_text(el,options) {
    const defaults = {
        fontname: 'EMSDelight',
    }
    options = Object.assign({},defaults,options);
    for(let t of el.querySelectorAll('text')) {
        const x = parseFloat(t.getAttribute('x'));
        const y = parseFloat(t.getAttribute('y'));
        const transform = t.getAttribute('transform');
        const size = Length.toPx(t,t.style['font-size']);
        const anchor = t.getAttribute('text-anchor');
        const halign = anchor=='middle' ? 'center' : anchor=='end' ? 'right' : (anchor || 'left');
        const bastine = t.getAttribute('dominant-bastine');
        const valign = bastine=='central' ? 'center' : 'bottom';
        const tt = text(t.textContent,x,y,Object.assign({},options,{size,halign,valign}))
        tt.setAttribute('transform',transform+' '+tt.getAttribute('transform'))
        const stroke = t.getAttribute('fill');
        for(let p of tt.querySelectorAll('path')) {
            p.setAttribute('stroke',stroke);
        }
        t.parentElement.replaceChild(tt,t);
    }
}
