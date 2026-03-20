const PIXEL_RATIO = window.devicePixelRatio;



let wgl = null;;
let brush = null;
let atoms = null;
let field = null;

const pointer = { x: 0, y: 0, btn: false };
let brushRadius = 16;
let brushDensity = 0.5;
let currAtomIndex = 0;

const nextAtomIndex = () => ++currAtomIndex >= atoms.length ? currAtomIndex = 0 : currAtomIndex;

const init = (width, height) => {
    const newWGL = new WGL(width, height);
    const newBrush = new Brush(newWGL);
    const newAtoms = [
        new Atom(newWGL, 1, Atom.neighborOffsetsRect(-1, 1, -1, 1, true), (neighborCount, energy, type) => {
            if (neighborCount === 3) {
                energy = 255;
            } else if (neighborCount === 2) {
                energy = energy;
            } else {
                energy = energy == 0 ? 0 : energy - 1;
            }
            return [ energy, type, energy, energy ];
        }),
        new Atom(newWGL, 2, Atom.neighborOffsetsRect(-1, 1, -1, 1, true), (neighborCount, energy, type) => {
            if (neighborCount === 3) {
                energy = 255;
            } else if (neighborCount === 2 || neighborCount === 7) {
                energy = energy;
            } else {
                energy = energy == 0 ? 0 : energy - 1;
            }
            return [ energy, type, energy, energy ];
        }),
        new Atom(newWGL, 3, Atom.neighborOffsetsRect(-1, 1, -1, 1, true), (neighborCount, energy, type) => {
            if (neighborCount === 3) {
                energy = 255;
            } else if (neighborCount === 2) {
                energy = energy;
            } else {
                energy = energy == 0 ? 0 : energy - 1;
            }
            return [ energy, type, energy, energy ];
        }),
        new Atom(newWGL, 4, Atom.neighborOffsetsRect(-1, 1, -1, 1, true), (neighborCount, energy, type) => {
            if (neighborCount === 3) {
                energy = 255;
            } else if (neighborCount === 2 || neighborCount === 7) {
                energy = energy;
            } else {
                energy = energy == 0 ? 0 : energy - 1;
            }
            return [ energy, type, energy, energy ];
        })
    ];
    const newField = new Field(newWGL, newAtoms);

    document.body.appendChild(newWGL.gl.canvas);
    const updatePointer = event => {
        pointer.x = Math.round(event.offsetX * PIXEL_RATIO);
        pointer.y = Math.round(event.offsetY * PIXEL_RATIO);
        pointer.btn = event.buttons & 1;
    }
    newWGL.gl.canvas.onpointerdown = newWGL.gl.canvas.onpointermove = updatePointer;
    newWGL.gl.canvas.onpointerup = event => {
        updatePointer(event);
        nextAtomIndex();
    }

    if (wgl) {
        document.body.removeChild(wgl.gl.canvas);
        wgl.free();
        wgl = null;
    }
    if (brush) {
        brush.free();
        brush = null;
    }
    if (atoms) {
        atoms.forEach(a => a.free());
        atoms = null;
    }
    if (field) {
        field.free();
        field = null;
    }

    wgl = newWGL;
    brush = newBrush;
    atoms = newAtoms;
    field = newField;
}
const resize = () => {
    const width = window.innerWidth * PIXEL_RATIO;
    const height = window.innerHeight * PIXEL_RATIO;
    init(width, height);
}
const paint = (x, y) => {
    const currAtom = atoms[currAtomIndex];
    brush.paint(currAtom, x, y, [ Atom.MAX_ENERGY_VALUE / 255, currAtom.type / 255, 1.0, 1.0 ], brushRadius, brushDensity);
}



const onFrame = time => {
    if (pointer.btn) {
        paint(pointer.x, pointer.y);
    }
    field.step();
    field.render();
    window.requestAnimationFrame(onFrame);
}
window.onresize = resize;
window.onload = () => {
    resize();
    window.requestAnimationFrame(onFrame);
}
