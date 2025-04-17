import * as THREE from 'three';
import { Planet } from './Planet';
import { ArticleService } from '../services/api';
import { Starfield } from './Starfield';
import { Article } from '../types/Article';

/**
 * OrbitalSystem class to manage the Three.js scene and planets
 */
export class OrbitalSystem {
  // Scene elements
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  
  // Controls
  isDragging: boolean = false;
  previousMousePosition: { x: number, y: number } = { x: 0, y: 0 };
  zoomLevel: number = 1;
  minZoom: number = 0.5;
  maxZoom: number = 5;
  zoomSpeed: number = 0.1;
  pinchStartDistance: number = 0;
  
  // Lighting
  ambientLight: THREE.AmbientLight;
  directionalLight: THREE.DirectionalLight;
  
  // Animation
  animationId?: number;
  isPaused: boolean = false;
  
  // DOM element
  container: HTMLElement;
  
  // Starfield
  starfield?: Starfield;
  
  // Callbacks
  onArticleSelect?: (article: Article) => void;
  onArticleHover?: (article: Article | null) => void;
  
  // Raycaster for object selection
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  
  // Hover state
  hoveredArticleId: string | null = null;
  hoveredPlanet: Planet | null = null;
  
  /**
   * Create a new orbital system
   */
  constructor(
    container: HTMLElement, 
    onArticleSelect?: (article: Article) => void,
    onArticleHover?: (article: Article | null) => void
  ) {
    this.onArticleSelect = onArticleSelect;
    this.onArticleHover = onArticleHover;
    this.container = container;
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x09061b); // Dark blue background
    
