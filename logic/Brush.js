class Brush {
    wgl = null;
    program = null;

    constructor(wgl) {
        const program = wgl.makeProgram(`
            out vec4 output_color;
            uniform vec2 resolution;
            uniform sampler2D state;
            uniform vec2 brushPos;
            uniform float brushRadius;
            uniform float brushDensity;
            uniform vec4 brushColor;
            uniform float seed;

            float random(vec2 st) {
                return fract(sin(dot(st.xy + seed, vec2(12.9898, 78.233))) * 43758.5453123);
            }

            void main() {
                vec2 fragCoord = gl_FragCoord.xy;
                vec2 texCoord = fragCoord / resolution;
                vec4 statePx = texture(state, texCoord);
                vec2 adjustedBrushPos = vec2(brushPos.x, resolution.y - brushPos.y);
                float dist = distance(fragCoord, adjustedBrushPos);
                if (dist <= brushRadius) {
                    if (random(fragCoord) < brushDensity) {
                        output_color = brushColor;
                        return;
                    }
                }
                
                output_color = statePx;
            }
        `);

        this.wgl = wgl;
        this.program = program
    }

    free() {
        if (this.program !== null) {
            this.program.free();
            this.program = null;
        }
    }
    paint(atom, x, y, colorArr, radius, density) {
        this.program.use();
        this.program.uniforms.resolution(this.wgl.gl.canvas.width, this.wgl.gl.canvas.height);
        this.program.uniforms.state(atom.currState.texture);
        this.program.uniforms.brushPos(x, y);
        this.program.uniforms.brushRadius(radius);
        this.program.uniforms.brushDensity(density);
        this.program.uniforms.brushColor(colorArr[0], colorArr[1], colorArr[2], colorArr[3]);
        this.program.uniforms.seed(Math.random()); 
        this.program.compute(atom.nextState.texture);
        atom.swap();
    }
}