import {text, dash, attr, choice,polyline, path,fill,rect,line,circle,uniform,element} from './page.js';

const [W,H] = [297/2, 210/2];
const TOPMARGIN = 15;
const MARGIN = 6;
const HMARGIN = 10;

const message_area = document.getElementById('message');
const message_font_picker = document.getElementById('message-font');
const message_size_input = document.getElementById('message-size');
const section_split_input = document.getElementById('section-split');
const address_area = document.getElementById('address');
const my_address_input = document.getElementById('my-address');

function draw() {
    mathjax_ready.then(() => {
        const svg = document.querySelector('#page svg');
        svg.innerHTML = '';

        const MESSAGE_WIDTH = parseFloat(section_split_input.value);

        const message = message_area.value;
        const address = address_area.value;
        const my_address = my_address_input.value;

        text(address.trim(),W*MESSAGE_WIDTH + HMARGIN,TOPMARGIN+MARGIN, {fontname: 'EMSReadability', size: 2, halign: 'center', valign: 'center', maxwidth: (1-MESSAGE_WIDTH)*W-2*HMARGIN, maxheight: H-2*MARGIN-TOPMARGIN, fit_width: true});
        const message_size = parseFloat(message_size_input.value);
        text(message.trim(),HMARGIN,TOPMARGIN+MARGIN+message_size, {fontname: message_font_picker.value, size: message_size, halign: 'left', valign: 'top', maxwidth: MESSAGE_WIDTH*W-2*HMARGIN, maxheight: H-2*MARGIN-message_size-TOPMARGIN, fit_width: false});
        text(`From: ${my_address}`,W/2, H-MARGIN/2, {fontname: 'EMSReadability', halign: 'center', size: 3});
        line(W*MESSAGE_WIDTH,TOPMARGIN+(H-TOPMARGIN)/8,W*MESSAGE_WIDTH,TOPMARGIN+(H-TOPMARGIN)*7/8);
    });
}

message_area.addEventListener('input',draw)
message_size_input.addEventListener('input',draw)
section_split_input.addEventListener('input',draw)
address_area.addEventListener('input',draw)
my_address_input.addEventListener('input',draw)
message_font_picker.addEventListener('input',draw)
draw();
