/**
 *  Background animation script. 
 * 
 *  Script to render background animation for this portfolio site, main focus is for it to adapt dynamically to the screen size of the device being used,
 *  this is to help ensure smooth, seamless performance across most platforms to mitigate throttling of any kind. 
 */

class BackgroundAnimation {

    constructor(options = {}) {
        const deviceScreenWidth = window.innerWidth;
        const maxMobilePixelThreshold = 780;
        const isMobileDevice = deviceScreenWidth <= maxMobilePixelThreshold;
        
        // Destructure options correctly matching the instance config parameters
        const {
            canvasParent = 'main', 
            width = deviceScreenWidth, 
            height = window.innerHeight, 
            particleLifespan = isMobileDevice ? 200 : 600, // Measured in animation updates (frames)
            maxParticles = isMobileDevice ? 40 : 120,    // Dropped slightly for cleaner design & higher frame rates
            particlesPerSpawn = isMobileDevice ? 1 : 2,  
            spawnFrequency = isMobileDevice ? 12 : 6,    
            animationSpeed = isMobileDevice ? 1.25 : 1, 
            backgroundColour = 'rgba(4, 4, 7, 0.2)', 
            connectionLength = isMobileDevice ? 60 : 100, 
            paletteFile = '../../static/css/palettes/amg/palette.txt', 
        } = options;

        this.canvasParent = canvasParent;
        this.width = width;
        this.height = height;
        this.particleLifespan = particleLifespan;
        this.maxParticles = maxParticles;
        this.particlesPerSpawn = particlesPerSpawn;
        this.spawnFrequency = spawnFrequency;
        this.animationSpeed = animationSpeed;
        this.backgroundColour = backgroundColour;
        this.connectionLength = connectionLength;
        // Optimization: Pre-calculate squared distance constraint
        this.connectionLengthSq = connectionLength * connectionLength; 
        this.paletteFile = paletteFile;

        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.stepCount = 0;
        this.colourPalette = [];
        
        this.initCanvas();
        this.loadColourPallete()
            .then(() => this.startAnimation())
            .catch((error) => console.error('Error loading colour palette:', error));
    }

    initCanvas() {
        const parentElement = document.querySelector(this.canvasParent);
        if (!parentElement) {
            console.error(`Parent element "${this.canvasParent}" not found.`);
            return;
        }

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height; 

        parentElement.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        this.clearCanvas();
    }

    clearCanvas() {
        if (!this.ctx) return;
        this.ctx.fillStyle = this.backgroundColour;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    async loadColourPallete() {
        try {
            const response = await fetch(this.paletteFile);
            const text = await response.text();

            this.colourPalette = text 
                .split('\n')
                .map((line) => {
                    const match = line.match(/#([0-9A-Fa-f]{6})/);
                    return match ? `#${match[1]}` : null;
                })
                .filter(Boolean);
            
            if (this.colourPalette.length === 0){
                // Fallback palette so UI doesn't crash if network asset loading fails
                this.colourPalette = ['#03BFB5', '#018076', '#80142B'];
            }
        } catch (e) {
            this.colourPalette = ['#03BFB5', '#018076', '#80142B'];
        }
    }

    startAnimation() {
        const frame = () => {
            this.evolve(); 
            requestAnimationFrame(frame); 
        };
        requestAnimationFrame(frame);
    }

    evolve() {
        this.stepCount++;

        if (
            this.stepCount % this.spawnFrequency === 0 &&
            this.particles.length + this.particlesPerSpawn <= this.maxParticles
        ) {
            this.spawnParticles();
        }

        this.updateParticles(); 
        this.draw();
    }

    spawnParticles() {
        for (let i = 0; i < this.particlesPerSpawn; i++) {
            const particleColour = this.colourPalette[Math.floor(Math.random() * this.colourPalette.length)];

            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height, 
                xSpeed: (Math.random() - 0.5) * 1.5, // Standardized bi-directional vectors
                ySpeed: (Math.random() - 0.5) * 1.5, 
                age: 0,
                colour: particleColour
            });
        }
    }

    updateParticles() {
        // Process updates
        this.particles.forEach((particle) => {
            particle.x += this.animationSpeed * particle.xSpeed;
            particle.y += this.animationSpeed * particle.ySpeed;

            if (particle.x < 0) particle.x = this.width;
            if (particle.x > this.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.height;
            if (particle.y > this.height) particle.y = 0;
            
            particle.age++;
        });

        // Safe cleanup filtering avoiding array-mutation slicing skips
        this.particles = this.particles.filter(p => p.age <= this.particleLifespan);
    }

    draw() {
        if (!this.ctx) return;

        // Clear canvas frame context
        this.ctx.fillStyle = this.backgroundColour;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 1. Render connections first (cleaner design logic layering nodes on top)
        const len = this.particles.length;
        for (let i = 0; i < len; i++) {
            for (let j = i + 1; j < len; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distSq = dx * dx + dy * dy; // Avoiding Math.sqrt entirely

                if (distSq <= this.connectionLengthSq) {
                    this.ctx.beginPath(); // Crucial path buffer reset!
                    this.ctx.strokeStyle = p1.colour;
                    this.ctx.lineWidth = 0.5; 
                    // Lower opacity connection line for visual subtlety 
                    this.ctx.globalAlpha = 1 - (distSq / this.connectionLengthSq);
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            }
        }
        
        // Reset Alpha values back for Nodes
        this.ctx.globalAlpha = 1.0;

        // 2. Render particle nodes
        this.particles.forEach((particle) => {
            this.ctx.fillStyle = particle.colour;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 2.5, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    canvasResize() {
        if (!this.canvas) return;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.particles = [];
        this.clearCanvas();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const backgroundAnimation = new BackgroundAnimation({
        canvasParent: 'main',
        paletteFile: '/static/css/palettes/amg/palette.txt', 
    });

    window.addEventListener('resize', () => {
        if (backgroundAnimation) {
            backgroundAnimation.canvasResize();
        }
    });
});