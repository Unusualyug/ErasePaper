import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ANIMATION_LENGTH = 2.52;
const CURL_BAND = 0.74;
const MAX_PIXEL_RATIO = 1.45;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, value) {
  const amount = clamp((value - edge0) / (edge1 - edge0));
  return amount * amount * (3 - 2 * amount);
}

function easeInOut(value) {
  const amount = clamp(value);
  return amount * amount * (3 - 2 * amount);
}

function curlAt(time) {
  if (time < 0.82) return 0.2 + 0.76 * easeInOut(time / 0.82);
  if (time < 1.86) return 0.96 * (1 - easeInOut((time - 0.82) / 1.04));
  return 0;
}

function makeShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createRadialGradient(64, 64, 5, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(14, 24, 54, 0.34)');
  gradient.addColorStop(0.32, 'rgba(22, 36, 73, 0.2)');
  gradient.addColorStop(0.66, 'rgba(28, 43, 84, 0.075)');
  gradient.addColorStop(1, 'rgba(38, 52, 103, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function getDimensions(camera, width, height) {
  const aspect = width / Math.max(height, 1);
  const viewHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const viewWidth = viewHeight * aspect;
  const portrait = aspect < 0.88;
  const pageRatio = portrait ? 0.7 : 1.36;
  const targetHeight = viewHeight * (portrait ? 0.66 : 0.62);
  const maxWidth = viewWidth * (portrait ? 0.82 : 0.49);
  const heightByWidth = maxWidth / pageRatio;
  const pageHeight = Math.min(targetHeight, heightByWidth);
  return { pageWidth: pageHeight * pageRatio, pageHeight, viewWidth, viewHeight };
}

const BRAND_TEXTURE_MAX_SIZE = 1024;
const BRAND_WRITE_FINISH = 1.62;
const BRAND_NAME = 'ErasePaper';
const BRAND_TAGLINE = 'Simplifying Academic Life.';

function getBrandTextureDimensions(pageRatio) {
  const ratio = Math.max(0.55, Math.min(1.55, pageRatio));
  return ratio >= 1
    ? { width: BRAND_TEXTURE_MAX_SIZE, height: Math.round(BRAND_TEXTURE_MAX_SIZE / ratio) }
    : { width: Math.round(BRAND_TEXTURE_MAX_SIZE * ratio), height: BRAND_TEXTURE_MAX_SIZE };
}

function createBrandPrint() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  let elapsed = 0;

  function drawWritingGlow(x, y, fontSize, progress) {
    if (progress <= 0.025 || progress >= 0.985) return;
    const spread = Math.max(5, fontSize * 0.12);
    const gradient = context.createLinearGradient(x - spread, 0, x + spread, 0);
    const opacity = 0.13 * (1 - progress * 0.35);
    gradient.addColorStop(0, 'rgba(83, 123, 170, 0)');
    gradient.addColorStop(0.5, `rgba(83, 123, 170, ${opacity})`);
    gradient.addColorStop(1, 'rgba(83, 123, 170, 0)');
    context.fillStyle = gradient;
    context.fillRect(x - spread, y - fontSize * 0.66, spread * 2, fontSize * 1.32);
  }

  function drawRevealedText(text, centerX, centerY, font, color, progress, size, shadow = false) {
    context.save();
    context.font = font;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    if (shadow) {
      context.shadowColor = 'rgba(17, 48, 82, 0.13)';
      context.shadowBlur = size * 0.025;
      context.shadowOffsetY = size * 0.01;
    }
    const textWidth = context.measureText(text).width;
    const left = centerX - textWidth / 2;
    context.beginPath();
    context.rect(left - 2, 0, Math.max(0, textWidth * progress + 4), canvas.height);
    context.clip();
    context.fillText(text, centerX, centerY);
    context.restore();
    drawWritingGlow(left + textWidth * progress, centerY, size, progress);
    return textWidth;
  }

  function draw(nextElapsed = elapsed) {
    elapsed = Math.max(0, nextElapsed);
    const width = canvas.width;
    const height = canvas.height;
    if (!width || !height) return;

    const stock = context.createLinearGradient(0, 0, 0, height);
    stock.addColorStop(0, '#ffffff');
    stock.addColorStop(0.58, '#fffefd');
    stock.addColorStop(1, '#f8faff');
    context.fillStyle = stock;
    context.fillRect(0, 0, width, height);

    let nameSize = Math.min(height * 0.195, width * 0.12);
    let nameFont = `600 ${nameSize}px Georgia, "Times New Roman", serif`;
    context.font = nameFont;
    const measuredName = context.measureText(BRAND_NAME).width;
    if (measuredName > width * 0.58) {
      nameSize *= (width * 0.58) / measuredName;
      nameFont = `600 ${nameSize}px Georgia, "Times New Roman", serif`;
    }

    const nameY = height * 0.455;
    const taglineSize = Math.min(nameSize * 0.42, height * 0.026);
    const taglineY = nameY + nameSize * 0.96;
    const nameProgress = smoothstep(0.24, 1.18, elapsed);
    const taglineProgress = smoothstep(0.86, 1.58, elapsed);
    drawRevealedText(BRAND_NAME, width / 2, nameY, nameFont, '#153b64', nameProgress, nameSize, true);

    let taglineFont = `500 ${taglineSize}px Inter, "Avenir Next", Arial, sans-serif`;
    context.font = taglineFont;
    if ('letterSpacing' in context) context.letterSpacing = `${taglineSize * 0.045}px`;
    let measuredTagline = context.measureText(BRAND_TAGLINE).width;
    if (measuredTagline > width * 0.58) {
      const smallerTaglineSize = taglineSize * ((width * 0.58) / measuredTagline);
      taglineFont = `500 ${smallerTaglineSize}px Inter, "Avenir Next", Arial, sans-serif`;
      context.font = taglineFont;
      measuredTagline = context.measureText(BRAND_TAGLINE).width;
    }
    drawRevealedText(
      BRAND_TAGLINE,
      width / 2,
      taglineY,
      taglineFont,
      '#536d8b',
      taglineProgress,
      taglineSize,
    );
    if ('letterSpacing' in context) context.letterSpacing = '0px';

    texture.needsUpdate = true;
  }

  function setPageAspect(pageRatio) {
    if (!Number.isFinite(pageRatio) || pageRatio <= 0) return;
    const { width, height } = getBrandTextureDimensions(pageRatio);
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    draw(elapsed);
  }

  draw(0);
  return { texture, setPageAspect, draw, dispose: () => texture.dispose() };
}

