# WGL
A GPU-accelerated cellular automaton engine written in JavaScript and WebGL2. It simulates multiple interacting "atoms" (species/rulesets) competing on a unified field. The simulation pipeline relies heavily on GPGPU techniques, performing all state calculations and rendering directly on the graphics hardware.


## Architecture & Optimization Techniques

The engine is designed to minimize CPU-to-GPU bandwidth overhead and avoid expensive branching in shader execution.

* **Texture-Based Rule Evaluation:** Instead of complex `if/else` branching in GLSL, transition rules are pre-computed on the CPU into a 2D texture map. The fragment shader evaluates the next state using a single, O(1) texture lookup (`texture(rules, vec2(energy, neighborCount))`).
* **Shader Loop Unrolling:** Neighbor offset calculations are dynamically unrolled into the shader source string during compilation. This prevents the GPU from evaluating dynamic loops or branching during fragment processing.
* **Ping-Pong Framebuffers:** State progression is handled by swapping two textures (`currState` and `nextState`) per atom to prevent read/write race conditions. 
* **Pure-GPU Brush:** User input bypasses the HTML5 Canvas API entirely. Mouse coordinates and a PRNG seed are passed to the shader as uniforms, and the speckle density is calculated via a GLSL pseudo-random function, eliminating the need for frame-by-frame `texImage2D` uploads.

---

## WGL.js Library Documentation

`WGL` is a lightweight, purpose-built WebGL2 wrapper that handles context initialization, buffer management, and shader compilation for full-screen quad rendering.

### `class WGL`

**`constructor(width, height, gl?)`**
Initializes the WebGL2 context, configures the viewport, and allocates a static vertex buffer for a full-screen triangle strip (quad).
* `width` (Number): Canvas width.
* `height` (Number): Canvas height.
* `gl` (WebGL2RenderingContext): Optional. Auto-creates a canvas context if omitted.

**`makeBuffer(width, height, texture?)`**
Allocates and configures a 2D WebGL texture configured for nearest-neighbor filtering and edge clamping (ideal for discrete state data).
* **Returns:** `{ texture, update(src, width, height), free() }`
    * `update(src)`: Uploads an `HTMLImageElement`, `Canvas`, `ImageData`, or `Uint8Array` to the texture.

**`makeProgram(fragmentShaderSource)`**
Compiles and links a custom fragment shader against the internal full-screen quad vertex shader. Dynamically queries the linked program for active uniforms and generates corresponding JS setter functions.
* `fragmentShaderSource` (String): The raw GLSL source for the fragment shader.
* **Returns:** `{ uniforms, use(), compute(outputTex), free() }`
    * `uniforms`: An object containing auto-generated functions to set standard uniform types (e.g., `program.uniforms.resolution(w, h)`). Supports `SAMPLER_2D`, `INT`, `FLOAT`, `FLOAT_VEC2`, and `FLOAT_VEC4`.
    * `use()`: Binds the shader program.
    * `compute(outputTex)`: Binds the vertex attributes and executes a `drawArrays` call. If `outputTex` is provided, it renders to that texture via a Framebuffer Object (FBO). If `null`, it renders directly to the canvas default framebuffer.

**`free()`**
Deletes the base vertex buffer and framebuffer to prevent memory leaks.