export enum AppState {
  LOADING = 'LOADING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export enum TreeMode {
  TREE = 'TREE',       // Fist: Closed Cone
  SCATTER = 'SCATTER', // Open Hand: Floating Chaos
  FOCUS = 'FOCUS'      // Pinch: Inspect Photo
}

export interface ParticleData {
  mesh: any; // THREE.Mesh or THREE.Group
  type: 'ORNAMENT_GOLD' | 'ORNAMENT_RED' | 'BOX_GREEN' | 'CANE' | 'PHOTO' | 'DUST';
  posTree: { x: number, y: number, z: number };
  posScatter: { x: number, y: number, z: number };
  baseScale: number;
  rotationSpeed: { x: number, y: number, z: number };
  phase: number; // For animation offset
}