export default function PaperCurlStage({ startedAt, onCover, onError }) {
  const mountRef = useRef(null);
  const callbacksRef = useRef({ onCover, onError });
  callbacksRef.current = { onCover, onError };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    let geometry;
    let paperMaterial;
    let brandPrint;
    let shadow;
    let shadowTexture;
    let frameId = 0;
    let resizeObserver;
    let windowResizeHandler;
    let disposed = false;
    let coverCalled = false;
    let pageSize = { pageWidth: 1, pageHeight: 1, viewWidth: 1, viewHeight: 1 };

    try {
      const width = Math.max(1, mount.clientWidth || window.innerWidth);
      const height = Math.max(1, mount.clientHeight || window.innerHeight);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 80);
      camera.position.set(0, 0, 7);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: Math.min(width, height) > 520,
        powerPreference: 'low-power',
        depth: true,
        stencil: false,
        preserveDrawingBuffer: false,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setSize(width, height, false);
      renderer.domElement.className = 'paper-intro__canvas';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xeafaff, 0x56627d, 1.65));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.15);
      keyLight.position.set(-3.2, 4.5, 5.5);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xced6ff, 0.72);
      fillLight.position.set(3.8, 0.7, 3.5);
      scene.add(fillLight);

      geometry = new THREE.PlaneGeometry(1, 1, 46, 50);
      const positions = geometry.attributes.position;
      const originalPositions = positions.array.slice();
      brandPrint = createBrandPrint();
      if (!brandPrint) throw new Error('Could not create the paper brand texture.');
      brandPrint.texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      paperMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: brandPrint.texture,
        roughness: 0.88,
        metalness: 0,
        side: THREE.DoubleSide,
      });
      const paper = new THREE.Mesh(geometry, paperMaterial);
      paper.frustumCulled = false;
      scene.add(paper);

      shadowTexture = makeShadowTexture();
      if (shadowTexture) {
        shadow = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({
            map: shadowTexture,
            transparent: true,
            opacity: 0.34,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        shadow.position.z = -0.14;
        scene.add(shadow);
      }

      function resize() {
        if (disposed) return;
        const nextWidth = Math.max(1, mount.clientWidth || window.innerWidth);
        const nextHeight = Math.max(1, mount.clientHeight || window.innerHeight);
        renderer.setSize(nextWidth, nextHeight, false);
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
        pageSize = getDimensions(camera, nextWidth, nextHeight);
        brandPrint.setPageAspect(pageSize.pageWidth / pageSize.pageHeight);
        paper.scale.set(pageSize.pageWidth, pageSize.pageHeight, 1);
        if (shadow) shadow.scale.set(pageSize.pageWidth * 1.27, pageSize.pageHeight * 0.2, 1);
      }

      resize();
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);
      } else {
        windowResizeHandler = resize;
        window.addEventListener('resize', windowResizeHandler, { passive: true });
      }

      const actualStart = Number.isFinite(startedAt) ? startedAt : performance.now();
      let lastFrameTime = 0;
      let lastBrandUpdate = -Infinity;
      let brandWriteComplete = false;
      const frameBudget = 1000 / 60;

      function render(now) {
        if (disposed) return;
        if (lastFrameTime && now - lastFrameTime < frameBudget - 1) {
          frameId = window.requestAnimationFrame(render);
          return;
        }
        lastFrameTime = now;

        try {
          const elapsed = clamp((now - actualStart) / 1000, 0, ANIMATION_LENGTH);
          if (!brandWriteComplete && (now - lastBrandUpdate >= 1000 / 30 || elapsed >= BRAND_WRITE_FINISH)) {
            brandPrint.draw(Math.min(elapsed, BRAND_WRITE_FINISH));
            lastBrandUpdate = now;
            brandWriteComplete = elapsed >= BRAND_WRITE_FINISH;
          }
          const curl = curlAt(elapsed);
          const settle = smoothstep(1.55, 2.05, elapsed);
          const expansion = easeInOut((elapsed - 2.12) / 0.4);
          const targetCoverScale =
            Math.max(pageSize.viewWidth / pageSize.pageWidth, pageSize.viewHeight / pageSize.pageHeight) *
            1.04;
          const scale = 1 + (targetCoverScale - 1) * expansion;

          paper.scale.set(pageSize.pageWidth * scale, pageSize.pageHeight * scale, 1);
          const settleBounce =
            elapsed > 1.82
              ? Math.sin((elapsed - 1.82) * 17) *
                Math.exp(-(elapsed - 1.82) * 6.5) *
                pageSize.pageHeight *
                0.018
              : 0;
          const floatY = Math.sin(elapsed * 2.35) * pageSize.pageHeight * 0.012 * (1 - settle * 0.82);
          paper.position.set(0, floatY + settleBounce, 0);
          paper.rotation.x = (0.025 + 0.03 * Math.sin(elapsed * 1.7)) * (1 - settle * 0.92);
          paper.rotation.y = 0.025 * Math.sin(elapsed * 1.2) * (1 - settle * 0.92);
          paper.rotation.z = 0.012 * Math.sin(elapsed * 1.45) * (1 - settle * 0.94);

          for (let index = 0; index < positions.count; index += 1) {
            const offset = index * 3;
            const originalX = originalPositions[offset];
            const originalY = originalPositions[offset + 1];
            const u = originalX + 0.5;
            const v = originalY + 0.5;
            const edgeFalloff = 1 - smoothstep(0, CURL_BAND, v);
            const asymmetry = 0.87 + 0.13 * Math.sin(u * Math.PI * 2 + elapsed * 1.25);
            const localCurl = curl * asymmetry;
            const angle = localCurl * 2.72 * Math.pow(edgeFalloff, 1.32);
            const wave =
              Math.sin(u * Math.PI * 3.4 + elapsed * 1.75) *
              Math.sin(Math.min(1, edgeFalloff) * Math.PI * 0.82) *
              curl;
            positions.array[offset] = originalX;
            positions.array[offset + 1] = originalY + 0.052 * Math.sin(angle);
            positions.array[offset + 2] =
              pageSize.pageHeight * (0.092 * (1 - Math.cos(angle)) + 0.012 * wave * edgeFalloff);
          }
          positions.needsUpdate = true;
          geometry.computeVertexNormals();

          if (shadow) {
            shadow.position.set(0, paper.position.y - pageSize.pageHeight * 0.59, -0.14);
            shadow.material.opacity = (0.22 + curl * 0.16) * (1 - expansion * 0.96);
            shadow.scale.set(
              pageSize.pageWidth * (1.22 + curl * 0.18),
              pageSize.pageHeight * (0.16 + curl * 0.1),
              1,
            );
          }

          renderer.render(scene, camera);
          if (elapsed >= ANIMATION_LENGTH && !coverCalled) {
            coverCalled = true;
            callbacksRef.current.onCover?.();
          }
          if (elapsed < ANIMATION_LENGTH) frameId = window.requestAnimationFrame(render);
        } catch {
          if (!coverCalled) {
            coverCalled = true;
            callbacksRef.current.onError?.();
          }
        }
      }

      frameId = window.requestAnimationFrame(render);
    } catch {
      callbacksRef.current.onError?.();
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      if (windowResizeHandler) window.removeEventListener('resize', windowResizeHandler);
      shadow?.geometry.dispose();
      shadow?.material.dispose();
      shadowTexture?.dispose();
      geometry?.dispose();
      brandPrint?.dispose();
      paperMaterial?.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [startedAt]);

  return <div ref={mountRef} className="paper-intro__three-root" />;
}
