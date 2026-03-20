class WGL {
    gl = null;
    vertexBuffer = null;
    frameBuffer = null;
    constructor(width, height, gl = document.createElement('canvas').getContext('webgl2')) {
        gl.depthMask(false);
        gl.canvas.width = width;
        gl.canvas.height = height;
        gl.viewport(0, 0, width, height);
        
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ 1.0, -1.0,  -1.0, -1.0,  1.0, 1.0,  -1.0, 1.0 ]), gl.STATIC_DRAW);
        const frameBuffer = gl.createFramebuffer();

        this.gl = gl;
        this.vertexBuffer = vertexBuffer;
        this.frameBuffer = frameBuffer;
    }
    free() {
        this.gl.deleteFramebuffer(this.frameBuffer);
        this.gl.deleteBuffer(this.vertexBuffer);
    }
    makeBuffer(width, height, texture = this.gl.createTexture()) {
        const result = {};
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        result.texture = texture;
        result.update = (src, width = this.gl.canvas.width, height = this.gl.canvas.height) => {
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            if (src instanceof HTMLImageElement || src instanceof HTMLCanvasElement || src instanceof  ImageData || src instanceof  HTMLVideoElement) {
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, src);
            } else if (src === null || src instanceof Uint8Array) {
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, src);
            } else {
                throw new Error('Unsupported src type');
            }
        }
        result.free = () => {
            this.gl.deleteTexture(texture);
        }

        return result;
    }
    makeProgram(src) {
        const compile = (shaderSrc, shaderType) => {
            const shader = this.gl.createShader(shaderType);
            this.gl.shaderSource(shader, shaderSrc);
            this.gl.compileShader(shader);
            if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
                const shaderLog = this.gl.getShaderInfoLog(shader);
                this.gl.deleteShader(shader);
                throw new Error(`Compiler error: log=${ shaderLog }; src=\n${ shaderSrc.split('\n').map((line, i) => (i + 1) + ':\t' + line).join('\n') }`);
            }
            return shader;
        }
        const program = this.gl.createProgram();
        const vShader = compile(`${ WGL.SHADER_PREFIX }${ WGL.V_SHADER_SRC }`, this.gl.VERTEX_SHADER);
        const fShader = compile(`${ WGL.SHADER_PREFIX }${ src }`, this.gl.FRAGMENT_SHADER);
        this.gl.attachShader(program, fShader);
        this.gl.attachShader(program, vShader);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error(`Linker error: log=${ this.gl.getProgramInfoLog(program) }`);
        }
        this.gl.detachShader(program, vShader);
        this.gl.detachShader(program, fShader);
        this.gl.deleteShader(vShader);
        this.gl.deleteShader(fShader);
        const aVertexPositionLocation = this.gl.getAttribLocation(program, WGL.V_SHADER_VERT_POS_NAME);

        const result = {};
        result.uniforms = {};
        for (let i = 0, textureUnit = 0; i < this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS); ++i) {
            const info = this.gl.getActiveUniform(program, i);
            const location = this.gl.getUniformLocation(program, info.name);
            if (info.type === this.gl.SAMPLER_2D) {
                const tu = textureUnit;
                result.uniforms[info.name] = texture => {
                    this.gl.uniform1i(location, tu);
                    this.gl.activeTexture(this.gl.TEXTURE0 + tu);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                }
                ++textureUnit;
            } else if (info.type === this.gl.INT) {
                result.uniforms[info.name] = int => this.gl.uniform1i(location, int);
            } else if (info.type === this.gl.FLOAT) {
                result.uniforms[info.name] = float => this.gl.uniform1f(location, float);
            } else if (info.type === this.gl.FLOAT_VEC2) {
                result.uniforms[info.name] = (x, y) => this.gl.uniform2f(location, x, y);
            } else if (info.type === this.gl.FLOAT_VEC4) {
                result.uniforms[info.name] = (x, y, z, w) => this.gl.uniform4f(location, x, y, z, w);
            } else {
                throw new Error(`unknown uniform type; ${ info.type }; ${ info.name }`);
            }
        }
        result.use = () => {
            this.gl.useProgram(program);
        }
        result.compute = (outputTex = null /* will render to output, if null */) => {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
            this.gl.vertexAttribPointer(aVertexPositionLocation, 2, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(aVertexPositionLocation);
            if (outputTex !== null) {
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);
                this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, outputTex, 0);
            } else {
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            }
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        }
        result.free = () => {
            this.gl.deleteProgram(program);
        }
        return result;
    }
}
WGL.SHADER_PREFIX = `#version 300 es
#pragma optimize(on)
#pragma debug(off)
precision highp float;
`;
WGL.V_SHADER_VERT_POS_NAME = 'a_vertex_position';
WGL.V_SHADER_SRC = `
in vec2 ${ WGL.V_SHADER_VERT_POS_NAME };
void main() {
    gl_Position = vec4(${ WGL.V_SHADER_VERT_POS_NAME }, 0, 1);
}`;