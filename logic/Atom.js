class Atom {
    static  CHANNEL_COUNT = 4;
    static MAX_ENERGY_VALUE = 255;
    wgl = null;
    type = null;
    neighborOffsets = null;
    ruleFn = null;
    currState = null;
    nextState = null;
    rules = null;
    constructor(wgl, type, neighborOffsets, ruleFn) {
        const currState = wgl.makeBuffer(wgl.gl.canvas.width, wgl.gl.canvas.height);
        const nextState = wgl.makeBuffer(wgl.gl.canvas.width, wgl.gl.canvas.height);
        const maxNeighborCount = neighborOffsets.length;
        const rulesWidth = Atom.MAX_ENERGY_VALUE + 1;
        const rulesHeight = Atom.MAX_ENERGY_VALUE + 1;
        const rules = wgl.makeBuffer(rulesWidth, rulesHeight);
        const rulesArray = new Uint8Array(rulesWidth * rulesHeight * Atom.CHANNEL_COUNT);
        for (let currNeighborCount = 0; currNeighborCount < maxNeighborCount; ++currNeighborCount) {
            for (let currEnergy = 0; currEnergy < rulesWidth ; ++currEnergy) {
                const currValue = ruleFn(currNeighborCount, currEnergy, this.type);
                const rowOffset = rulesWidth * currNeighborCount * Atom.CHANNEL_COUNT;
                const columnOffset = currEnergy * Atom.CHANNEL_COUNT;
                rulesArray.set(currValue, rowOffset + columnOffset);
            }
        }
        rules.update(rulesArray, rulesWidth, rulesHeight);
        const programStep = wgl.makeProgram(`
            out vec4 output_color;
            uniform vec2 resolution;
            uniform sampler2D fieldState;
            uniform sampler2D currState;
            uniform sampler2D rules;
            float fieldNeighborsCount = 0.0;
            float selfNeighborsCount = 0.0;
            //float selfNeighborsEnergySum = 0.0;
            void processNeighbor(vec2 offset) {
                vec2 currTexCoord = (gl_FragCoord.xy + offset) / resolution;
                vec4 fieldValue = texture(fieldState, currTexCoord);
                vec4 atomValue = texture(currState, currTexCoord);
                if (fieldValue.y == atomValue.y) {
                    //selfNeighborsEnergySum += atomValue.x;
                    selfNeighborsCount += step(${ 254.5 / Atom.MAX_ENERGY_VALUE }, atomValue.x);
                } else {
                    fieldNeighborsCount += step(${ 254.5 / Atom.MAX_ENERGY_VALUE }, fieldValue.x);
                }
            }
            void main() {
                vec2 texCoord = gl_FragCoord.xy / resolution;
                vec4 currFieldValue = texture(fieldState, texCoord);
                vec4 currValue = texture(currState, texCoord);
                ${ neighborOffsets.reduce((a, c) => {
                    return a + `processNeighbor(vec2( ${ c[0] }.0, ${ c[1] }.0));\n`;
                }, "") }
                if (selfNeighborsCount > fieldNeighborsCount) {
                    vec4 rules = texture(rules, vec2(currValue.x, (fieldNeighborsCount + selfNeighborsCount) / 255.0));
                    output_color = vec4(rules.x, ${ type }.0 / 255.0, currValue.zw);
                } else {
                    if (fieldNeighborsCount > 1.0) {
                        output_color = vec4(0.0, ${ type }.0 / 255.0, currValue.zw);
                    } else {
                        vec4 rules = texture( rules, vec2(currValue.x,  selfNeighborsCount / 255.0) );
                        output_color = vec4(rules.x, ${ type }.0 / 255.0, currValue.zw);
                    }
                }
            }
            `)

        this.wgl = wgl;
        this.type = type;
        this.neighborOffsets = neighborOffsets;
        this.currState = currState;
        this.nextState = nextState;
        this.rules = rules;
        this.programStep = programStep;
    }
    
    free() {
        this.currState.free();
        this.nextState.free();
        this.rules.free();
        this.programStep.free();
    }
    swap() {
        const temp = this.currState;
        this.currState = this.nextState;
        this.nextState = temp;
    }
    compute(field) {
        const currState = this.currState;
        const nextState = this.nextState;
        this.programStep.use();
        this.programStep.uniforms.resolution(this.wgl.gl.canvas.width, this.wgl.gl.canvas.height);
        this.programStep.uniforms.fieldState(field.state.texture);
        this.programStep.uniforms.currState(currState.texture);
        this.programStep.uniforms.rules(this.rules.texture);
        this.programStep.compute(nextState.texture);
        this.nextState = currState;
        this.currState = nextState;
    }
}
Atom.neighborOffsetsRect = (xFrom, xTo, yFrom, yTo, excludeSelf) => {
    let result = [];
    for (let x = xFrom; x <= xTo; ++x) {
        for (let y = yFrom; y <= yTo; ++y) {
            if (excludeSelf && x == 0 && y == 0) {
                continue;
            }
            result.push([x, y]);
        }
    }
    return result;
}