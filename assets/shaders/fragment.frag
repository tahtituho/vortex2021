#version 400
#define PI 3.14159265359

in float[12] sines;
in float[12] coses;
in float random;

out vec4 FragColor;

uniform float act;
uniform vec3 fade;
uniform float time;
float time2 = time / 2;
float time3 = time / 3;
float time4 = time / 4;
float time5 = time / 5;
uniform vec2 resolution;

uniform vec3 cameraPosition;
uniform vec3 cameraLookAt;
uniform float cameraFov;

uniform float RAY_MAX_STEPS;
uniform float RAY_THRESHOLD;
uniform float RAY_MAX_DISTANCE;

uniform vec3 lightPosition;

uniform vec3 fogColor;
uniform float fogIntensity;

struct vec2Tuple {
    vec2 first;
    vec2 second;
};

struct vec3Tuple {
    vec3 first;
    vec3 second;
};

struct textureOptions {
    int index;
    vec3 baseColor;
    vec3 offset;
    vec3 scale;
    bool normalMap;
};

struct ambientOptions {
    vec3 color;
    float strength;
};

struct diffuseOptions {
    vec3 color;
    float strength;
};

struct specularOptions {
    vec3 color;
    float strength;
    float shininess;
};

struct shadowOptions {
    bool enabled;
    float hardness;
    float lowerLimit;
    float upperLimit;
};

struct aoOptions {
    bool enabled;
    float limit;
    float factor;
};

struct material {
    ambientOptions ambient;
    diffuseOptions diffuse;
    specularOptions specular;
    shadowOptions shadow;
    aoOptions ao;
    textureOptions texture;
};

struct entity {
    vec3 point;
    bool needNormals;
    float dist;
    vec4 trap;
    material material;
};

struct hit {
    vec3 point;
    vec3 normal;

    float steps;
    float dist;
    float volumeSteps;
    float last;

    entity entity;
};

