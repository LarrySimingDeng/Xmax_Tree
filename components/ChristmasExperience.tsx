import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { AppState, ParticleData, TreeMode } from '../types';

interface Props {
  setAppState: (state: AppState) => void;
  setMode: (mode: TreeMode) => void;
  setGestureHint: (hint: string) => void;
}

const ChristmasExperience: React.FC<Props> = ({ setAppState, setMode, setGestureHint }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Logic Refs
  const particlesRef = useRef<ParticleData[]>([]);
  const modeRef = useRef<TreeMode>(TreeMode.TREE);
  const focusTargetRef = useRef<THREE.Group | null>(null);
  const mouseRotationRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  const photoTexturesRef = useRef<THREE.Texture[]>([]);

  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const mainGroupRef = useRef<THREE.Group | null>(null);
  const clockRef = useRef(new THREE.Clock());

  // Config
  const CONFIG = {
    colors: {
      bg: 0x050505,
      gold: 0xffd700,
      darkGreen: 0x081f10,
      ruby: 0x8a0303,
    },
    counts: {
      particles: 800,
      dust: 1200,
    }
  };

  // --- 1. SETUP THREE.JS SCENE ---
  const initThree = () => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.colors.bg);
    scene.fog = new THREE.FogExp2(CONFIG.colors.bg, 0.015);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 45);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Post Processing
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.5;
    bloomPass.strength = 0.6; // High luxury glow
    bloomPass.radius = 0.5;
    
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // Environment & Lights
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);
    mainGroupRef.current = mainGroup;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const goldSpot = new THREE.SpotLight(CONFIG.colors.gold, 500);
    goldSpot.position.set(20, 50, 20);
    goldSpot.angle = 0.5;
    goldSpot.penumbra = 1;
    scene.add(goldSpot);

    const warmLight = new THREE.PointLight(0xffaa55, 2, 50);
    warmLight.position.set(0, 5, 10);
    mainGroup.add(warmLight);
  };

  // --- 2. GENERATE PARTICLES ---
  const generateParticles = () => {
    if (!mainGroupRef.current) return;

    // Geometries
    const sphereGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const boxGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    
    // Materials
    const goldMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.gold,
      metalness: 1.0,
      roughness: 0.15,
      emissive: 0x221100,
      emissiveIntensity: 0.2
    });

    const greenMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.darkGreen,
      metalness: 0.1,
      roughness: 0.8,
    });

    const redMat = new THREE.MeshPhysicalMaterial({
      color: CONFIG.colors.ruby,
      metalness: 0.2,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    // Generate Default Photo Textures if none exist
    if (photoTexturesRef.current.length === 0) {
      const createTextTexture = (text: string) => {
        const cvs = document.createElement('canvas');
        cvs.width = 512; cvs.height = 512;
        const ctx = cvs.getContext('2d');
        if(ctx) {
          ctx.fillStyle = '#0a0a0a';
          ctx.fillRect(0,0,512,512);
          ctx.strokeStyle = '#d4af37';
          ctx.lineWidth = 20;
          ctx.strokeRect(20,20,472,472);
          ctx.fillStyle = '#d4af37';
          ctx.font = '60px Times New Roman';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, 256, 256);
        }
        return new THREE.CanvasTexture(cvs);
      };
      photoTexturesRef.current = [
        createTextTexture("JOY"),
        createTextTexture("NOEL"),
        createTextTexture("FAMILY"),
        createTextTexture("PEACE"),
        createTextTexture("2024")
      ];
    }

    const particles: ParticleData[] = [];

    // Create Main Elements
    for (let i = 0; i < CONFIG.counts.particles; i++) {
      const rand = Math.random();
      let mesh;
      let type: ParticleData['type'] = 'ORNAMENT_GOLD';

      if (rand < 0.05) {
        // Photo Card
        type = 'PHOTO';
        const tex = photoTexturesRef.current[Math.floor(Math.random() * photoTexturesRef.current.length)];
        const group = new THREE.Group();
        
        // Frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.1, 0.1), goldMat);
        // Photo
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.9), new THREE.MeshBasicMaterial({ map: tex }));
        plane.position.z = 0.06;
        
        group.add(frame);
        group.add(plane);
        mesh = group;
      } else if (rand < 0.4) {
        mesh = new THREE.Mesh(boxGeo, greenMat);
        type = 'BOX_GREEN';
      } else if (rand < 0.7) {
        mesh = new THREE.Mesh(sphereGeo, goldMat);
        type = 'ORNAMENT_GOLD';
      } else {
        mesh = new THREE.Mesh(sphereGeo, redMat);
        type = 'ORNAMENT_RED';
      }

      // Calculate Positions
      // Tree: Spiral Cone
      const h = 25; // height
      const y = (Math.random() * h) - (h/2); // -12.5 to 12.5
      const normalizedY = (y + h/2) / h; // 0 to 1 (bottom to top)
      const radiusAtY = 9 * (1 - normalizedY); // Cone shape
      const angle = Math.random() * Math.PI * 20; // Multiple wraps
      const r = radiusAtY * Math.sqrt(Math.random()); // Even distribution inside
      const posTree = {
        x: Math.cos(angle) * r,
        y: y,
        z: Math.sin(angle) * r
      };

      // Scatter: Sphere/Galaxy
      const rScatter = 15 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const posScatter = {
        x: rScatter * Math.sin(phi) * Math.cos(theta),
        y: rScatter * Math.sin(phi) * Math.sin(theta),
        z: rScatter * Math.cos(phi)
      };

      mesh.position.set(posTree.x, posTree.y, posTree.z);
      
      const scale = 0.5 + Math.random() * 0.5;
      mesh.scale.set(scale, scale, scale);

      mainGroupRef.current.add(mesh);

      particles.push({
        mesh,
        type,
        posTree,
        posScatter,
        baseScale: scale,
        rotationSpeed: { x: Math.random()*2, y: Math.random()*2, z: Math.random()*2 },
        phase: Math.random() * Math.PI * 2
      });
    }

    // Add Dust/Stars
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = [];
    for(let i=0; i<CONFIG.counts.dust; i++) {
      dustPos.push((Math.random()-0.5)*80, (Math.random()-0.5)*80, (Math.random()-0.5)*80);
    }
    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.15, transparent: true, opacity: 0.6
    });
    const dustSystem = new THREE.Points(dustGeo, dustMat);
    mainGroupRef.current.add(dustSystem);

    particlesRef.current = particles;
  };

  // --- 3. ANIMATION LOOP ---
  const animate = () => {
    if (!rendererRef.current || !composerRef.current || !cameraRef.current || !mainGroupRef.current) return;

    const delta = clockRef.current.getDelta();
    const time = clockRef.current.getElapsedTime();
    const currentMode = modeRef.current;

    // Group Rotation (Camera move effect controlled by hand)
    if (currentMode === TreeMode.SCATTER || currentMode === TreeMode.FOCUS) {
      mainGroupRef.current.rotation.y += (mouseRotationRef.current.x * 2 - mainGroupRef.current.rotation.y) * delta * 2;
      mainGroupRef.current.rotation.x += (mouseRotationRef.current.y * 0.5 - mainGroupRef.current.rotation.x) * delta * 2;
    } else {
      // Auto rotate tree gently
      mainGroupRef.current.rotation.y += delta * 0.2;
      mainGroupRef.current.rotation.x *= (1 - delta);
    }

    // Particle Updates
    particlesRef.current.forEach(p => {
      let targetPos = new THREE.Vector3();
      let targetScale = p.baseScale;
      
      // Determine Target Position
      if (currentMode === TreeMode.TREE) {
        targetPos.set(p.posTree.x, p.posTree.y, p.posTree.z);
        // Add subtle hover
        targetPos.y += Math.sin(time + p.phase) * 0.2;
      } else if (currentMode === TreeMode.SCATTER) {
        targetPos.set(p.posScatter.x, p.posScatter.y, p.posScatter.z);
        // Drift
        targetPos.x += Math.sin(time * 0.5 + p.phase) * 1;
        
        // Spin logic for scatter
        p.mesh.rotation.x += p.rotationSpeed.x * delta;
        p.mesh.rotation.y += p.rotationSpeed.y * delta;
      } else if (currentMode === TreeMode.FOCUS) {
        if (p.mesh === focusTargetRef.current) {
          // Bring to front center relative to camera
          // We cheat: we move it to world center, and since camera is at Z=45, it works
          // But we need to inverse the group rotation to make it face camera perfectly
          const groupInv = mainGroupRef.current!.quaternion.clone().invert();
          const forward = new THREE.Vector3(0, 0, 35).applyQuaternion(groupInv); 
          targetPos.copy(forward);
          targetScale = 5.0; // Big Zoom
          
          p.mesh.lookAt(cameraRef.current!.position);
          // Counter act group rotation for perfect alignment
          p.mesh.quaternion.multiply(groupInv);
        } else {
          // Push others back slightly
          targetPos.set(p.posScatter.x * 1.2, p.posScatter.y * 1.2, p.posScatter.z * 1.2);
          targetScale = p.baseScale * 0.5; // Diminish others
        }
      }

      // Physics Interpolation (Lerp)
      const speed = (currentMode === TreeMode.FOCUS && p.mesh === focusTargetRef.current) ? 4.0 : 1.5;
      p.mesh.position.lerp(targetPos, delta * speed);
      
      const currentScale = p.mesh.scale.x;
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 3);
      p.mesh.scale.set(newScale, newScale, newScale);
    });

    composerRef.current.render();
    requestAnimationFrame(animate);
  };

  // --- 4. COMPUTER VISION (MediaPipe) ---
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } }); // Low res for perf
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      return new Promise<void>((resolve) => {
        videoRef.current.addEventListener('loadeddata', () => resolve());
      });
    } catch (e) {
      console.error("Camera denied", e);
      setGestureHint("Camera Access Denied");
    }
  };

  const setupMediaPipe = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
    const handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 1
    });

    setAppState(AppState.READY);
    setGestureHint("Show Hand to Control");

    // Detection Loop
    let lastVideoTime = -1;
    const detect = () => {
      if (videoRef.current.currentTime !== lastVideoTime) {
        lastVideoTime = videoRef.current.currentTime;
        const result = handLandmarker.detectForVideo(videoRef.current, performance.now());
        handleGestures(result);
      }
      requestAnimationFrame(detect);
    };
    detect();
  };

  const handleGestures = (result: HandLandmarkerResult) => {
    if (!result.landmarks || result.landmarks.length === 0) {
      // No hand, drift slowly back to tree or maintain scatter? 
      // Let's maintain current state but stop rotation input
      setGestureHint("No Hand Detected");
      return;
    }

    const lm = result.landmarks[0];
    const wrist = lm[0];
    const thumbTip = lm[4];
    const indexTip = lm[8];
    const middleTip = lm[12];
    const ringTip = lm[16];
    const pinkyTip = lm[20];
    const middleKnuckle = lm[9];

    // 1. Calculate Pinch (Thumb to Index)
    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    
    // 2. Calculate "Openness" (Average distance of tips to wrist)
    const tips = [indexTip, middleTip, ringTip, pinkyTip];
    let avgDistToWrist = 0;
    tips.forEach(t => {
      avgDistToWrist += Math.hypot(t.x - wrist.x, t.y - wrist.y);
    });
    avgDistToWrist /= 4;

    // 3. Map Position for Rotation (using middle knuckle as center point)
    // Hand coords are 0-1. 0.5 is center.
    const handX = (middleKnuckle.x - 0.5) * -2; // Invert X for mirror feel
    const handY = (middleKnuckle.y - 0.5) * -2; 
    mouseRotationRef.current = { x: handX, y: handY };

    // --- STATE MACHINE ---
    // Thresholds need tuning based on distance from camera, but relative measures help.
    
    // Mode Switching Logic
    const PINCH_THRESHOLD = 0.05;
    const FIST_THRESHOLD = 0.25; // Compact hand
    const OPEN_THRESHOLD = 0.35; // Extended hand

    if (pinchDist < PINCH_THRESHOLD) {
      // PINCH -> FOCUS
      if (modeRef.current !== TreeMode.FOCUS) {
        modeRef.current = TreeMode.FOCUS;
        setMode(TreeMode.FOCUS);
        setGestureHint("Inspecting Memory");
        
        // Pick random photo target
        const photos = particlesRef.current.filter(p => p.type === 'PHOTO');
        if (photos.length > 0) {
          focusTargetRef.current = photos[Math.floor(Math.random() * photos.length)].mesh;
        } else {
          // Fallback if no photos
          focusTargetRef.current = particlesRef.current[0].mesh;
        }
      }
    } else if (avgDistToWrist < FIST_THRESHOLD) {
      // COMPACT -> TREE (Closed)
      if (modeRef.current !== TreeMode.TREE) {
        modeRef.current = TreeMode.TREE;
        setMode(TreeMode.TREE);
        setGestureHint("Restoring Tree");
        focusTargetRef.current = null;
      }
    } else if (avgDistToWrist > OPEN_THRESHOLD) {
      // EXTENDED -> SCATTER
      if (modeRef.current !== TreeMode.SCATTER) {
        // Only switch to scatter if we aren't pinching
        modeRef.current = TreeMode.SCATTER;
        setMode(TreeMode.SCATTER);
        setGestureHint("Magic Scatter");
        focusTargetRef.current = null;
      }
    }
  };

  // --- 5. PHOTO UPLOAD HANDLING ---
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
       const files = Array.from(e.target.files);
       
       files.forEach(file => {
         const reader = new FileReader();
         reader.onload = (ev) => {
           if(ev.target?.result) {
              const img = new Image();
              img.src = ev.target.result as string;
              img.onload = () => {
                const tex = new THREE.Texture(img);
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.needsUpdate = true;
                
                // Add to ref
                photoTexturesRef.current.push(tex);
                
                // Add new particle immediately
                const texIndex = photoTexturesRef.current.length - 1;
                addPhotoParticle(photoTexturesRef.current[texIndex]);
              }
           }
         }
         reader.readAsDataURL(file);
       });
    }
  };

  const addPhotoParticle = (tex: THREE.Texture) => {
     if (!mainGroupRef.current) return;
     
     const group = new THREE.Group();
     const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700, metalness: 1.0, roughness: 0.15
     });
     
     const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.1, 0.1), goldMat);
     const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.9), new THREE.MeshBasicMaterial({ map: tex }));
     plane.position.z = 0.06;
     
     group.add(frame);
     group.add(plane);
     
     // Random Scatter Position
     const rScatter = 25;
     const theta = Math.random() * Math.PI * 2;
     const phi = Math.acos(2 * Math.random() - 1);
     const posScatter = {
        x: rScatter * Math.sin(phi) * Math.cos(theta),
        y: rScatter * Math.sin(phi) * Math.sin(theta),
        z: rScatter * Math.cos(phi)
     };

     // Tree Position (Just put it somewhere visible on tree)
     const h = 25;
     const y = (Math.random() * h) - (h/2);
     const angle = Math.random() * Math.PI * 2;
     const radius = 4;
     const posTree = { x: Math.cos(angle)*radius, y, z: Math.sin(angle)*radius };
     
     group.position.set(posScatter.x, posScatter.y, posScatter.z);
     mainGroupRef.current.add(group);
     
     particlesRef.current.push({
        mesh: group,
        type: 'PHOTO',
        posTree,
        posScatter,
        baseScale: 1,
        rotationSpeed: { x: Math.random(), y: Math.random(), z: Math.random() },
        phase: 0
     });
     
     // Force focus on this new photo
     modeRef.current = TreeMode.FOCUS;
     setMode(TreeMode.FOCUS);
     focusTargetRef.current = group;
  };

  // --- INIT LIFECYCLE ---
  useEffect(() => {
    initThree();
    generateParticles();
    animate();
    
    // Start Vision
    startWebcam().then(() => {
      setupMediaPipe();
    });

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current || !composerRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      composerRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      // Clean up Three.js resources if needed
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 z-0" />
      
      {/* Hidden Upload Input */}
      <input 
        type="file" 
        multiple 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleUpload}
        className="hidden" 
      />
      
      {/* Upload Button overlaying everything */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-black/40 backdrop-blur-md border border-[#d4af37] text-[#d4af37] px-8 py-3 rounded hover:bg-[#d4af37] hover:text-black transition-all duration-300 uppercase tracking-[0.2em] text-xs font-bold"
        >
          Add Photo Memories
        </button>
      </div>
    </>
  );
};

export default ChristmasExperience;
