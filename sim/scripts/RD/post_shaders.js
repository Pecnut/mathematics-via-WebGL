// post_shaders.js

export function computeDisplayFunShaderTop() {
  return `varying vec2 textureCoords;
    uniform sampler2D textureSource;
    const float pi = 3.141592653589793;
    uniform float dx;
    uniform float dy;
    uniform float L;
    uniform float L_x;
    uniform float L_y;
    uniform float L_min;
    uniform float minX;
    uniform float minY;
    uniform float t;
    uniform bool customSurface;
    uniform bool vectorField;
    uniform bool overlayLine;
    uniform sampler2D imageSourceOne;
    uniform sampler2D imageSourceTwo;

    float H(float val) 
    {
        float res = smoothstep(-0.01, 0.01, val);
        return res;
    }

    float H(float val, float edge) 
    {
        float res = smoothstep(-0.01, 0.01, val - edge);
        return res;
    }

    float safetanh(float val)
    {
        return 1.0 - 2.0/(1.0+exp(2.0*val));
    }

    float safepow(float x, float y) {
      if (x >= 0.0) {
          return pow(x,y);
      }
      if (mod(round(y),2.0) == 0.0) {
          return pow(-x,y);
      }
      return -pow(-x,y);
    }

    const float ALPHA = 0.147;
    const float INV_ALPHA = 1.0 / ALPHA;
    const float BETA = 2.0 / (pi * ALPHA);
    float erfinv(float pERF) {
      float yERF;
      if (pERF == -1.0) {
        yERF = log(1.0 - (-0.99)*(-0.99));
      } else {
        yERF = log(1.0 - pERF*pERF);
      }
      float zERF = BETA + 0.5 * yERF;
      return sqrt(sqrt(zERF*zERF - yERF * INV_ALPHA) - zERF) * sign(pERF);
    }

    void main()
    {
       `;
}

export function computeDisplayFunShaderMid() {
  return `
        ivec2 texSize = textureSize(textureSource,0);
        float step_x = 1.0 / float(texSize.x);
        float step_y = 1.0 / float(texSize.y);
        float x = minX + textureCoords.x * L_x;
        float y = minY + textureCoords.y * L_y;

        vec4 uvwq = texture2D(textureSource, textureCoords);
        vec4 uvwqL = texture2D(textureSource, textureCoords + vec2(-step_x, 0.0));
        vec4 uvwqR = texture2D(textureSource, textureCoords + vec2(+step_x, 0.0));
        vec4 uvwqT = texture2D(textureSource, textureCoords + vec2(0.0, +step_y));
        vec4 uvwqB = texture2D(textureSource, textureCoords + vec2(0.0, -step_y));

        vec4 Svec = texture2D(imageSourceOne, textureCoords);
        float I_S = (Svec.x + Svec.y + Svec.z) / 3.0;
        float I_SR = Svec.r;
        float I_SG = Svec.g;
        float I_SB = Svec.b;
        float I_SA = Svec.a;
        vec4 Tvec = texture2D(imageSourceTwo, textureCoords);
        float I_T = (Tvec.x + Tvec.y + Tvec.z) / 3.0;
        float I_TR = Tvec.r;
        float I_TG = Tvec.g;
        float I_TB = Tvec.b;
        float I_TA = Tvec.a;

        vec4 uvwqX = (uvwqR - uvwqL) / (2.0*dx);
        vec4 uvwqY = (uvwqT - uvwqB) / (2.0*dy);
        vec4 uvwqXF = (uvwqR - uvwq) / dx;
        vec4 uvwqYF = (uvwqT - uvwq) / dy;
        vec4 uvwqXB = (uvwq - uvwqL) / dx;
        vec4 uvwqYB = (uvwq - uvwqB) / dy;

        float value = FUN;
				float height = value;
                float yVecComp;
				if (customSurface) {
					height = (HEIGHT) / L;
				}
        if (vectorField) {
            height = XVECFUN;
            yVecComp = YVECFUN;
        }
        if (overlayLine) {
          height = OVERLAYEXPR;
        }
        gl_FragColor = vec4(value, 0.0, height, yVecComp);`;
}

export function postShaderDomainIndicator() {
  return `
  gl_FragColor.g = float(float(indicatorFun) <= 0.0);`
}

export function postGenericShaderBot() {
  return `}`
}

export function interpolationShader() {
  return `varying vec2 textureCoords;
    uniform sampler2D textureSource;

    void main()
    {
			// Bilinear interpolation of scalar values.
            ivec2 texSize = textureSize(textureSource,0);
            float fx = fract(textureCoords.x * float(texSize.x) - 0.5);
            float fy = fract(textureCoords.y * float(texSize.y) - 0.5);
            float lowerx = textureCoords.x - fx / float(texSize.x);
            float lowery = textureCoords.y - fy / float(texSize.y);
            float upperx = lowerx + 1.0 / float(texSize.x);
            float uppery = lowery + 1.0 / float(texSize.y);

            float valueLB = texture2D(textureSource, vec2(lowerx, lowery)).r;
            float valueLT = texture2D(textureSource, vec2(lowerx, uppery)).r;
            float valueRB = texture2D(textureSource, vec2(upperx, lowery)).r;
            float valueRT = texture2D(textureSource, vec2(upperx, uppery)).r;

            float value = mix(mix(valueLB, valueRB, fx), mix(valueLT, valueRT, fx), fy);
            
            gl_FragColor = texture2D(textureSource, textureCoords);
            gl_FragColor.r = value;
      }`;
}
