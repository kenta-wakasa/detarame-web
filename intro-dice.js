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
  const startTarget = new THREE.Vector3(0, .25, 0);
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
  die.scale.setScalar(.6);
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
  const body = new THREE.Mesh(bodyGeometry, new THREE.MeshStandardMaterial({
    color: 0xf7f7f4,
    roughness: .94,
    metalness: 0
  }));
  body.castShadow = true;
  body.receiveShadow = true;
  die.add(body);

  const pipGeometry = new THREE.CylinderGeometry(.125, .125, .035, 28);
  const pipMaterial = new THREE.MeshStandardMaterial({
    color: 0x142b3a,
    roughness: .92,
    metalness: 0
  });
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
  floor.position.y = -.72;
  floor.receiveShadow = true;
  scene.add(floor);

  const clamp = (value) => Math.max(0, Math.min(1, value));
  const easeInOutCubic = (value) => value < .5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
  const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

  const gravity = 24;
  const restitution = .5;
  const physicsSegments = [];
  let segmentStart = 0;
  let segmentX = -1.5;
  let segmentY = 6.2;
  let velocityX = 1.1;
  let velocityY = -.35;
  let orientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.7, .55, -1.1));
  let angularVelocity = new THREE.Vector3(3.5, 2.35, 5.1);

  const rotateQuaternion = (quaternion, velocity, duration) => {
    const speed = velocity.length();
    if (!speed) return quaternion.clone();
    const delta = new THREE.Quaternion().setFromAxisAngle(velocity.clone().normalize(), speed * duration);
    return quaternion.clone().multiply(delta).normalize();
  };

  for (let impact = 0; impact < 4; impact += 1) {
    const flightTime = segmentY > 0
      ? (velocityY + Math.sqrt(velocityY * velocityY + 2 * gravity * segmentY)) / gravity
      : (2 * velocityY) / gravity;
    const endOrientation = rotateQuaternion(orientation, angularVelocity, flightTime);
    const endX = segmentX + velocityX * flightTime;
    physicsSegments.push({
      start: segmentStart,
      end: segmentStart + flightTime,
      x: segmentX,
      y: segmentY,
      vx: velocityX,
      vy: velocityY,
      orientation: orientation.clone(),
      angularVelocity: angularVelocity.clone()
    });

    const impactVelocity = velocityY - gravity * flightTime;
    segmentStart += flightTime;
    segmentX = endX;
    segmentY = 0;
    velocityY = -impactVelocity * restitution;
    velocityX *= .76;
    orientation = endOrientation;
    angularVelocity.multiplyScalar(.62);
    angularVelocity.x += impact % 2 === 0 ? .34 : -.22;
    angularVelocity.y += impact % 2 === 0 ? -.18 : .28;
    angularVelocity.z *= .82;
  }

  const landingAlignment = orientation.clone().invert();
  physicsSegments.forEach((physicsSegment) => {
    physicsSegment.orientation.premultiply(landingAlignment).normalize();
  });
  orientation.premultiply(landingAlignment).normalize();

  const physicsEnd = segmentStart;
  const physicsEndX = segmentX;
  const physicsEndOrientation = orientation.clone();
  const startedAt = performance.now();

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
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
    const seconds = elapsed / 1000;
    const activeSegment = physicsSegments.find(({ start, end }) => seconds >= start && seconds < end);
    if (activeSegment) {
      const localTime = seconds - activeSegment.start;
      die.position.set(
        activeSegment.x + activeSegment.vx * localTime,
        Math.max(0, activeSegment.y + activeSegment.vy * localTime - .5 * gravity * localTime * localTime),
        0
      );
      die.quaternion.copy(rotateQuaternion(activeSegment.orientation, activeSegment.angularVelocity, localTime));
    } else {
      const settle = easeOutCubic(clamp((seconds - physicsEnd) / .34));
      die.position.set(THREE.MathUtils.lerp(physicsEndX, 0, settle), 0, 0);
      die.quaternion.copy(physicsEndOrientation);
    }

    const zoom = easeInOutCubic(clamp((elapsed - 2250) / 1350));
    floor.material.opacity = .16 * (1 - zoom);
    const startRadius = camera.aspect < .9 ? 14.5 : 12.5;
    const radius = THREE.MathUtils.lerp(startRadius, 7.8, zoom);
    const angle = zoom * Math.PI / 2;
    camera.position.set(0, .35 * Math.cos(angle) + radius * Math.sin(angle), radius * Math.cos(angle) + .001);
    camera.up.set(0, 1 - zoom, -zoom).normalize();
    cameraTarget.lerpVectors(startTarget, endTarget, zoom);
    camera.fov = 42;
    camera.updateProjectionMatrix();
    camera.lookAt(cameraTarget);

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
}