//
// Description : Array and textureless GLSL 2D/3D/4D simplex 
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
// 

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float hash(vec2 p) {
     return fract(sin(1.0 + dot(p, vec2(127.1, 311.7))) * 43758.545);
}

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
     return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) { 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = mod289(i); 
    vec4 p = permute( permute( permute( 
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
    //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

//https://computergraphics.stackexchange.com/questions/4686/advice-on-how-to-create-glsl-2d-soft-smoke-cloud-shader
float fbm3D(vec3 P, float frequency, float lacunarity, int octaves, float addition)
{
    float t = 0.0;
    float amplitude = 1.0;
    float amplitudeSum = 0.0;
    float frequency1 = frequency;
    for(int k = 0; k < octaves; k++)
    {
        t += min(snoise(P * frequency1) + addition, 1.0) * amplitude;
        amplitudeSum += amplitude;
        amplitude *= 0.5;
        frequency1 *= lacunarity;
    }
    return t / amplitudeSum;
}

//Source http://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}

float opSmoothUnion(float d1, float d2) {
    return opSmoothUnion(d1, d2, 0.0);
}

float opSmoothSubtraction(float d1, float d2, float k) {
    float h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
    return mix(d2, -d1, h) + k * h * (1.0 - h);
}

float opSmoothSubtraction(float d1, float d2) {
    return opSmoothSubtraction(d1, d2, 0.0);
}

float opSmoothIntersection(float d1, float d2, float k) {
    float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0 );
    return mix(d2, d1, h) + k * h * (1.0 - h);
}

float opSmoothIntersection(float d1, float d2) {
    return opSmoothIntersection(d1, d2, 0.0);
}

entity opSmoothUnion(entity m1, entity m2, float k, float threshold) {
    float h = opSmoothUnion(m1.dist, m2.dist, k);
    if (smoothstep(m1.dist, m2.dist, h + threshold) > 0.5) {
        m2.dist = h;
        return m2;
    }
    else {
        m1.dist = h;
        return m1;
    }
}

entity opSmoothSubtraction(entity m1, entity m2, float k, float threshold) {
    float h = opSmoothSubtraction(m1.dist, m2.dist, k);
    if (smoothstep(m1.dist, m2.dist, h + threshold) > 0.5) {
        m2.dist = h;
        return m2;
    }
    else {
        m1.dist = h;
        return m1;
    }
}

entity opSmoothIntersection(entity m1, entity m2, float k, float threshold) {
    float h = opSmoothIntersection(m1.dist, m2.dist, k);
    if (smoothstep(m1.dist, m2.dist, h + threshold) > 0.5) {
        m2.dist = h;
        return m2;
    }
    else {
        m1.dist = h;
        return m1;
    }
}

vec3 opTwist(vec3 p, float angle)
{
    float c = cos(angle * p.y);
    float s = sin(angle * p.y);
    mat2 m = mat2(c, -s, s, c);
    vec3 q = vec3(m * p.xz, p.y);
    return q;
}

vec3 opBend(vec3 p, float angle)
{
    float c = cos(angle * p.y);
    float s = sin(angle * p.y);
    mat2 m = mat2(c, -s, s, c);
    vec3 q = vec3(m * p.xy, p.z);
    return q;
}

vec3 opElongate(vec3 p, vec3 h)
{
    return p - clamp(p, -h, h);
}

float opRound(float p, float rad)
{
    return p - rad;
}

//Distance functions to creat primitives to 3D world
//Source http://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
float sdPlane(vec3 p, vec3 n, float h)
{
    return dot(p, n) + h;
}

float sdSphere(vec3 p, float radius)
{
    return length(p) - radius;
}

float sdEllipsoid(vec3 p, vec3 r)
{
    float k0 = length(p / r);
    float k1 = length(p / (r * r));
    return k0 * (k0 - 1.0) / k1;
}

float sdBox(vec3 p, vec3 b, float r)
{   
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0)) - r;
}

float sdTorus(vec3 p, vec2 t)
{   
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

float sdCylinder(vec3 p, vec3 c, float r)
{
    return length(p.xz - c.xy) - c.z - r;
}

float sdCappedCylinder(vec3 p, vec2 size, float r)
{
    vec2 d = abs(vec2(length(p.xz), p.y)) - size;
    return min(max(d.x ,d.y), 0.0) + length(max(d, 0.0)) - r;
}

float sdRoundCone(in vec3 p, in float r1, float r2, float h)
{    
    vec2 q = vec2(length(p.xz), p.y);
    
    float b = (r1 - r2) / h;
    float a = sqrt(1.0 - b * b);
    float k = dot(q, vec2(-b, a));
    
    if(k < 0.0) return length(q) - r1;
    if(k > a * h) return length(q - vec2(0.0, h)) - r2;
        
    return dot(q, vec2(a,b)) - r1;
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r)
{   
    vec3 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

float sdHexagon(vec3 p, vec2 h, float r)
{
    vec3 q = abs(p);
    return max(q.z - h.y, max((q.x * 0.866025 + q.y * 0.5), q.y) - h.x) - r;
}

float sdPyramid(vec3 p, float h)
{
    float m2 = h * h + 0.25;

    p.xz = abs(p.xz);
    p.xz = (p.z > p.x) ? p.zx : p.xz;
    p.xz -= 0.5;

    vec3 q = vec3(p.z, h * p.y - 0.5 * p.x, h * p.x + 0.5 * p.y);

    float s = max(-q.x, 0.0);
    float t = clamp((q.y - 0.5 * p.z) / (m2 + 0.25), 0.0, 1.0);

    float a = m2 * (q.x + s) * (q.x + s) + q.y * q.y;
    float b = m2 * (q.x + 0.5 * t) * (q.x + 0.5 * t) + (q.y - m2 * t) * (q.y - m2 * t);

    float d2 = min(q.y, -q.x * m2 - q.y * 0.5) > 0.0 ? 0.0 : min(a,b);

    return sqrt((d2 + q.z * q.z) / m2) * sign(max(q.z, -p.y));
}

float sdOctahedron(vec3 p, float s)
{
    p = abs(p);
    float m = p.x + p.y + p.z - s;
    vec3 q;
    if(3.0 * p.x < m ) q = p.xyz;
    else if(3.0 * p.y < m ) q = p.yzx;
    else if(3.0 * p.z < m ) q = p.zxy;
    else return m*0.57735027;

    float k = clamp(0.5 * (q.z - q.y + s), 0.0, s); 
    return length(vec3(q.x, q.y - s + k, q.z - k)); 
}

float sdMandlebulb(vec3 p, vec3 pos, float pwr, float dis, float bail, int it) {
    vec3 z = p + pos;
 
    float dr = 1.0;
    float r = 0.0;
    float power = pwr + dis;
    for (int i = 0; i < it; i++) {
        r = length(z);
        if (r > bail) break;
        
        // convert to polar coordinates
        float theta = acos(z.z/r);
        float phi = atan(z.y,z.x);
        dr =  pow(r, power - 1.0) * power * dr + 1.0;
        
        // scale and rotate the point
        float zr = pow(r, power);
        theta = theta*power;
        phi = phi*power;
        
        // convert back to cartesian coordinates
        z = zr * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
        
        z += (p + pos);
    }
    return (0.5 * log(r) * r / dr);
}

float sdGyroid(vec3 p, float t, float b)
{
    return abs(dot(sin(p), cos(p.zxy)) - b) - t;
}

float sdMenger(vec3 p)
{
    float sz = 1.0;
    float d = sdBox(p, vec3(sz), 0.0);

    float s = 1.0;
    for(int i = 0; i < 3; i++)
    {
        
        vec3 a = mod(p * s, 2.0) - sz;
        s *= 3.0;
        vec3 p1 = sz - 3.0 * abs(a);

        float da = sdBox(p1.xyz, vec3(sz * 2.0, sz, sz), 0.0);
        float db = sdBox(p1.yzx, vec3(sz, sz * 2.0, sz), 0.0);
        float dc = sdBox(p1.zxy, vec3(sz, sz, sz * 2.0), 0.0);
        float c = min(da, min(db, dc)) / s;
        d = max(d, c);
    }

    return d;
}

float sdJulian(vec3 p, out vec4 oTrap, vec4 c)
{
    vec4 z = vec4(p, 0.0);
    float md2 = 1.0;
    float mz2 = dot(z, z);

    vec4 trap = vec4(abs(z.xyz), dot(z, z));

    float n = 1.0;
    for(int i = 0; i < 12; i++)
    {
        // dz -> 2·z·dz, meaning |dz| -> 2·|z|·|dz|
        // Now we take the 2.0 out of the loop and do it at the end with an exp2
        md2 *= 4.0 * mz2;
        z = vec4(z.x * z.x - z.y * z.y - z.z * z.z - z.w * z.w,
                 2.0 * z.x * z.y,
                 2.0 * z.x * z.z,
                 2.0 * z.x * z.w ) + c;  

        trap = min(trap, vec4(abs(z.xyz), dot(z, z)));

        mz2 = dot(z, z);
        if(mz2 > 14.0) break;
        n += 1.0;
    }
    
    oTrap = trap;

    return 0.25 * sqrt(mz2 / md2) * log(mz2); 
}

float displacement(vec3 p, vec3 m)
{
    return sin(m.x * p.x) * sin(m.y * p.y) * sin(m.z * p.z);
}

float impulse(float x, float k)
{
    float h = k * x;
    return h * exp(1.0 - h);
}

float sinc(float x, float k)
{
    float a = PI * k * x - 1.0;
    return sin(a) / a;
}

vec3 rotX(vec3 p, float a)
{
    float s = sin(a);
    float c = cos(a);
    return vec3(
        p.x,
        c*p.y-s*p.z,
        s*p.y+c*p.z
    );
}

vec3 rotY(vec3 p, float a)
{
    float s = sin(a);
    float c = cos(a);
    return vec3(
        c*p.x+s*p.z,
        p.y,
        -s*p.x+c*p.z
    );
}
 
vec3 rotZ(vec3 p, float a)
{
    float s = sin(a);
    float c = cos(a);
    return vec3(
        c*p.x-s*p.y,
        s*p.x+c*p.y,
        p.z
    );
}

vec3 rot(vec3 p, vec3 a) {
    return rotX(rotY(rotZ(p, a.z), a.y), a.x);
}

vec3 twistX(vec3 p, float angle) {
    return rotX(p, p.x * angle);
}

vec3 twistY(vec3 p, float angle) {
    return rotY(p, p.y * angle);
}

vec3 twistZ(vec3 p, float angle) {
    return rotZ(p, p.z * angle);
}

vec3 translate(vec3 p, vec3 p1) {
    return p + (p1 * -1.0);
}

vec3 scale(vec3 p, float s) {
    vec3 p1 = p;
    p1 /= s;
    return p1;
} 

vec3Tuple repeat(vec3 p, vec3 size) {
    vec3 c = floor((p + size * 0.5 ) / size);
    vec3 path1 = mod(p + size * 0.5, size) - size * 0.5;
    return vec3Tuple(path1, c);
}

vec3Tuple repeatLimit(vec3 p, float c, vec3 size) {
    vec3 c1 = floor((p + size * 0.5 ) / size);
    vec3 path1 = p - c * clamp(round(p / c), -size, size);
    return vec3Tuple(path1, c1);
}

vec2Tuple repeatPolar(vec2 p, float repetitions) {
	float angle = 2.0 * PI / repetitions;
	float a = atan(p.y, p.x) + angle / 2.0;
	float r = length(p);
	float c = floor(a / angle);
	a = mod(a, angle) - angle / 2.0;
	vec2 path = vec2(cos(a), sin(a)) * r;
	// For an odd number of repetitions, fix cell index of the cell in -x direction
	// (cell index would be e.g. -5 and 5 in the two halves of the cell):
	if (abs(c) >= (repetitions / 2.0)) {
        c = abs(c);
    } 
	return vec2Tuple(path, vec2(c));
}

entity opUnion(entity m1, entity m2) {
    return m1.dist < m2.dist ? m1 : m2;
}

entity opSubtraction(entity m1, entity m2) {
    if(-m1.dist > m2.dist) {
        m1.dist *= -1.0;
        return m1;
    }
    else {
        return m2;
    }
    
}

entity opIntersection(entity m1, entity m2) {
    return m1.dist > m2.dist ? m1 : m2;
}

vec3 planeFold(vec3 z, vec3 n, float d) {
    vec3 z1 = z;
	z1 -= 2.0 * min(0.0, dot(z1, n) - d) * n;
    return z1;
}

vec3 absFold(vec3 z, vec3 c) {
    vec3 z1 = z;
	z1.xyz = abs(z1.xyz - c) + c;
    return z1;
}

vec3 sierpinskiFold(vec3 z) {
    vec3 z1 = z;
	z1.xy -= min(z1.x + z1.y, 0.0);
	z1.xz -= min(z1.x + z1.z, 0.0);
	z1.yz -= min(z1.y + z1.z, 0.0);
    return z1;
}

vec3 mengerFold(vec3 z) {
    vec3 z1 = z;
	float a = min(z1.x - z1.y, 0.0);
	z1.x -= a;
	z1.y += a;
	a = min(z1.x - z1.z, 0.0);
	z1.x -= a;
	z1.z += a;
	a = min(z1.y - z1.z, 0.0);
	z1.y -= a;
	z1.z += a;
    return z1;
}

vec3 sphereFold(vec3 z, float minR, float maxR) {
    vec3 z1 = z;
    /*
	float r = length(z1);
    if(r < minR) {
        z1 *= minR * minR / (r * r);
    }
    //return z1 * maxR;
    */
    /*
    float r2 = dot(z1.xyz, z1.xyz);
    if(r2 != 0) {
	    z1 *= max(maxR / max(minR, r2), 1.0);
    }
    return z1;
    */
    float zDot = dot(z1, z1);
    if(zDot < minR) {
        z1 *= maxR / minR;
    }
    else if(zDot < maxR) {
        z1 *= maxR / zDot;
    }
    return z1;
    
}

vec3 boxFold(vec3 z, vec3 r) {
    vec3 z1 = z;
	z1.xyz = clamp(z1, -r, r) * 2.0 - z1;
    return z1;
}

entity mCustom(vec3 path, float dist, material material)
{
    entity m;
    m.dist = dist;
    m.point = path;
    m.material = material;
    return m;
}

entity mPlane(vec3 path, vec3 n, float h, float scale, material material)
{
    entity m;
    vec3 p1 = path / scale;
    m.dist = sdPlane(p1, n, h) * scale;
    m.point = p1;
    m.material = material;
    return m;
}

entity mSphere(vec3 path, float radius, float scale, material material) {
    entity m;
    vec3 p1 = path / scale;
    m.dist = sdSphere(p1, radius) * scale;
    m.point = p1;
    m.material = material;
    return m;
}

entity mBox(vec3 path, vec3 size, float r, float scale, material material) {
    entity m;
    vec3 p1 = path / scale;
    m.dist = sdBox(p1, size, r) * scale;
    m.point = p1;
    m.material = material;
    return m;
}

entity mTorus(vec3 path, vec2 dim, float scale, material material) {
    entity m;
    vec3 p1 = path / scale;
    m.dist = sdTorus(p1, dim) * scale;
    m.point = p1;
    m.material = material;
    return m;
}

entity mCylinder(vec3 path, vec3 size, float r, float scale, material material) {
    entity m;
    vec3 p1 = path / scale;
    m.dist = sdCylinder(p1, size, r) * scale;
    m.point = p1;
    m.material = material;
    return m;
}

entity mCappedCylinder(vec3 path, vec2 size, float r, float scale, material material)
{
    entity m;
    vec3 p1 = path / scale;
    m.dist = sdCappedCylinder(p1, size, r) * scale;
    m.point = p1;
    m.material = material;
    return m;
}

entity mHexagon(vec3 path, vec2 size, float r, float scale, material material)
{
    entity m;
    vec3 p1 = path / scale;
    m.dist = sdHexagon(p1, size, r) * scale;
    m.point = p1;
    m.material = material;
    m.needNormals = true;
    return m;
}

entity mPyramid(vec3 path, float height, float scale, material material)
{
    entity m;
    vec3 p1 = path / scale;
    m.dist = sdPyramid(p1, height) * scale;
    m.point = p1;
    m.material = material;
    return m;
}

entity mOctahedron(vec3 path, float height, float scale, material material)
{
    entity m;
    vec3 p1 = path / scale;
    m.dist = sdOctahedron(p1, height) * scale;
    m.point = p1;
    m.material = material;
    return m;
}

entity mGyroid(vec3 path, float scale, float thickness, float bias, material material)
{
    entity m;
    vec3 p1 = path / scale;
    m.dist = sdGyroid(p1, thickness, bias) * scale;
    m.point = p1;
    m.material = material;
    return m;
}

entity mMenger(vec3 path, float scale, material material)
{
    entity m;
    vec3 p1 = path / scale;
    m.dist = sdMenger(p1) * scale;
    m.point = p1;
    m.material = material;
    return m;
}

entity mJulian(vec3 path, vec4 c, float scale, material material)
{
    entity m;
    vec4 trap;
    vec3 p1 = path / scale;
    m.dist = sdJulian(p1, trap, c) * scale;
    m.point = p1;
    m.material = material;
    m.trap = trap;
    return m;
}

entity mFractal(vec3 path, int iter, material material) {
    vec3 p1 = path;
    //Skaalaus voisi olla tarpeen tässäkin
    /*
    vec3 offset = z;
	float dr = 1.0;
	for (int n = 0; n < Iterations; n++) {
		boxFold(z,dr);       // Reflect
		sphereFold(z,dr);    // Sphere Inversion
 		
                z=Scale*z + offset;  // Scale & Translate
                dr = dr*abs(Scale)+1.0;
	}
	float r = length(z);
	return r/abs(dr);
    */
   
    iter = 3;
    for(int i = 1; i <= iter; i++) {
        //p1 = rotX(p1, 0.25);
        //p1 = rotY(p1, 0.05);
        //p1 = rotZ(p1, 1.2);
        //p1 = boxFold(p1, vec3(0.0, 0.0, 0.0));
     
       
        //p1 = sierpinskiFold(p1);
        //p1 = sphereFold(p1, 15.0, 35.0);
        //p1 = mengerFold(p1);
        //p1 = absFold(p1, vec3(0.0, 1.5, 0.0));
  
       // p1 = planeFold(p1, normalize(vec3(0.0, 1.0, 0.0)), 0.0);
         
        p1 = boxFold(p1, vec3(2.0, 2.0, 2.0));

        p1 = rotX(p1, PI * 0.25);
        p1 = rotY(p1, PI * 0.2);
         p1 = rotZ(p1, PI * 0.1);
        p1 = translate(p1, vec3(0.0, .0, 0.0));
        
       
   
    }
     //Huom tässä voi olla joku monimutkaisempikin muoto
    entity m = mBox(
        p1, 
        vec3(5.0, 1.0, 1.0),
        0.1,
        1.0,
        material
    );
    
    entity box = mBox(
        path,
        vec3(8.0),
        0.0,
        1.0,
        material
    );
    entity comp = opIntersection(box, m);
    //comp.dist += sin(path.z * 0.1) * 3.0;
    return m;
}

entity mRealFractal(vec3 point, vec3 size, int iter, float scale, material material) {
    vec3 p = point.xzy * scale;
	for(int i = 0; i < iter; i++)
	{
		p = 2.0 * clamp(p, -size, size) - p;
		float r1 = dot(p, p);
        float r2 = dot(p, p + sin(p.z * .1)); //Alternate fractal
		float r = r2;
        float k = max((2.0 / r), .027);
		p *= k;
		scale *= k;
	}

	float l = length(p.xy);
	float rxy = l - 4.0;
	float n = l * p.z;
	rxy = max(rxy, -(n) / 4.0) / abs(scale);
    entity e = mCustom(p, rxy, material);
	return e;
}

entity mHexagonFloor(vec3 path)
{
    material m1 = material(
        ambientOptions(
            vec3(0.2, 0.5, 0.5),
            0.5
        ),
        diffuseOptions(
            vec3(0.5, 0.5, 0.5),
            0.1
        ),
        specularOptions(
            vec3(1.0, 1.0, 1.0),
            0.0,
            0.0
        ),
        shadowOptions(
            false,
            0.4,
            0.5,
            10.0
        ),
        aoOptions(
            false,
            0.3,
            15.0
        ),
        textureOptions(
            0,
            vec3(1.0, 1.0, 1.0),
            vec3(0.0, 0.0, 0.0),
            vec3(5.0, 5.0, 5.0),
            false
        )
    );
    vec3 size = vec3(2.5, 2.5, 0.0);
    vec3Tuple r = repeat(path, size);
    vec3 pos = r.first;
    if(mod(r.second.y, 2) == 0)
    {
        pos = translate(pos, vec3(0.00, 0.0, 0.00));
    }
    else {
        pos = translate(pos, vec3(0.0, 0.0, 0.0));
    }
    entity rh = mHexagon(
        pos,
        vec2(1.0, 1.0),
        0.0,
        1.0,
        m1
    );
    rh.dist *= 0.5;
    return rh;
}

entity mHoleSphere(vec3 path, float scale)
{
    path /= scale;
    material m1 = material(
        ambientOptions(
            vec3(0.2, 0.5, 0.2),
            0.5
        ),
        diffuseOptions(
            vec3(0.2, 0.5, 0.2),
            0.34
        ),
        specularOptions(
            vec3(1.0, 1.0, 1.0),
            10.0,
            15.0
        ),
        shadowOptions(
            false,
            0.4,
            0.5,
            10.0
        ),
        aoOptions(
            true,
            0.3,
            15.0
        ),
        textureOptions(
            0,
            vec3(1.0, 1.0, 1.0),
            vec3(0.0, 0.0, 0.0),
            vec3(5.0, 5.0, 5.0),
            false
        )
    );

    vec2 hSize = vec2(1.0, 5.0);
    float hSmooth = 0.0;
    float h1 = sdHexagon(
        path,
        hSize,
        hSmooth
    );

    float h2 = sdHexagon(
        rotY(path, PI * 0.5),
        hSize,
        hSmooth
    );

    float h3 = sdHexagon(
        rotY(path, PI * 0.25),
        hSize,
        hSmooth
    );

    float h4 = sdHexagon(
        rotY(path, PI * 0.75),
        hSize,
        hSmooth
    );

    float h5 = sdHexagon(
        rotX(path, PI * 0.5),
        hSize,
        hSmooth
    );

    float h6 = sdHexagon(
        rotX(path, PI * 0.25),
        hSize,
        hSmooth
    );

    float h7 = sdHexagon(
        rotX(path, PI * 0.75),
        hSize,
        hSmooth
    );

    float h8 = sdHexagon(
        rotY(rotZ(path, PI * 0.75), PI * 0.5),
        hSize,
        hSmooth
    );

    float h9 = sdHexagon(
        rotY(rotZ(path, PI * 0.25), PI * 0.5),
        hSize,
        hSmooth
    );

    float hs = 
        opSmoothUnion(h1,
            opSmoothUnion(h2,
                opSmoothUnion(h3, 
                    opSmoothUnion(h4,
                        opSmoothUnion(h5, 
                            opSmoothUnion(h6,
                                opSmoothUnion(h7,
                                    opSmoothUnion(h8, h9)
                                )
                            )
                        )
                    )
                )
            )
        );
    
    float s1 = sdSphere(
        path,
        4.0
    );

    float s2 = sdSphere(
        path,
        3.8
    );

    float ss = opSmoothSubtraction(s2, s1, 0.0);
    float completeDist = opSmoothSubtraction(hs, ss, 0.0);
    entity complete = mCustom(
        path,
        completeDist * scale,
        m1
    );
    complete.needNormals = true;

    return complete;
}

entity scene(vec3 path, vec2 uv)
{       
    switch(int(act)) {
        case 1: {
            material mb1 = material(
                ambientOptions(
                    vec3(0.2, 0.7, 0.5),
                    0.5
                ),
                diffuseOptions(
                    vec3(0.5, 0.5, 0.5),
                    0.1
                ),
                specularOptions(
                    vec3(1.0, 1.0, 1.0),
                    0.0,
                    0.0
                ),
                shadowOptions(
                    true,
                    0.4,
                    0.5,
                    10.0
                ),
                aoOptions(
                    false,
                    0.0,
                    0.0
                ),
                textureOptions(
                    0,
                    vec3(1.0, 1.0, 1.0),
                    vec3(0.0, 0.0, 0.0),
                    vec3(5.0, 5.0, 5.0),
                    false
                )
            );
            material ms1 = material(
                ambientOptions(
                    vec3(0.0, 0.3, 0.8),
                    1.0
                ),
                diffuseOptions(
                    vec3(0.5, 0.5, 0.5),
                    0.0
                ),
                specularOptions(
                    vec3(0.5, 0.5, 0.5),
                    1.0,
                    100.0
                ),
                shadowOptions(
                    false,
                    0.5,
                    0.10,
                    0.10
                ),
                aoOptions(
                    true,
                    15.0,
                    0.5
                ),
                textureOptions(
                    0,
                    vec3(1.0, 1.0, 1.0),
                    vec3(0.0, 0.0, 0.0),
                    vec3(5.0, 5.0, 5.0),
                    false
                )
            );
            
            //path.y += (sin(path.x * 1.4) * 0.7);
            vec3 p1 = rotX(rotY(path, time / 3.0), time / 4.0);
            //path.y *= (sin(path.x * 0.8) * 0.4);
            float scale = .5;
            entity fr = mRealFractal(
                path / scale, 
                vec3(1.45, 0.65, 1.22),
                10,
                1.0,
                ms1
            );
            fr.dist *= scale;
            fr.needNormals = true;
            return fr;
        }
        case 2: { 
            material mm1 = material(
                ambientOptions(
                    vec3(1.0, 1.0, 1.0),
                    0.3
                ),
                diffuseOptions(
                    vec3(230.0 / 255.0, 249.0 / 255.0, 175.0 / 255.0),
                    0.8
                ),
                specularOptions(
                    vec3(13.0 / 255.0, 6.0 / 255.0, 48.0 / 255.0),
                    10.0,
                    10.0
                ),
                shadowOptions(
                    false,
                    0.1,
                    10.0,
                    0.0
                ),
                aoOptions(
                    false,
                    0.1,
                    2.0
                ),
                textureOptions(
                    0,
                    vec3(230.0 / 255.0, 249.0 / 255.0, 175.0 / 255.0),
                    vec3(0.0, 0.0, 0.0),
                    vec3(5.0, 5.0, 5.0),
                    false
                )
            );

        
            vec3 p1 = rotZ(rotX(path, time3), time3);
            //p1 = path;
            p1 = opTwist(p1, 0.07);
            p1.xz += sin(p1.yy * 0.45) * 2.5;
                       
            float fbm1 = fbm3D(
                path,
                0.2,
                0.0,
                1,
                0.0
            );
            //p1 += fbm1;

            entity julian = mJulian(
                p1,
                //0.45 * cos(vec4(0.5, 3.9, 1.4, 1.1) + time2 * vec4(1.2, 1.7, 1.3, 2.5)) - vec4(0.3, 0.0, 0.0, 0.0),
                0.36 *
                cos(vec4(0.9, 3.9, 1.4, 1.1) +
                14 * 2200 *
                //time2 * 
                vec4(1.2, 1.7, 1.3, 2.5)) - 
                vec4(0.35, 0.0, 0.0, 0.0),

                18.0,
                mm1
            );
            //julian.dist -= fbm1;
            //julian.dist *= 0.2;
            julian.needNormals = true;
            return julian;

            vec3 p2 = rotX(rotY(path, time2), time3);
            float fbm2 = fbm3D(
                p2.xyz,
                0.4,
                0.9,
                1,
                0.0
            );
            p2 += fbm2;

            entity box = mBox(
                p2,
                vec3(1.0, 100.0, 1.0),
                0.0, 
                5.0,
                mm1
            );
            box.dist += fbm1;
            box.dist *= 0.5;
            box.needNormals = true;


            entity fr = mFractal(
                rotY(p1, 1.0),
                5,
                mm1
            );
            fr.needNormals = true;
            return julian;
        }
        case 3: {            
            material mm1 = material(
                ambientOptions(
                    vec3(0.60, 0.06, 0.82),
                    0.2
                ),
                diffuseOptions(
                    vec3(0.60 / 2.0, 0.06 / 2.0, 0.82 / 2.0),
                    2.5
                ),
                specularOptions(
                    //vec3(0.60 / 1.0, 0.06 / 1.0, 0.82 / 1.0),
                    vec3(0.5),
                    1.0,
                    10.0
                ),
                shadowOptions(
                    false,
                    0.1,
                    0.2,
                    2.0
                ),
                aoOptions(
                    true,
                    0.3,
                    5.0
                ),
                textureOptions(
                    0,
                    vec3(1.0, 1.0, 1.0),
                    vec3(0.0, 0.0, 0.0),
                    vec3(5.0, 5.0, 5.0),
                    false
                )
            );

        
            vec3 p1 = rotZ(rotX(path, time5), time4);
            p1 = opTwist(p1, 0.02);
            p1.y += sin(p1.z * 0.5) * 1.5;
                       
            float fbm1 = fbm3D(
                p1,
                0.3,
                2.1,
                1,
                0.0
            );
            p1 += fbm1;

            entity box = mBox(
                p1,
                vec3(10.0, 10.0, 10.0),
                0.0, 
                1.0,
                mm1
            );

            //box.dist *= 0.5;
            box.needNormals = true;
            entity sphere = mSphere(
                p1,
                30.0,
                1.0,
                mm1
            );

            sphere.dist *= 0.35;
            sphere.needNormals = true;
            return sphere;
        }
        case 4: { 
            material mm1 = material(
                ambientOptions(
                    vec3(0.60, 0.06, 0.82),
                    0.5
                ),
                diffuseOptions(
                    vec3(0.60 / 2.0, 0.06 / 2.0, 0.82 / 2.0),
                    2.5
                ),
                specularOptions(
                    vec3(0.60 / 1.0, 0.06 / 1.0, 0.82 / 1.0),
                    //vec3(0.5),
                    20.0,
                    5.0
                ),
                shadowOptions(
                    false,
                    0.2,
                    1.9,
                    2.0
                ),
                aoOptions(
                    false,
                    0.3,
                    5.0
                ),
                textureOptions(
                    0,
                    vec3(1.0, 1.0, 1.0),
                    vec3(0.0, 0.0, 0.0),
                    vec3(5.0, 5.0, 5.0),
                    false
                )
            );
 
            vec3 path1 = path;
            float time1 = time / 2.0;
            path1 = rotY(path1, cos(path1.y * .12 + time1) * sin(path1.y * .025 + time1) * 2.0);
            float disp2 = cos((path1.y * 0.23) + (time1 * 3.6));
            float disp1 = sin((path1.y * 0.1) + (time1 * 5.0));
            path1 = translate(path1, vec3(disp1 * disp2 * 3.0, 0.0, 0.0));
            entity box1 = mBox(
                path1,
                vec3(1.0, 100.0, 1.0),
                0.2, 
                3.0,
                mm1
            );
    
            //box1.dist *= 0.5;
            box1.needNormals = true;

            vec3 p2 = rotX(path1, cos(path1.x * .17 + time) * sin(path1.x * .23 + time));
            entity box2 = mBox(
                p2,
                vec3(100.0, 1.0, 1.0),
                0.2, 
                3.0,
                mm1
            );
    
            box1.dist *= 0.5;
            box2.needNormals = true;
            return box1;
            return opSmoothUnion(box1, box2, 2.5, 0.5);
        }
        case 5: { 
            material mm1 = material(
                ambientOptions(
                    vec3(0.60, 0.06, 0.82),
                    0.5
                ),
                diffuseOptions(
                    vec3(0.60 / 2.0, 0.06 / 2.0, 0.82 / 2.0),
                    2.5
                ),
                specularOptions(
                    vec3(0.60 / 1.0, 0.06 / 1.0, 0.82 / 1.0),
                    //vec3(0.5),
                    20.0,
                    5.0
                ),
                shadowOptions(
                    false,
                    0.2,
                    1.9,
                    2.0
                ),
                aoOptions(
                    false,
                    0.3,
                    5.0
                ),
                textureOptions(
                    0,
                    vec3(1.0, 1.0, 1.0),
                    vec3(0.0, 0.0, 0.0),
                    vec3(5.0, 5.0, 5.0),
                    false
                )
            );

            vec3Tuple pathTuple = repeatLimit(path, 1.25, vec3(50.0, 50.0, 50.0));
            entity boxes = mBox(
                pathTuple.first,
                vec3(1.0, 1.0, 1.0),
                0.1, 
                0.50,
                mm1
            );
    
            //boxes.dist *= 0.5;
            boxes.needNormals = true;

            vec3 path1 = rotX(rotY(rotZ(path, time4), time3), time2);
            entity julian = mJulian(
                path1,
                //0.45 * cos(vec4(0.5, 3.9, 1.4, 1.1) + time2 * vec4(1.2, 1.7, 1.3, 2.5)) - vec4(0.3, 0.0, 0.0, 0.0),
                0.36 *
                cos(vec4(0.9, 3.9, 1.4, 1.1) +
                14 * 2200 *
                //time2 * 
                vec4(1.2, 1.7, 1.3, 2.5)) - 
                vec4(0.35, 0.0, 0.0, 0.0),

                18.0,
                mm1
            );
   
            //julian.dist *= 0.5;
            julian.needNormals = true;
            
            return opIntersection(boxes, julian);    
        }
    }
} 

hit raymarch(vec3 rayOrigin, vec3 rayDirection, vec2 uv) {
    hit h;
    h.steps = 0.0;
    h.last = 100.0;
    for(float i = 0.0; i <= RAY_MAX_STEPS; i++) {
        h.point = rayOrigin + rayDirection * h.dist * 1.0;
        h.entity = scene(h.point, uv);
        h.steps += 1.0;
        //ABS?
        h.entity.dist = h.entity.dist;
        h.last = min(h.entity.dist, h.last);
        h.dist += h.entity.dist;
        if(h.entity.dist < RAY_THRESHOLD) {
            if(h.entity.needNormals == true) {
                vec2 eps = vec2(0.01, 0.0);
                h.normal = normalize(h.entity.dist - vec3(
                    scene(h.point - eps.xyy, uv).dist,
                    scene(h.point - eps.yxy, uv).dist,
                    scene(h.point - eps.yyx, uv).dist
                ));
            }
            break;

        }
        if(h.dist > RAY_MAX_DISTANCE) {
            break;
        }
    }
    
    return h;
}

float shadows(vec3 ro, vec3 lp, float mint, float maxt, float k) {
    float res = 1.0;
    float ph = 1e20;
    vec3 rd = normalize(ro - lp);
    for(float t = mint; t < maxt;)
    {
        float h = scene(ro + (rd * t), vec2(0)).dist;
        if(abs(h) < 0.001)
            return 0.0;
        float y = h * h / (2.0 * ph);
        float d = sqrt(h * h - y * y);
        res = min(res, k * d / max(0.0, t - y));
  
        ph = h;
        t += h;    
    }
    return res;
}

vec4 textureCube(sampler2D sam, in vec3 p, in vec3 n)
{
	vec4 x = texture(sam, p.yz);
	vec4 y = texture(sam, p.zx);
	vec4 z = texture(sam, p.yx);
    vec3 a = abs(n);
	return (x*a.x + y*a.y + z*a.z) / (a.x + a.y + a.z);
}

vec2 planarMapping(vec3 p) {
    vec3 p1 = normalize(p);
    vec2 r = vec2(0.0);
    if(abs(p1.x) == 1.0) {
        r = vec2((p1.z + 1.0) / 2.0, (p1.y + 1.0) / 2.0);
    }
    else if(abs(p1.y) == 1.0) {
        r = vec2((p1.x + 1.0) / 2.0, (p1.z + 1.0) / 2.0);
    }
    else {
        r = vec2((p1.x + 1.0) / 2.0, (p1.y + 1.0) / 2.0);
    }
    return r;
}

vec2 cylindiricalMapping(vec3 p) {
    return vec2(atan(p.y / p.x), p.z);
}

vec2 scaledMapping(vec2 t, vec2 o, vec2 s) {
    return -vec2((t.x / o.x) + s.x, (t.y / o.y) + s.y);
}

float noise(float v, float amplitude, float frequency, float time) {
    float r = sin(v * frequency);
    float t = 0.01*(-time*130.0);
    r += sin(v*frequency*2.1 + t)*4.5;
    r += sin(v*frequency*1.72 + t*1.121)*4.0;
    r += sin(v*frequency*2.221 + t*0.437)*5.0;
    r += sin(v*frequency*3.1122+ t*4.269)*2.5;
    r *= amplitude*0.06;
    
    return r;
}

float plot(float pct, float thickness, vec2 position) {
    return smoothstep(pct - thickness, pct, position.x) - smoothstep(pct, pct + thickness, position.x);
}

vec3 background(vec2 uv) {
	vec3 r1 = mix(vec3(1.0, 1.0, 0.0), vec3(0.26, 0.80, 0.96), (uv.y + 1.0)) * plot(0.4, 1.5, uv.yx);
	vec3 r2 = mix(vec3(1.0, 0.0, 0.0), vec3(0.97, 0.65, 0.26), (uv.y + 1.0)) * plot(0.0, 1.5, uv.yx * 1.4);
	return vec3(r1 + r2);
}

vec3 hsv2rgb(vec3 c)
{
    vec3 rgb = clamp( abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0 );
    rgb = rgb*rgb*(3.0-2.0*rgb);
    return c.z * mix( vec3(1.0), rgb, c.y);
}

vec3 rainbow(vec3 position) {
    float d = length(position);
	//vec3 color = hsv2rgb(vec3(time * 0.005 * position.x ,0.25+sin(time+position.x)*0.5+0.5,d));
    vec3 color = hsv2rgb(vec3(time * 1.3 + position.z , 1.8, 1.4));
    return color;
}

vec3 dunno(vec3 position) {
    float color = 0.0;
	color += sin( position.x * cos( time / 15.0 ) * 80.0 ) + cos( position.y * cos( time / 15.0 ) * 10.0 );
	color += sin( position.y * sin( time / 10.0 ) * 40.0 ) + cos( position.x * sin( time / 25.0 ) * 40.0 );
	color += sin( position.x * sin( time / 5.0 ) * 10.0 ) + sin( position.y * sin( time / 35.0 ) * 80.0 );
	color *= sin( time / 10.0 ) * 0.5;
    return  vec3( color, color * 0.5, sin( color + time / 3.0 ) * 0.75 );
}

vec3 ambient(ambientOptions ambientOptions) {
    return ambientOptions.color * ambientOptions.strength;
} 

vec3 diffuse(vec3 normal, vec3 hit, vec3 lightDir, diffuseOptions diffuseOptions) {
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * diffuseOptions.color * diffuseOptions.strength;
    return diffuse;
}

vec3 specular(vec3 normal, vec3 eye, vec3 hit, vec3 lightDir, specularOptions specularOptions) {
    vec3 viewDir = normalize(eye - hit);
    vec3 halfwayDir = normalize(lightDir + viewDir);

    float spec = pow(max(dot(normal, halfwayDir), 0.0), specularOptions.shininess);
    vec3 specular = spec * specularOptions.strength * specularOptions.color;
    return specular;
} 

vec3 calculateLights(vec3 normal, vec3 eye, vec3 lightPos, vec3 origin, ambientOptions ambientOptions, diffuseOptions diffuseOptions, specularOptions specularOptions) {
    vec3 lightDir = normalize(lightPos - origin);
    vec3 ambient = ambient(ambientOptions);
    vec3 diffuse = diffuse(normal, origin, lightDir, diffuseOptions);
    vec3 specular = specular(normal, eye, origin, lightDir, specularOptions);

    vec3 lights = (ambient + diffuse + specular);
    return lights;
}

vec3 calculateShadows(vec3 origin, vec3 lightPos, shadowOptions shadowOptions) {
    if(shadowOptions.enabled == false) {
        return vec3(1.0);
    }
    float res = 1.0;
    float ph = 1e20;
    vec3 lightDir = normalize(lightPos - origin);
    for(float t = shadowOptions.lowerLimit; t < shadowOptions.upperLimit;)
    {
        float h = scene(origin + (lightDir * t), vec2(0)).dist;
        if(abs(h) < 0.001)
            return vec3(0.0);
        float y = h * h / (2.0 * ph);
        float d = sqrt(h * h - y * y);
        res = min(res, shadowOptions.hardness * d / max(0.0, t - y));
  
        ph = h;
        t += h;    
    }
    return vec3(res);
}

vec3 ao(vec3 point, vec3 normal, aoOptions aoOptions) {
	float aoOut = 1.0;
	for (float i = 0.0; i < aoOptions.limit; i++) {
		aoOut -= (i * aoOptions.factor - scene(point + normal * i * aoOptions.factor, vec2(0.0)).dist) / pow(2.0, i);
	}
	return vec3(aoOut);
}

vec3 fog(vec3 original, vec3 color, float dist, float b) {
    return mix(original, color, 1.0 - exp(-dist * b));
}

vec3 generateTexture(vec3 point, textureOptions textureOptions) {
    vec3 r = textureOptions.baseColor;
    if(textureOptions.index == 1) {
        return rainbow(point);
    }
    else if(textureOptions.index == 2) {
        return dunno(point);
    }
    return r;
}

vec3 calculateNormal(in vec3 n, in entity e) {
    vec3 normal = n;
    if(e.material.texture.normalMap == true) {
        normal *= generateTexture(e.point, e.material.texture);
    }
    return normal;
}

vec3 determinePixelBaseColor(float steps, float dist, float last) {
    float smoothedSteps = 1.0 - smoothstep(0.0, RAY_MAX_STEPS, steps);
    float smoothedLast = smoothstep(0.0, RAY_THRESHOLD, last);
    //Maybe use for highlight for deep ones?
    float smoothedDist = 0.2 - smoothstep(0.0, RAY_MAX_DISTANCE, dist);
    //vec3 base = vec3(steps / RAY_MAX_STEPS);
    //vec3 base = vec3(0.1 - smoothstep(0.0, RAY_MAX_DISTANCE, dist));
    return vec3(smoothedSteps);
}

vec3 processColor(hit h, vec3 rd, vec3 eye, vec2 uv, vec3 lp)
{ 
    if(h.dist > RAY_MAX_DISTANCE) {
        return background(uv).rgb;
    }
   
    material em = h.entity.material;
    vec3 base = determinePixelBaseColor(h.steps, h.dist, h.last);
    vec3 texture = generateTexture(h.point, em.texture);
 
    texture = texture * base;
    vec3 normal = calculateNormal(h.normal, h.entity);
    vec3 lights = calculateLights(normal, eye, lp, h.point, em.ambient, em. diffuse, em.specular);
    vec3 shadows = calculateShadows(h.point, lp, em.shadow);
    vec3 result = (lights * texture) * shadows;
    //result = base;
    if(em.ao.enabled)
    {
        result *= ao(h.point, normal, em.ao);
    }
    
    result = fog(result, fogColor, h.dist, fogIntensity);
    result = pow(result, vec3(1.0 / 1.2));
   
    return vec3(result);
}

vec3 drawMarching(vec2 uv) {
    vec3 forward = normalize(cameraLookAt - cameraPosition);   
    vec3 right = normalize(vec3(forward.z, 0.0, -forward.x));
    vec3 up = normalize(cross(forward, right)); 
    
    vec3 rayDirection = normalize(forward + cameraFov * uv.x * right + cameraFov * uv.y * up);
    hit tt = raymarch(cameraPosition, rayDirection, uv);
    return processColor(tt, rayDirection, cameraPosition, uv, lightPosition); 
}

void main() {
    float aspectRatio = resolution.x / resolution.y;
    vec2 uv = (gl_FragCoord.xy / resolution.xy) * 2.0 - 1.0;
    uv.x *= aspectRatio;
    vec3 o = drawMarching(uv);
    FragColor = vec4(o, 1.0);
}