    // Create camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 20, 40); // Positioned further back to view all orbits
    this.camera.lookAt(0, 0, 0);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);
    
    // Add lighting
    this.ambientLight = new THREE.AmbientLight(0x404040, 1);
    this.scene.add(this.ambientLight);
    
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(5, 10, 5);
    this.scene.add(this.directionalLight);
    
    // Add event listeners
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('mouseup', this.handleMouseUp);
    this.renderer.domElement.addEventListener('wheel', this.handleWheel, { passive: false });
    this.renderer.domElement.addEventListener('touchstart', this.handleTouchStart);
    this.renderer.domElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.renderer.domElement.addEventListener('touchend', this.handleMouseUp);
    this.renderer.domElement.addEventListener('click', this.handleClick);
    
    // Set cursor style to indicate interactivity
    this.renderer.domElement.style.cursor = 'default';
    
    // Initialize raycaster for object selection
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    
    // Add grid for reference - expanded to accommodate the furthest orbits (30 units)
    const gridHelper = new THREE.GridHelper(80, 80, 0x555555, 0x333333);
    this.scene.add(gridHelper);
    
    // Create sun (center)
    this.createSun();
    
    // Create starfield with minimal stars for a subtle effect
    this.starfield = new Starfield(this.scene, this.camera, 500, 200);
    
    // Start animation loop
    this.animate();
  }
  
  /**
   * Create the sun at the center of the system
   */
  createSun(): void {
    const sun = new Planet(
      'sun',
      'Local Group News',
      0, 0, 0,  // Position
      0, 0, 0,  // Velocity
      50000000, // Mass - reduced for more stable orbits in the 10-20 range
      1,        // Radius
      0xffb300, // Color (yellow-orange)
      true,     // Fixed
      false     // Not followed
    );
    
    // Add a point light to the sun
    const sunLight = new THREE.PointLight(0xffb300, 2, 50);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);
    
    // Add the sun to the scene
    this.scene.add(sun.planet);
    sun.createLabel(this.scene);
  }
  
  /**
   * Load articles from the API and create planets
   */
  async loadArticles(zipCode?: string, query?: string): Promise<void> {
    try {
      // Clear existing article planets (not the sun)
      this.clearArticlePlanets();
      
      // Fetch articles from the API
      const articles = await ArticleService.getArticles(zipCode, query);
      
      // Simple log of article count
      console.log(`Fetched ${articles.length} articles`);
      
      // Create planets for each article
      articles.forEach(article => {
        Planet.fromArticle(article, this.scene);
      });
      
      // console.log(`Loaded ${articles.length} articles as planets`);
    } catch (error) {
      console.error('Failed to load articles:', error);
    }
  }
  
  /**
   * Clear all planets representing articles (not the sun)
   */
  clearArticlePlanets(): void {
    // Filter out the sun
    const articlePlanets = Planet.planets.filter(planet => planet.name !== 'Local Group News');
    
    // Remove each article planet
    articlePlanets.forEach(planet => {
      planet.removePlanet(this.scene);
    });
  }
  
  /**
   * Handle window resize
   */
  handleResize = (): void => {
    if (!this.container) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };
  
  /**
   * Handle mouse down event
   */
  handleMouseDown = (event: MouseEvent): void => {
    this.isDragging = true;
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  };
  
  /**
   * Handle mouse move event
   */
  handleMouseMove = (event: MouseEvent): void => {
    // Update mouse position for raycasting
    this.pointer.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
    
    // Handle camera rotation if dragging
    if (this.isDragging) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;
      
      // Rotate the camera around the center
      this.rotateCamera(deltaX, deltaY);
      
      this.previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
    }
    // We don't need to call checkHover here since it's now called in the animation loop
  };
  
  /**
   * Check if the mouse is hovering over a planet
   */
  checkHover = (): void => {
    // Update the raycaster with current pointer position
    this.raycaster.setFromCamera(this.pointer, this.camera);
    
    // Increase the precision of the raycaster
    this.raycaster.params.Line.threshold = 0.1;
    this.raycaster.params.Points.threshold = 0.1;
    
    // Get all intersecting objects, not just the first one
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    // Check if hovering over something
    if (intersects.length > 0) {
      // Try to find the planet from the hovered object
      let hoveredPlanet = null;
      
      // Check each intersection (not just the first one)
      for (const intersection of intersects) {
        const hoveredObject = intersection.object;
        
        // Check all planets to see if we're hovering over one of them or their labels
        for (const planet of Planet.planets) {
          // Skip the sun
          if (planet.name === 'Local Group News') continue;
          
          // Check if we're hovering over the planet mesh
          if (hoveredObject === planet.planet) {
            hoveredPlanet = planet;
            break;
          }
          
          // Check if we're hovering over the planet's label
          if (planet.label && hoveredObject === planet.label) {
            hoveredPlanet = planet;
            break;
          }
          
          // Check if we're hovering over a child of the planet mesh
          if (hoveredObject.parent && hoveredObject.parent === planet.planet) {
            hoveredPlanet = planet;
            break;
          }
        }
        
        // If we found a planet, no need to check other intersections
        if (hoveredPlanet) break;
      }
      
      // If we found a planet with an article, trigger hover
      if (hoveredPlanet && hoveredPlanet.article) {
        // Change cursor to pointer
        this.renderer.domElement.style.cursor = 'pointer';
        
        // Call the hover callback if it exists and the hovered article has changed
        if (this.onArticleHover && (!this.hoveredPlanet || hoveredPlanet.id !== this.hoveredPlanet.id)) {
          console.log('Hovering over planet:', hoveredPlanet.name);
          this.onArticleHover(hoveredPlanet.article);
          this.hoveredPlanet = hoveredPlanet;
        }
        
        return;
      }
    }
    
    // If we get here, we're not hovering over any planet
    this.renderer.domElement.style.cursor = 'default';
    
    // Clear hover state if previously hovering
    if (this.hoveredPlanet && this.onArticleHover) {
      this.onArticleHover(null);
      this.hoveredPlanet = null;
    }
  };
  
  /**
   * Handle mouse up event
   */
  handleMouseUp = (): void => {
    this.isDragging = false;
  };
  
  /**
   * Handle touch start event
   */
  handleTouchStart = (event: TouchEvent): void => {
    if (event.touches.length === 1) {
      this.isDragging = true;
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    } else if (event.touches.length === 2) {
      // Store the initial distance between two fingers for pinch-to-zoom
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      this.pinchStartDistance = Math.sqrt(dx * dx + dy * dy);
    }
  };
  
  /**
   * Handle touch move event
   */
  handleTouchMove = (event: TouchEvent): void => {
    event.preventDefault();
    
    if (event.touches.length === 1 && this.isDragging) {
      const deltaX = event.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = event.touches[0].clientY - this.previousMousePosition.y;
      
      // Rotate the camera around the center
      this.rotateCamera(deltaX, deltaY);
      
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    } else if (event.touches.length === 2) {
      // Handle pinch-to-zoom
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate zoom factor based on the change in distance
      const zoomDelta = (distance - this.pinchStartDistance) * 0.01;
      this.zoom(zoomDelta);
      
      // Update the start distance for the next move event
      this.pinchStartDistance = distance;
    }
  };
  
  /**
   * Handle touch end event
   */
  handleTouchEnd = (): void => {
    this.isDragging = false;
  };
  
  /**
   * Rotate the camera around the center
   */
  rotateCamera(deltaX: number, deltaY: number): void {
    // If a planet is being followed, rotate around that planet
    const target = Planet.currentFollowed 
      ? new THREE.Vector3(Planet.currentFollowed.pos.x, Planet.currentFollowed.pos.y, Planet.currentFollowed.pos.z)
      : new THREE.Vector3(0, 0, 0);
    
    // Calculate camera position relative to target
    const offset = new THREE.Vector3().subVectors(this.camera.position, target);
    
    // Calculate rotation angles
    const angleX = -deltaX * 0.01;
    const angleY = -deltaY * 0.01;
    
    // Rotate horizontally
    const quaternionX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angleX);
    offset.applyQuaternion(quaternionX);
    
    // Rotate vertically
    const quaternionY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angleY);
    offset.applyQuaternion(quaternionY);
    
    // Update camera position
    this.camera.position.copy(target).add(offset);
    this.camera.lookAt(target);
  }
  
  /**
   * Handle mouse wheel event for zooming
   */
  handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    
    // Calculate zoom direction based on wheel delta
    const zoomDelta = -Math.sign(event.deltaY) * this.zoomSpeed;
    this.zoom(zoomDelta);
  };
  
  /**
   * Zoom the camera in or out
   */
  zoom(delta: number): void {
    // Update zoom level
    this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + delta));
    
    // Get the target point (either the followed planet or the origin)
    const target = Planet.currentFollowed 
      ? new THREE.Vector3(Planet.currentFollowed.pos.x, Planet.currentFollowed.pos.y, Planet.currentFollowed.pos.z)
      : new THREE.Vector3(0, 0, 0);
    
    // Calculate the direction vector from target to camera
    const direction = new THREE.Vector3().subVectors(this.camera.position, target).normalize();
    
    // Calculate the desired distance based on zoom level
    // Base distance is 40 units (from the initial camera setup)
    const distance = 40 / this.zoomLevel;
    
    // Set the new camera position
    this.camera.position.copy(target).add(direction.multiplyScalar(distance));
    this.camera.lookAt(target);
  }
  
  /**
   * Toggle pause state or set to specific state
   * @param forcePause Optional parameter to force a specific pause state
   * @returns The new pause state
   */
  togglePause(forcePause?: boolean): boolean {
    if (forcePause !== undefined) {
      this.isPaused = forcePause;
    } else {
      this.isPaused = !this.isPaused;
    }
    return this.isPaused;
  }
  
  /**
   * Set the currently hovered article ID
   * @param articleId The ID of the hovered article, or null if none
   */
  setHoveredArticleId(articleId: string | null): void {
    this.hoveredArticleId = articleId;
    
    // Find the corresponding planet
    if (articleId) {
      this.hoveredPlanet = Planet.planets.find(p => p.id === articleId) || null;
    } else {
      this.hoveredPlanet = null;
    }
  }

  /**
   * Handle click event for article selection
   */
  handleClick = (event: MouseEvent): void => {
    // Get the mouse position
    this.pointer.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
    
    // Update the raycaster
    this.raycaster.setFromCamera(this.pointer, this.camera);
    
    // Get the intersecting objects - check all scene children and their descendants
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    // Check if something was clicked
    if (intersects.length > 0) {
      console.log('Clicked on something:', intersects[0].object);
      
      // Try to find the planet from the clicked object
      let clickedPlanet = null;
      const clickedObject = intersects[0].object;
      
      // Check all planets to see if we clicked on one of them or their labels
      for (const planet of Planet.planets) {
        // Skip the sun
        if (planet.name === 'Local Group News') continue;
        
        // Check if we clicked on the planet mesh
        if (clickedObject === planet.planet) {
          clickedPlanet = planet;
          break;
        }
        
        // Check if we clicked on the planet's label
        if (planet.label && clickedObject === planet.label) {
          clickedPlanet = planet;
          break;
        }
        
        // Check if we clicked on a child of the planet mesh
        if (clickedObject.parent && clickedObject.parent === planet.planet) {
          clickedPlanet = planet;
          break;
        }
      }
      
      // If we found a planet with an article, select it
      if (clickedPlanet && clickedPlanet.article) {
        console.log('Selected planet:', clickedPlanet.name);
        console.log('Article:', clickedPlanet.article);
        
        // Call the article selection callback
        if (this.onArticleSelect) {
          this.onArticleSelect(clickedPlanet.article);
        }
      }
    }
  };

  /**
   * Animation loop
   */
  animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    
    // Check for hover in every frame if not dragging
    if (!this.isDragging) {
      this.checkHover();
    }
    
    // Only update planet positions if not paused
    if (!this.isPaused) {
      // Update all planets, with special handling for hovered planet
      for (let i = 0; i < Planet.planets.length; i++) {
        const planet = Planet.planets[i];
        
        // Update velocity for all planets
        planet.updateVelocity();
        
        // If this is the hovered planet, update position at 1/5 speed
        if (this.hoveredArticleId && planet.id === this.hoveredArticleId) {
          // Store original velocity
          const originalVel = planet.vel.clone();
          
          // Set temporary slower velocity
          planet.vel = planet.vel.mul(0.2);
          
          // Update position with slower velocity
          planet.updatePosition();
          
          // Restore original velocity
          planet.vel = originalVel;
        } else {
          // Normal update for non-hovered planets
          planet.updatePosition();
        }
        
        if (Planet.collisionSystem) {
          planet.collisionDetection(this.scene);
        }
      }
    }
    
    // Update camera position if following a planet
    if (Planet.currentFollowed) {
      const target = new THREE.Vector3(
        Planet.currentFollowed.pos.x,
        Planet.currentFollowed.pos.y,
        Planet.currentFollowed.pos.z
      );
      
      // Calculate offset from current camera position to target
      const offset = new THREE.Vector3().subVectors(this.camera.position, target);
      
      // Update camera position to follow the planet
      this.camera.position.copy(target).add(offset);
      this.camera.lookAt(target);
    }
    
    // Update starfield position to follow camera
    if (this.starfield) {
      this.starfield.update();
    }
    
    this.renderer.render(this.scene, this.camera);
  };
  
  /**
   * Clean up resources
   */
  dispose(): void {
    // Stop animation loop
    if (this.animationId !== undefined) {
      cancelAnimationFrame(this.animationId);
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
    this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.removeEventListener('mouseup', this.handleMouseUp);
    this.renderer.domElement.removeEventListener('touchstart', this.handleTouchStart);
    this.renderer.domElement.removeEventListener('touchmove', this.handleTouchMove);
    this.renderer.domElement.removeEventListener('touchend', this.handleMouseUp);
    this.renderer.domElement.removeEventListener('wheel', this.handleWheel);
    this.renderer.domElement.removeEventListener('click', this.handleClick);
    
    // Remove renderer from DOM
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    
    // Dispose of Three.js resources
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
    
    // Dispose of starfield
    if (this.starfield) {
      this.starfield.dispose();
    }
    
    this.renderer.dispose();
  }
}
