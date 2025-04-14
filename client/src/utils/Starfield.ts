import * as THREE from 'three';

/**
 * Starfield class to create a fixed background of stars
 * The stars will be positioned relative to the camera,
 * creating the illusion of a fixed background
 */
export class Starfield {
  // The particle system for stars
  particleSystem: THREE.Points;
  // The camera to follow
  camera: THREE.PerspectiveCamera;
  // The scene to add stars to
  scene: THREE.Scene;
  // Number of stars
  starCount: number;
  // Radius of the star sphere
  radius: number;

  /**
   * Create a new starfield
   * @param scene The Three.js scene
   * @param camera The camera to follow
   * @param starCount Number of stars to create
   * @param radius Radius of the star sphere
   */
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    starCount: number = 2000,
    radius: number = 150
  ) {
    this.scene = scene;
    this.camera = camera;
    this.starCount = starCount;
    this.radius = radius;

    // Create the star particles
    this.particleSystem = this.createStars();
    
    // Add to scene
    this.scene.add(this.particleSystem);
  }

  /**
   * Create the star particle system
   */
  private createStars(): THREE.Points {
    // Create geometry for the stars
    const geometry = new THREE.BufferGeometry();
    
    // Create positions for stars in a sphere around the origin
    const positions = new Float32Array(this.starCount * 3);
    
    for (let i = 0; i < this.starCount; i++) {
      // Create points in a sphere using spherical coordinates
      const theta = Math.random() * Math.PI * 2; // Azimuthal angle (around y-axis)
      const phi = Math.acos(2 * Math.random() - 1); // Polar angle (from y-axis)
      
      // Calculate position using spherical coordinates
      const x = this.radius * Math.sin(phi) * Math.cos(theta);
      const y = this.radius * Math.sin(phi) * Math.sin(theta);
      const z = this.radius * Math.cos(phi);
      
      // Set position
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    
    // Add attributes to geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create simple material for stars
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    
    // Create the particle system
    return new THREE.Points(geometry, material);
  }

  /**
   * Update the starfield position to follow the camera
   */
  update(): void {
    // Position the starfield at the camera position
    this.particleSystem.position.copy(this.camera.position);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Remove from scene
    if (this.particleSystem.parent) {
      this.particleSystem.parent.remove(this.particleSystem);
    }
    
    // Dispose of geometry and material
    if (this.particleSystem.geometry) {
      this.particleSystem.geometry.dispose();
    }
    
    if (this.particleSystem.material) {
      if (Array.isArray(this.particleSystem.material)) {
        this.particleSystem.material.forEach(material => material.dispose());
      } else {
        this.particleSystem.material.dispose();
      }
    }
  }
}
