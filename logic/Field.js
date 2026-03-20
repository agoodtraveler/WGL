class Field {
    static ATOM_STATE_VAR_PREFIX = "atomState_";
    wgl = null;
    atoms = null;
    state = null;
    programStep = null;
    programRender = null;
    constructor(wgl, [ ...atoms ]) {
        const state = wgl.makeBuffer(wgl.gl.canvas.width, wgl.gl.canvas.height);
        const programStep = wgl.makeProgram(`
            out vec4 output_color;
            uniform vec2 resolution;
            ${ atoms.reduce((a, c, i) => {
                return a + `uniform sampler2D ${ Field.ATOM_STATE_VAR_PREFIX + i };\n`;
            }, "") }
            vec4 resultAtom = vec4(0.0, 0.0, 0.0, 0.0);
            float fieldEnergy = 0.0;
            void processAtom(vec4 _currAtom) {
                resultAtom = mix(_currAtom, resultAtom, step(_currAtom.x, resultAtom.x));
                fieldEnergy += _currAtom.x;
            }
            void main() {
                vec2 texCoord = gl_FragCoord.xy / resolution;
                ${ atoms.reduce((a, c, i) => {
                    return a + `processAtom(texture(${ Field.ATOM_STATE_VAR_PREFIX + i }, texCoord));\n`;
                }, "") }   
                output_color = resultAtom;
            }
            `);
        const programRender = wgl.makeProgram(`
            out vec4 output_color;
            uniform vec2 resolution;
            uniform sampler2D currState;
            // function "vec3 hsv2rgb(vec3)" taken from: http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
            vec3 hsv2rgb(vec3 c) {
                vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
            }
            void main() {
                vec2 texCoord = gl_FragCoord.xy / resolution;
                vec4 currValue = texture(currState, texCoord);
                float hue = (255.0 / 6.0) * currValue.y;
                float value = currValue.x;
                output_color = vec4(hsv2rgb(vec3(hue, 1.0, value)), 1.0);
            }
        `);

        this.wgl = wgl;
        this.atoms = atoms;
        this.state = state;
        this.programStep = programStep;
        this.programRender = programRender;
    }
    free() {
        this.state.free();
        this.programStep.free();
        this.programRender.free();
    }
    step() {
        this.programStep.use();
        for (let i = 0; i < this.atoms.length; ++i) {
            const currAtom = this.atoms[i];
            const currAtomVarName = Field.ATOM_STATE_VAR_PREFIX + i;
            this.programStep.uniforms.resolution(this.wgl.gl.canvas.width, this.wgl.gl.canvas.height);
            this.programStep.uniforms[currAtomVarName](currAtom.currState.texture);
        }
        this.programStep.compute(this.state.texture);
        for (const currAtom of this.atoms) {
            currAtom.compute(this);
        }
    }
    render() {
        this.programRender.use();
        this.programRender.uniforms.resolution(this.wgl.gl.canvas.width, this.wgl.gl.canvas.height);
        this.programRender.uniforms.currState(this.state.texture);
        this.programRender.compute(null);
    }
}