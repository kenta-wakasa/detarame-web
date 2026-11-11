import * as THREE from './vendor/three.module.min.js';

const canvas = document.querySelector('.intro-canvas');
if (canvas && document.documentElement.classList.contains('has-intro')) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const camera = new THREE.PerspectiveCamera(42, 1, .1, 40);
  camera.up.set(0, 0, -1);
  const startCamera = new THREE.Vector3(6.5, 5, 11.5);
  const mobileStartCamera = new THREE.Vector3(7.8, 6.1, 15);
  const endCamera = new THREE.Vector3(0, 3.25, .001);
  const startTarget = new THREE.Vector3(0, 0, 0);
  const endTarget = new THREE.Vector3(0, .8, 0);
  const cameraTarget = new THREE.Vector3();

  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d0d4, 2.35));
  const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
  keyLight.position.set(-4, 7, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 20;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xbfd8ff, 1.25);
  fillLight.position.set(5, 2, -3);
  scene.add(fillLight);

  const die = new THREE.Group();
  scene.add(die);

  const shape = new THREE.Shape();
  const size = 1;
  const radius = .18;
  shape.moveTo(-size + radius, -size);
  shape.lineTo(size - radius, -size);
  shape.quadraticCurveTo(size, -size, size, -size + radius);
  shape.lineTo(size, size - radius);
  shape.quadraticCurveTo(size, size, size - radius, size);
  shape.lineTo(-size + radius, size);
  shape.quadraticCurveTo(-size, size, -size, size - radius);
  shape.lineTo(-size, -size + radius);
  shape.quadraticCurveTo(-size, -size, -size + radius, -size);

  const bodyGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: 2,
    bevelEnabled: true,
    bevelSegments: 5,
    bevelSize: .1,
    bevelThickness: .1,
    curveSegments: 6,
    steps: 1
  });
  bodyGeometry.translate(0, 0, -1);
  bodyGeometry.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeometry, new THREE.MeshPhysicalMaterial({
    color: 0xf7f7f4,
    roughness: .24,
    metalness: 0,
    clearcoat: .38,
    clearcoatRoughness: .3
  }));
  body.castShadow = true;
  body.receiveShadow = true;
  die.add(body);

  const pipGeometry = new THREE.CylinderGeometry(.125, .125, .035, 28);
  const pipMaterial = new THREE.MeshStandardMaterial({ color: 0x142b3a, roughness: .38 });
  const patterns = {
    1: [[0, 0]],
    2: [[-.46, .46], [.46, -.46]],
    3: [[-.46, .46], [0, 0], [.46, -.46]],
    4: [[-.46, .46], [.46, .46], [-.46, -.46], [.46, -.46]],
    5: [[-.46, .46], [.46, .46], [0, 0], [-.46, -.46], [.46, -.46]],
    6: [[-.46, .5], [.46, .5], [-.46, 0], [.46, 0], [-.46, -.5], [.46, -.5]]
  };

  const addPips = (face, count) => {
    patterns[count].forEach(([a, b]) => {
      const pip = new THREE.Mesh(pipGeometry, pipMaterial);
      if (face === 'top') pip.position.set(a, 1.115, -b);
      if (face === 'bottom') pip.position.set(a, -1.115, b);
      if (face === 'front') {
        pip.rotation.x = Math.PI / 2;
        pip.position.set(a, b, 1.115);
      }
      if (face === 'back') {
        pip.rotation.x = Math.PI / 2;
        pip.position.set(-a, b, -1.115);
      }
      if (face === 'right') {
        pip.rotation.z = Math.PI / 2;
        pip.position.set(1.115, b, -a);
      }
      if (face === 'left') {
        pip.rotation.z = Math.PI / 2;
        pip.position.set(-1.115, b, a);
      }
      pip.castShadow = true;
      die.add(pip);
    });
  };

  addPips('top', 1);
  addPips('bottom', 6);
  addPips('front', 5);
  addPips('back', 2);
  addPips('right', 3);
  addPips('left', 4);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 14),
    new THREE.ShadowMaterial({ color: 0x142b3a, opacity: .16 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.19;
  floor.receiveShadow = true;
  scene.add(floor);

  const clamp = (value) => Math.max(0, Math.min(1, value));
  const smoothstep = (value) => value * value * (3 - 2 * value);
  const easeInOutCubic = (value) => value < .5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
  const startedAt = performance.now();

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const render = (now) => {
    if (!canvas.isConnected) {
      renderer.dispose();
      window.removeEventListener('resize', resize);
      return;
    }

    const elapsed = now - startedAt;
    const roll = clamp(elapsed / 1650);
    const rollingEase = smoothstep(roll);
    const startX = camera.aspect < .8 ? -5.2 : -7.2;
    die.position.x = THREE.MathUtils.lerp(startX, 0, rollingEase);
    die.position.y = Math.abs(Math.sin(roll * Math.PI * 5)) * .055 * (1 - roll);
    die.rotation.set(
      THREE.MathUtils.lerp(-.16, 0, rollingEase),
      THREE.MathUtils.lerp(-.24, 0, rollingEase),
      THREE.MathUtils.lerp(-Math.PI * 5, 0, rollingEase)
    );

    const zoom = easeInOutCubic(clamp((elapsed - 1820) / 1450));
    camera.position.lerpVectors(camera.aspect < .8 ? mobileStartCamera : startCamera, endCamera, zoom);
    cameraTarget.lerpVectors(startTarget, endTarget, zoom);
    camera.fov = 42;
    camera.updateProjectionMatrix();
    camera.lookAt(cameraTarget);

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
}
