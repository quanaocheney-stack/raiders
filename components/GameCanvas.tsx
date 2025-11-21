
import React, { useEffect, useRef, useCallback } from 'react';
import { 
  GameState, Player, Enemy, Bullet, LootItem, Particle, Point, Loadout,
  Turret, MetaUpgrades, LavaPool, Orbital, Mine, LaserTower, ChainBeam, TacticalType, Terrain, CharacterType
} from '../types';
import { 
  COLOR_PLAYER, COLOR_BULLET_PLAYER, COLOR_BULLET_ENEMY, COLOR_BULLET_MISSILE, COLOR_BULLET_TURRET,
  WEAPON_STATS, ENEMY_SPAWN_RATE_MS,
  COLOR_LOOT_DATA, COLOR_LOOT_HEALTH, COLOR_LOOT_SHIELD, COLOR_LOOT_EQUIPMENT, COLOR_EXTRACTION, EXTRACTION_TIME_SECONDS,
  TACTICAL_SHIELD_AMOUNT, SHIELD_REGEN_DELAY, SHIELD_REGEN_RATE,
  MISSILE_COOLDOWN, MISSILE_DAMAGE, TURRET_STATS, LAVA_STATS,
  PLAYER_LIVES, BOSS_SPAWN_INTERVAL, XP_PER_SCRAP, LEVEL_XP_BASE,
  MAP_THEMES, ENEMY_HP_SCALE, ENEMY_DMG_SCALE, COLOR_TREASURE,
  LASER_CHAIN_STATS, LASER_STATS,
  COLOR_ENEMY_DRONE, COLOR_ENEMY_RUSHER, COLOR_ENEMY_TANK,
  COLOR_ENEMY_BOMBER, COLOR_ENEMY_ROLLER, COLOR_ENEMY_OCTO,
  COLOR_ENEMY_MAGMA, COLOR_ENEMY_FROST, COLOR_ENEMY_ROOTER,
  COLOR_BULLET_FROST, COLOR_BULLET_ROOT,
  ORBITAL_STATS, INVINCIBILITY_DURATION, SUPPLY_DROP_INTERVAL,
  MINE_STATS, COLOR_FRIENDLY_ZONE, COLOR_FRIENDLY_OUTLINE,
  FREEZE_DURATION, ROOT_DURATION, CHARACTERS
} from '../constants';
import { audio } from '../services/audioService';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  targetLootCount: number;
  loadout: Loadout;
  tacticalLevels: Record<TacticalType, number>;
  onUpdateStats: (stats: any) => void;
  onShowUpgradeMenu: (show: boolean, canUpgrade: boolean) => void;
  upgradeTrigger: number; 
  level: number;
  metaUpgrades: MetaUpgrades;
  biomeIndex?: number;
  rewardType?: 'WEAPON_PLASMA' | 'WEAPON_GAUSS' | 'UPGRADE_POINTS';
  isPaused: boolean;
  characterType: CharacterType;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  setGameState, 
  targetLootCount,
  loadout,
  tacticalLevels,
  onUpdateStats,
  onShowUpgradeMenu,
  upgradeTrigger,
  level,
  metaUpgrades,
  biomeIndex = 0,
  rewardType,
  isPaused,
  characterType
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs
  const playerRef = useRef<Player>({
    id: 'player', x: 0, y: 0, vx: 0, vy: 0, radius: 12, 
    color: COLOR_PLAYER, active: true, hp: 100, maxHp: 100, speed: 4,
    shield: 0, maxShield: 0, lastShieldHit: 0,
    ammo: 100, loot: 0, scrap: 0, tech: 0, 
    xp: 0, maxXp: LEVEL_XP_BASE,
    angle: 0, 
    loadout: { weapon: 'RIFLE' },
    tacticals: { SHIELD: 0, MISSILE: 0, LASER_CHAIN: 0 },
    weaponLevel: 1,
    lives: PLAYER_LIVES,
    invincibleUntil: 0,
    frozenUntil: 0,
    rootedUntil: 0,
    character: 'ASSAULT',
    respawnTimer: 0
  });
  
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const turretsRef = useRef<Turret[]>([]);
  const lasersRef = useRef<LaserTower[]>([]);
  const minesRef = useRef<Mine[]>([]);
  const orbitalsRef = useRef<Orbital[]>([]);
  const lavaRef = useRef<LavaPool[]>([]); 
  const terrainRef = useRef<Terrain[]>([]); 
  const chainBeamsRef = useRef<ChainBeam[]>([]);
  const lootRef = useRef<LootItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  const keysPressed = useRef<Set<string>>(new Set());
  const mousePos = useRef<Point>({ x: 0, y: 0 });
  
  const touchInput = useRef<{
    left: { id: number | null, startX: number, startY: number, currX: number, currY: number, active: boolean },
    right: { id: number | null, startX: number, startY: number, currX: number, currY: number, active: boolean }
  }>({
    left: { id: null, startX: 0, startY: 0, currX: 0, currY: 0, active: false },
    right: { id: null, startX: 0, startY: 0, currX: 0, currY: 0, active: false }
  });
  const JOYSTICK_MAX_RADIUS = 50;

  const lastShotTime = useRef<number>(0);
  const lastMissileTime = useRef<number>(0);
  const lastChainLaserTime = useRef<number>(0);

  const lastSpawnTime = useRef<number>(0);
  const lastSupplyDropTime = useRef<number>(0);
  
  const extractionZoneRef = useRef<{x: number, y: number, radius: number} | null>(null);
  const extractionTimerRef = useRef<number>(0);
  const isGameRunningRef = useRef(false);
  
  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  const theme = MAP_THEMES[biomeIndex % MAP_THEMES.length];

  const createParticles = (x: number, y: number, color: string, count: number, speed = 3) => {
    if (particlesRef.current.length > 200) return;
    for(let i=0; i<count; i++) {
      particlesRef.current.push({
        id: Math.random().toString(),
        x, y,
        vx: random(-speed, speed),
        vy: random(-speed, speed),
        radius: random(1, 3),
        color,
        life: 1.0,
        maxLife: 1.0,
        active: true
      });
    }
  };

  useEffect(() => {
    if (upgradeTrigger > 0) {
      const p = playerRef.current;
      createParticles(p.x, p.y, '#00ffff', 30, 5);
      p.xp = 0;
      p.maxXp = Math.floor(p.maxXp * 1.3);
    }
  }, [upgradeTrigger]);

  const generateMap = (width: number, height: number) => {
    lootRef.current = [];
    enemiesRef.current = [];
    turretsRef.current = [];
    lasersRef.current = [];
    minesRef.current = [];
    orbitalsRef.current = [];
    lavaRef.current = [];
    bulletsRef.current = [];
    chainBeamsRef.current = [];
    particlesRef.current = [];
    terrainRef.current = [];

    const safeZone = 200; 

    if (biomeIndex % 4 === 1) {
        for(let i=0; i<8; i++) {
            const r = random(40, 80);
            let x = random(r, width-r);
            let y = random(r, height-r);
            if (Math.abs(x - width/2) < safeZone && Math.abs(y - height/2) < safeZone) continue;
            terrainRef.current.push({ id: `lava-${i}`, x, y, vx: 0, vy: 0, radius: r, color: '#ff4400', active: true, type: 'LAVA_POOL' });
        }
    }

    if (biomeIndex % 4 === 2) {
        for(let i=0; i<15; i++) {
            const r = random(20, 40);
            let x = random(r, width-r);
            let y = random(r, height-r);
            if (Math.abs(x - width/2) < safeZone && Math.abs(y - height/2) < safeZone) continue;
            terrainRef.current.push({ id: `ice-${i}`, x, y, vx: 0, vy: 0, radius: r, color: theme.obstacleColor || '#555', active: true, type: 'OBSTACLE' });
        }
    }

    if (biomeIndex % 4 === 3) {
        for(let i=0; i<20; i++) {
            const r = random(15, 35);
            let x = random(r, width-r);
            let y = random(r, height-r);
            if (Math.abs(x - width/2) < safeZone && Math.abs(y - height/2) < safeZone) continue;
            terrainRef.current.push({ id: `tree-${i}`, x, y, vx: 0, vy: 0, radius: r, color: theme.obstacleColor || '#252', active: true, type: 'OBSTACLE' });
        }
    }

    if (rewardType) {
       let tx = random(100, width-100);
       let ty = random(100, height-100);
       lootRef.current.push({
          id: 'treasure-chest', x: tx, y: ty, vx: 0, vy: 0, radius: 15, 
          color: COLOR_TREASURE, active: true, value: 500, type: 'TREASURE'
       });
    }
  };

  const initGame = useCallback(() => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current;
    
    let startMaxShield = 0;
    if (tacticalLevels.SHIELD > 0) {
        startMaxShield = TACTICAL_SHIELD_AMOUNT + ((tacticalLevels.SHIELD - 1) * 25);
    }
    startMaxShield += metaUpgrades.shieldCap;

    const p = playerRef.current;
    const charStats = CHARACTERS[characterType];
    
    playerRef.current = {
      ...p,
      x: width / 2, y: height / 2, vx: 0, vy: 0,
      character: characterType,
      hp: p.hp > 0 ? p.hp : charStats.hp + (metaUpgrades.shieldCap > 0 ? metaUpgrades.shieldCap : 0), 
      maxHp: charStats.hp, 
      speed: charStats.speed,
      color: charStats.color,
      loadout: { weapon: charStats.weapon }, 
      shield: startMaxShield, maxShield: startMaxShield,
      tacticals: tacticalLevels,
      lives: p.lives > 0 ? p.lives : PLAYER_LIVES,
      invincibleUntil: performance.now() + 2000, 
      frozenUntil: 0,
      rootedUntil: 0,
      active: true,
      respawnTimer: 0
    };
    
    extractionZoneRef.current = null;
    extractionTimerRef.current = 0;
    lastSupplyDropTime.current = 0;
    generateMap(width, height);
  }, [loadout, level, metaUpgrades, theme, rewardType, tacticalLevels, biomeIndex, characterType]);

  useEffect(() => {
    if (gameState === GameState.LOADING_MISSION) {
       enemiesRef.current = [];
       lootRef.current = [];
       particlesRef.current = [];
       lavaRef.current = [];
       bulletsRef.current = [];
       minesRef.current = [];
       lasersRef.current = [];
       orbitalsRef.current = [];
       turretsRef.current = [];
       chainBeamsRef.current = [];
       terrainRef.current = [];
       isGameRunningRef.current = false;
    } else if (gameState === GameState.PLAYING) {
       if (!isGameRunningRef.current) {
          initGame();
          isGameRunningRef.current = true;
       }
    }
  }, [gameState, initGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.code);
    const handleMouseMove = (e: MouseEvent) => { mousePos.current = { x: e.clientX, y: e.clientY }; };
    const handleMouseDown = (e: MouseEvent) => keysPressed.current.add('MouseLeft');
    const handleMouseUp = (e: MouseEvent) => keysPressed.current.delete('MouseLeft');

    const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        const width = canvasRef.current?.width || window.innerWidth;
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.clientX < width / 2) {
                if (!touchInput.current.left.active) {
                    touchInput.current.left = {
                        id: t.identifier,
                        startX: t.clientX, startY: t.clientY,
                        currX: t.clientX, currY: t.clientY,
                        active: true
                    };
                }
            } else {
                if (!touchInput.current.right.active) {
                    touchInput.current.right = {
                        id: t.identifier,
                        startX: t.clientX, startY: t.clientY,
                        currX: t.clientX, currY: t.clientY,
                        active: true
                    };
                }
            }
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (touchInput.current.left.id === t.identifier) {
                touchInput.current.left.currX = t.clientX;
                touchInput.current.left.currY = t.clientY;
            }
            if (touchInput.current.right.id === t.identifier) {
                touchInput.current.right.currX = t.clientX;
                touchInput.current.right.currY = t.clientY;
            }
        }
    };

    const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (touchInput.current.left.id === t.identifier) {
                touchInput.current.left.active = false;
                touchInput.current.left.id = null;
            }
            if (touchInput.current.right.id === t.identifier) {
                touchInput.current.right.active = false;
                touchInput.current.right.id = null;
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    const canvas = canvasRef.current;
    if (canvas) {
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchEnd);
      }
    };
  }, []);

  const drawAstronaut = (ctx: CanvasRenderingContext2D, p: Player, timestamp: number) => {
    if (!p.active) {
        // Draw placeholder or ghost when dead
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        const timeLeft = Math.max(0, (p.respawnTimer - timestamp) / 1000).toFixed(1);
        ctx.fillText(`REBOOTING: ${timeLeft}`, p.x, p.y - 30);
        return;
    }

    ctx.save(); ctx.translate(p.x, p.y);
    if (timestamp < p.invincibleUntil && Math.floor(timestamp / 100) % 2 === 0) ctx.globalAlpha = 0.5;
    
    if (timestamp < p.frozenUntil) {
        ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff';
    }
    if (timestamp < p.rootedUntil) {
        ctx.shadowBlur = 10; ctx.shadowColor = '#00ff00';
    }

    ctx.rotate(p.angle);
    
    const isMoving = !isPaused && (p.vx !== 0 || p.vy !== 0);
    const walkCycle = isMoving ? Math.sin(timestamp * 0.015) : 0;
    
    // Feet
    ctx.fillStyle = '#e0e0e0'; ctx.beginPath(); ctx.ellipse(-6 + walkCycle * 3, 4, 4, 6, 0, 0, Math.PI*2); ctx.fill(); 
    ctx.beginPath(); ctx.ellipse(-6 - walkCycle * 3, -4, 4, 6, 0, 0, Math.PI*2); ctx.fill();
    
    // Body
    ctx.fillStyle = p.color; ctx.fillRect(-14, -8, 6, 16); // Uniform color based on character
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI*2); ctx.fill();
    
    // Shoulders
    ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(0, 8, 4, 0, Math.PI*2); ctx.arc(0, -8, 4, 0, Math.PI*2); ctx.fill();
    
    // Arms
    ctx.lineWidth = 4; ctx.strokeStyle = '#eee'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(10, 4); ctx.moveTo(0, -8); ctx.lineTo(10, -2); ctx.stroke();
    
    // Helmet
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(2, 0, 7, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.ellipse(4, 0, 3, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(0, 255, 255, 0.8)'; ctx.beginPath(); ctx.ellipse(5, -2, 1, 2, Math.PI/4, 0, Math.PI*2); ctx.fill();
    
    // Weapon
    ctx.fillStyle = '#444'; ctx.fillRect(8, -2, 16, 4);
    if (p.loadout.weapon === 'PLASMA') { ctx.fillStyle='#0ff'; ctx.fillRect(10, -1, 10, 2); }
    if (p.loadout.weapon === 'GAUSS') { ctx.fillStyle='#f0f'; ctx.fillRect(8, -3, 18, 6); }

    ctx.shadowBlur = 0; 
    ctx.restore();

    // Draw Status Indicators
    if (timestamp < p.frozenUntil) {
        ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.beginPath(); ctx.rect(p.x - 12, p.y - 15, 24, 30); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.stroke();
    }
    if (timestamp < p.rootedUntil) {
        ctx.strokeStyle = '#0f0'; ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, 14, 0, Math.PI*2); 
        ctx.moveTo(p.x - 14, p.y); ctx.lineTo(p.x + 14, p.y);
        ctx.stroke();
    }

    // Holographic Rings
    ctx.lineWidth = 2;
    const hpPct = p.hp / p.maxHp;
    const shieldPct = p.maxShield > 0 ? p.shield / p.maxShield : 0;
    
    // HP Ring
    ctx.strokeStyle = hpPct > 0.5 ? `rgba(0, 255, 0, 0.3)` : `rgba(255, 0, 0, 0.5)`;
    ctx.beginPath(); ctx.arc(p.x, p.y, 25, 0, Math.PI * 2 * hpPct); ctx.stroke();
    
    // Shield Ring
    if (p.maxShield > 0) {
        ctx.strokeStyle = `rgba(0, 200, 255, 0.4)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 28, 0, Math.PI * 2 * shieldPct); ctx.stroke();
    }
  };

  const drawSciFiEnemy = (ctx: CanvasRenderingContext2D, e: Enemy, timestamp: number) => {
     ctx.save(); ctx.translate(e.x, e.y);
     
     if (e.type === 'DRONE') {
        const rot = timestamp * 0.003;
        const pulse = (Math.sin(timestamp * 0.01) + 1) * 0.5;
        
        // Rotating Outer Shell (3 Segments)
        ctx.save();
        ctx.rotate(rot);
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 5 + pulse * 5;
        
        for(let i=0; i<3; i++) {
            ctx.rotate((Math.PI * 2) / 3);
            ctx.beginPath();
            ctx.arc(0, 0, e.radius, -0.6, 0.6); // Arcs
            ctx.stroke();
            // Tips
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(e.radius, 0, 2, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
        
        // Inner Structure (Spinning Opposite)
        ctx.save();
        ctx.rotate(-rot * 1.5);
        ctx.fillStyle = 'rgba(0, 20, 40, 0.8)';
        ctx.beginPath();
        ctx.moveTo(0, -e.radius * 0.6);
        ctx.lineTo(e.radius * 0.6, 0);
        ctx.lineTo(0, e.radius * 0.6);
        ctx.lineTo(-e.radius * 0.6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // Central Core
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;

     } else if (e.type === 'RUSHER') {
        const rot = timestamp * 0.02; ctx.rotate(rot); ctx.fillStyle = e.color; ctx.beginPath();
        for(let i = 0; i < 5; i++) { const angle = (Math.PI * 2 / 5) * i; ctx.lineTo(Math.cos(angle) * e.radius, Math.sin(angle) * e.radius); const angleInner = angle + (Math.PI / 5); ctx.lineTo(Math.cos(angleInner) * (e.radius * 0.4), Math.sin(angleInner) * (e.radius * 0.4)); }
        ctx.closePath(); ctx.fill();
        const pulse = 1 + Math.sin(timestamp * 0.02) * 0.3; ctx.fillStyle = '#500'; ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.4 * pulse, 0, Math.PI*2); ctx.fill();
     } else if (e.type === 'TANK') {
        const angleToPlayer = Math.atan2(playerRef.current.y - e.y, playerRef.current.x - e.x);
        
        // Chassis - Heavy Industrial Look
        ctx.save(); 
        if(Math.abs(e.vx) > 0.1 || Math.abs(e.vy) > 0.1) { ctx.rotate(Math.sin(timestamp * 0.01) * 0.05); }
        
        // Tracks
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-22, -20, 12, 40); // Left Track
        ctx.fillRect(10, -20, 12, 40);  // Right Track
        
        // Animated Tread Lines
        ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
        const treadOffset = (timestamp * 0.03) % 8;
        ctx.beginPath();
        for(let y = -20 + treadOffset; y < 20; y+=8) {
             ctx.moveTo(-22, y); ctx.lineTo(-10, y);
             ctx.moveTo(10, y); ctx.lineTo(22, y);
        }
        ctx.stroke();
        
        // Main Body
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.moveTo(-14, -18); ctx.lineTo(14, -18);
        ctx.lineTo(16, 18); ctx.lineTo(-16, 18);
        ctx.fill();
        
        // Armor Plates
        ctx.fillStyle = e.color; // Accent Color
        ctx.fillRect(-10, -10, 20, 20);
        
        // Rear Engine Glow
        ctx.fillStyle = 'rgba(255, 50, 0, 0.8)';
        ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 10;
        ctx.fillRect(-8, 16, 4, 3); ctx.fillRect(4, 16, 4, 3);
        ctx.shadowBlur = 0;

        ctx.restore();

        // Turret
        ctx.save();
        ctx.rotate(angleToPlayer);
        
        // Turret Base
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill();
        
        // Cannon Barrels (Dual Railgun style)
        ctx.fillStyle = '#111';
        ctx.fillRect(8, -6, 24, 4);
        ctx.fillRect(8, 2, 24, 4);
        
        // Turret Housing
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(-8, -10); ctx.lineTo(8, -8); ctx.lineTo(12, 0); ctx.lineTo(8, 8); ctx.lineTo(-8, 10);
        ctx.closePath();
        ctx.fill();
        
        // Turret Tech Detail
        ctx.fillStyle = '#00ffff'; 
        ctx.fillRect(-2, -2, 4, 4); // Small CPU light
        
        // Firing Flash
        if (timestamp - (e.lastAttackTime||0) < 150) { 
            ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 20;
            ctx.fillStyle = '#fff'; 
            ctx.beginPath(); ctx.arc(32, -4, 5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(32, 4, 5, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0; 
        }
        ctx.restore();
     } else if (e.type === 'BOMBER') {
        const angleToPlayer = Math.atan2(playerRef.current.y - e.y, playerRef.current.x - e.x);
        ctx.rotate(angleToPlayer); ctx.fillStyle = e.color; ctx.beginPath(); ctx.moveTo(e.radius, 0); ctx.lineTo(-e.radius, e.radius/2); ctx.lineTo(-e.radius, -e.radius/2); ctx.fill();
        ctx.fillStyle = '#0ff'; ctx.beginPath(); ctx.arc(-e.radius - 4, 0, 4 + Math.random()*2, 0, Math.PI*2); ctx.fill();
     } else if (e.type === 'ROLLER') {
        const roll = (Math.abs(e.vx) + Math.abs(e.vy)) * timestamp * 0.01; ctx.rotate(roll); ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#330000'; ctx.beginPath(); ctx.arc(6, 0, 4, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(-6, 0, 4, 0, Math.PI*2); ctx.fill();
        if (timestamp - (e.lastAttackTime||0) < 500) { ctx.fillStyle = 'rgba(255, 100, 0, 0.5)'; ctx.beginPath(); ctx.arc(0, 0, e.radius + 5, 0, Math.PI*2); ctx.fill(); }
     } else if (e.type === 'OCTO') {
        const pulse = Math.sin(timestamp * 0.005); ctx.fillStyle = '#220033'; ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.7, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = e.color; ctx.lineWidth = 3;
        for(let i=0; i<4; i++) { const angle = (Math.PI/2) * i + (timestamp * 0.001); const len = e.radius + pulse * 5; ctx.beginPath(); ctx.moveTo(Math.cos(angle)*10, Math.sin(angle)*10); ctx.quadraticCurveTo(Math.cos(angle)*len*1.5, Math.sin(angle)*len*1.5, Math.cos(angle+0.5)*len, Math.sin(angle+0.5)*len); ctx.stroke(); }
        ctx.fillStyle = '#0f0'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
     } else if (e.type === 'MAGMA') {
        const pulse = Math.abs(Math.sin(timestamp * 0.005)); 
        ctx.fillStyle = `rgba(255, 50, 0, ${0.5 + pulse * 0.5})`; ctx.beginPath(); ctx.arc(0, 0, e.radius + 5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#500'; ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fa0'; ctx.beginPath(); ctx.arc(random(-5,5), random(-5,5), e.radius/2, 0, Math.PI*2); ctx.fill();
     } else if (e.type === 'FROST') {
        ctx.rotate(timestamp * 0.002);
        ctx.fillStyle = 'rgba(200, 240, 255, 0.8)'; ctx.beginPath();
        for(let i=0; i<6; i++) { const angle = (Math.PI*2/6)*i; ctx.lineTo(Math.cos(angle)*e.radius, Math.sin(angle)*e.radius); ctx.lineTo(Math.cos(angle + 0.5)*(e.radius*0.4), Math.sin(angle+0.5)*(e.radius*0.4)); }
        ctx.fill();
     } else if (e.type === 'ROOTER') {
        ctx.strokeStyle = e.color; ctx.lineWidth = 3; ctx.beginPath();
        for(let i=0; i<8; i++) { const angle = (Math.PI*2/8)*i + Math.sin(timestamp*0.005 + i); ctx.moveTo(0,0); ctx.quadraticCurveTo(Math.cos(angle)*e.radius*1.5, Math.sin(angle)*e.radius*1.5, Math.cos(angle)*e.radius, Math.sin(angle)*e.radius); }
        ctx.stroke();
        ctx.fillStyle = '#050'; ctx.beginPath(); ctx.arc(0, 0, e.radius*0.6, 0, Math.PI*2); ctx.fill();
     } else if (e.type === 'BOSS') {
        const rot = timestamp * 0.002; ctx.rotate(rot); ctx.strokeStyle = e.color; ctx.lineWidth = 3; ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = (Math.PI * 2 / 6) * i; ctx.moveTo(Math.cos(a) * e.radius, Math.sin(a) * e.radius); ctx.lineTo(Math.cos(a + 0.5) * e.radius, Math.sin(a + 0.5) * e.radius); }
        ctx.stroke(); ctx.rotate(-rot * 3); ctx.fillStyle = '#220022'; ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.6, 0, Math.PI*2); ctx.fill();
        const pulse = Math.abs(Math.sin(timestamp * 0.005)); ctx.fillStyle = 'rgba(255, 0, 255, 0.3)'; ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.8 * (1+pulse*0.2), 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ff00ff'; ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.3, 0, Math.PI*2); ctx.fill(); 
     }
     ctx.restore();
     ctx.save(); ctx.translate(e.x, e.y);
     if (e.hp < e.maxHp) { const width = 30; const height = 4; ctx.fillStyle='#300'; ctx.fillRect(-width/2, -e.radius - 10, width, height); ctx.fillStyle='#0f0'; ctx.fillRect(-width/2, -e.radius - 10, width*(e.hp/e.maxHp), height); }
     ctx.restore();
  };

  const drawJoystick = (ctx: CanvasRenderingContext2D, stick: { startX: number, startY: number, currX: number, currY: number, active: boolean }, color: string) => {
     if (!stick.active) return;
     
     ctx.beginPath();
     ctx.arc(stick.startX, stick.startY, JOYSTICK_MAX_RADIUS, 0, Math.PI * 2);
     ctx.lineWidth = 2;
     ctx.strokeStyle = color;
     ctx.globalAlpha = 0.3;
     ctx.stroke();
     ctx.globalAlpha = 0.1;
     ctx.fill();
     
     const dx = stick.currX - stick.startX;
     const dy = stick.currY - stick.startY;
     const dist = Math.sqrt(dx*dx + dy*dy);
     const limit = Math.min(dist, JOYSTICK_MAX_RADIUS);
     const angle = Math.atan2(dy, dx);
     
     const stickX = stick.startX + Math.cos(angle) * limit;
     const stickY = stick.startY + Math.sin(angle) * limit;
     
     ctx.globalAlpha = 0.8;
     ctx.beginPath();
     ctx.arc(stickX, stickY, 20, 0, Math.PI * 2);
     ctx.fillStyle = color;
     ctx.fill();
     ctx.globalAlpha = 1.0;
  };

  useEffect(() => {
    if (gameState !== GameState.PLAYING && gameState !== GameState.EXTRACTING && gameState !== GameState.UPGRADING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const loop = (timestamp: number) => {
      try {
        const width = canvas.width;
        const height = canvas.height;

        if (gameState !== GameState.UPGRADING && !isPaused) {
            const player = playerRef.current;
            
            // Handle Respawn
            if (!player.active) {
                if (timestamp > player.respawnTimer) {
                    player.active = true;
                    player.hp = player.maxHp;
                    player.shield = player.maxShield;
                    player.invincibleUntil = timestamp + 3000;
                    player.frozenUntil = 0;
                    player.rootedUntil = 0;
                    createParticles(player.x, player.y, '#00ff00', 30, 5);
                    audio.playLevelUp();
                    // Push enemies away
                    enemiesRef.current.forEach(en => {
                        const dx = en.x - player.x;
                        const dy = en.y - player.y;
                        const d = Math.sqrt(dx*dx + dy*dy);
                        const push = 300;
                        const angle = Math.atan2(dy, dx);
                        en.x = player.x + Math.cos(angle) * (d + push);
                        en.y = player.y + Math.sin(angle) * (d + push);
                    });
                }
            }

            if (player.xp >= player.maxXp) { onShowUpgradeMenu(true, true); }

            const isFrozen = timestamp < player.frozenUntil;
            const isRooted = timestamp < player.rootedUntil;
            const canMove = !isFrozen && !isRooted && player.active;
            const canShoot = !isFrozen && player.active;

            let dx = 0; let dy = 0;
            if (canMove) {
                if (keysPressed.current.has('KeyW')) dy -= 1;
                if (keysPressed.current.has('KeyS')) dy += 1;
                if (keysPressed.current.has('KeyA')) dx -= 1;
                if (keysPressed.current.has('KeyD')) dx += 1;

                if (touchInput.current.left.active) {
                    const lStick = touchInput.current.left;
                    const diffX = lStick.currX - lStick.startX;
                    const diffY = lStick.currY - lStick.startY;
                    const dist = Math.sqrt(diffX*diffX + diffY*diffY);
                    const norm = Math.min(dist, JOYSTICK_MAX_RADIUS) / JOYSTICK_MAX_RADIUS;
                    const angle = Math.atan2(diffY, diffX);
                    dx += Math.cos(angle) * norm;
                    dy += Math.sin(angle) * norm;
                }
            }

            if (dx !== 0 || dy !== 0) {
               const length = Math.sqrt(dx * dx + dy * dy);
               const speedMult = length > 1 ? 1 : length; 
               const dirX = dx / length; 
               const dirY = dy / length;
               
               const currentSpeed = player.speed; // Use Character Speed
               const nextX = player.x + dirX * currentSpeed * speedMult;
               const nextY = player.y + dirY * currentSpeed * speedMult;
               
               let collides = false;
               for (const t of terrainRef.current) {
                   if (t.type === 'OBSTACLE') {
                       const d = Math.sqrt((nextX - t.x)**2 + (nextY - t.y)**2);
                       if (d < player.radius + t.radius) {
                           collides = true; 
                           break;
                       }
                   }
               }

               if (!collides) {
                   player.vx = dirX * currentSpeed * speedMult;
                   player.vy = dirY * currentSpeed * speedMult;
                   player.x += player.vx;
                   player.y += player.vy;
               } else {
                   player.vx = 0; player.vy = 0;
               }

            } else { 
                player.vx = 0; player.vy = 0; 
            }

            player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
            player.y = Math.max(player.radius, Math.min(height - player.radius, player.y));

            if (player.active) {
                if (touchInput.current.right.active) {
                    const rStick = touchInput.current.right;
                    player.angle = Math.atan2(rStick.currY - rStick.startY, rStick.currX - rStick.startX);
                } else {
                    player.angle = Math.atan2(mousePos.current.y - player.y, mousePos.current.x - player.x);
                }
            }

            if (player.tacticals.SHIELD > 0 && player.maxShield > 0 && player.active) {
               if (timestamp - player.lastShieldHit > SHIELD_REGEN_DELAY) {
                 if (player.shield < player.maxShield) player.shield = Math.min(player.maxShield, player.shield + SHIELD_REGEN_RATE);
               }
            }

            if (player.tacticals.MISSILE > 0 && player.active) {
              if (timestamp - lastMissileTime.current > MISSILE_COOLDOWN) {
                const range = 600 + (player.tacticals.MISSILE - 1) * 150; 
                const damage = MISSILE_DAMAGE + (player.tacticals.MISSILE - 1) * 25;
                let nearest = null; let minDst = Infinity;
                for (const e of enemiesRef.current) { const dst = Math.sqrt((e.x - player.x)**2 + (e.y - player.y)**2); if (dst < range && dst < minDst) { minDst = dst; nearest = e; } }
                if (nearest) {
                  audio.playShoot('MISSILE');
                  const count = 1 + metaUpgrades.missileCount;
                  for(let i=0; i<count; i++) {
                      const offsetX = (Math.random() - 0.5) * 30;
                      bulletsRef.current.push({ id: Math.random().toString(), x: player.x + offsetX, y: player.y - 10, vx: (Math.random() - 0.5) * 2, vy: -2, radius: 8, color: COLOR_BULLET_MISSILE, active: true, damage: damage, owner: 'PLAYER', isHoming: true, targetId: nearest.id });
                  }
                  lastMissileTime.current = timestamp;
                }
              }
            }

            if (player.tacticals.LASER_CHAIN > 0 && player.active) {
              if (timestamp - lastChainLaserTime.current > LASER_CHAIN_STATS.COOLDOWN) {
                 const range = LASER_CHAIN_STATS.RANGE;
                 const damageMult = 1.0 + (metaUpgrades.laserTech * 0.2); 
                 const damage = (LASER_CHAIN_STATS.DAMAGE + (player.tacticals.LASER_CHAIN - 1) * 20) * damageMult;
                 
                 let extraBounces = 0;
                 if (metaUpgrades.laserTech >= 3) extraBounces += 1;
                 if (metaUpgrades.laserTech >= 5) extraBounces += 2;

                 const maxBounces = LASER_CHAIN_STATS.BASE_BOUNCES + (player.tacticals.LASER_CHAIN - 1) + extraBounces;
                 const bounceRange = LASER_CHAIN_STATS.BOUNCE_RANGE;
                 
                 let nearest = null; let minDst = Infinity;
                 for (const e of enemiesRef.current) { 
                   if (!e.active) continue;
                   const dst = Math.sqrt((e.x - player.x)**2 + (e.y - player.y)**2); 
                   if (dst < range && dst < minDst) { minDst = dst; nearest = e; } 
                 }

                 if (nearest) {
                    audio.playShoot('CHAIN_LASER');
                    lastChainLaserTime.current = timestamp;
                    
                    let color = '#00ffff'; 
                    if (player.tacticals.LASER_CHAIN >= 2) color = '#bf00ff'; 
                    if (player.tacticals.LASER_CHAIN >= 3) color = '#ff0000'; 
                    if (player.tacticals.LASER_CHAIN >= 5) color = '#ffffff'; 

                    const hitIds = new Set<string>();
                    const beamPoints: Point[] = [{x: player.x, y: player.y}];
                    let currentTarget = nearest;
                    let bounces = 0;

                    while (currentTarget && bounces < maxBounces) {
                       hitIds.add(currentTarget.id);
                       beamPoints.push({x: currentTarget.x, y: currentTarget.y});
                       currentTarget.hp -= damage;
                       createParticles(currentTarget.x, currentTarget.y, color, 5, 2);

                       let nextTarget = null;
                       let nextMinDst = Infinity;
                       for (const e of enemiesRef.current) {
                          if (!e.active || hitIds.has(e.id)) continue;
                          const dst = Math.sqrt((e.x - currentTarget.x)**2 + (e.y - currentTarget.y)**2);
                          if (dst < bounceRange && dst < nextMinDst) {
                             nextMinDst = dst;
                             nextTarget = e;
                          }
                       }
                       currentTarget = nextTarget!;
                       bounces++;
                    }
                    if (beamPoints.length > 1) {
                      chainBeamsRef.current.push({ id: Math.random().toString(), x: 0, y: 0, vx: 0, vy: 0, radius: 0, active: true, color: color, points: beamPoints, life: 0.4, maxLife: 0.4, width: 4 + (player.tacticals.LASER_CHAIN) });
                    }
                 }
              }
            }

            let shouldFire = keysPressed.current.has('MouseLeft');
            if (touchInput.current.right.active) {
                const rStick = touchInput.current.right;
                const dist = Math.sqrt((rStick.currX - rStick.startX)**2 + (rStick.currY - rStick.startY)**2);
                if (dist > 10) shouldFire = true; 
            }

            if (shouldFire && canShoot) {
              const stats = WEAPON_STATS[player.loadout.weapon];
              const dmgMult = (1 + (player.weaponLevel - 1) * 0.2) * (1 + metaUpgrades.weaponPower * 0.2); 
              if (timestamp - lastShotTime.current > stats.fireRate) {
                audio.playShoot(player.loadout.weapon);
                for(let i=0; i < stats.count; i++) {
                  const spreadAngle = (Math.random() - 0.5) * stats.spread; const finalAngle = player.angle + spreadAngle;
                  bulletsRef.current.push({
                    id: Math.random().toString(), x: player.x + Math.cos(player.angle) * 20, y: player.y + Math.sin(player.angle) * 20,
                    vx: Math.cos(finalAngle) * stats.speed, vy: Math.sin(finalAngle) * stats.speed, radius: player.loadout.weapon === 'SNIPER' || player.loadout.weapon === 'GAUSS' ? 4 : 3,
                    color: player.loadout.weapon === 'PLASMA' ? '#00ffff' : (player.loadout.weapon === 'GAUSS' ? '#ff00ff' : COLOR_BULLET_PLAYER), 
                    active: true, damage: stats.damage * dmgMult, owner: 'PLAYER'
                  });
                }
                lastShotTime.current = timestamp;
              }
            }

            orbitalsRef.current.forEach(o => {
               o.angleOffset += o.speed;
               o.x = player.x + Math.cos(o.angleOffset) * o.orbitRadius;
               o.y = player.y + Math.sin(o.angleOffset) * o.orbitRadius;
               enemiesRef.current.forEach(e => {
                 if (!e.active) return;
                 const d = Math.sqrt((e.x - o.x)**2 + (e.y - o.y)**2);
                 if (d < e.radius + o.radius) { e.hp -= o.damage; createParticles(e.x, e.y, o.color, 1, 2); }
               });
            });

            turretsRef.current.forEach(turret => {
               turret.life -= 16.6; if (turret.life <= 0) { turret.active = false; createParticles(turret.x, turret.y, '#555', 5); return; }
               let nearest = null; let minDst = Infinity;
               for(const e of enemiesRef.current) { const d = Math.sqrt((e.x - turret.x)**2 + (e.y - turret.y)**2); if (d < TURRET_STATS.RANGE && d < minDst) { minDst = d; nearest = e; } }
               if (nearest) {
                  turret.angle = Math.atan2(nearest.y - turret.y, nearest.x - turret.x);
                  if (timestamp - turret.lastFireTime > TURRET_STATS.FIRE_RATE) { audio.playShoot('TURRET'); bulletsRef.current.push({ id: Math.random().toString(), x: turret.x, y: turret.y, vx: Math.cos(turret.angle) * 15, vy: Math.sin(turret.angle) * 15, radius: 3, color: COLOR_BULLET_TURRET, active: true, damage: TURRET_STATS.DAMAGE + (player.weaponLevel * 5), owner: 'TURRET' }); turret.lastFireTime = timestamp; }
               }
            });
            turretsRef.current = turretsRef.current.filter(t => t.active);

            lasersRef.current.forEach(laser => {
               laser.life -= 16.6; if (laser.life <= 0) { laser.active = false; return; }
               
               const levelBonus = metaUpgrades.laserTech;
               const effectiveRange = laser.range * (1 + levelBonus * 0.1);
               const effectiveDamage = laser.damage * (1 + levelBonus * 0.2);
               
               let targets = [];
               
               if (levelBonus >= 5) {
                   targets = enemiesRef.current.filter(e => {
                       const d = Math.sqrt((e.x - laser.x)**2 + (e.y - laser.y)**2);
                       return d < effectiveRange;
                   });
               } else if (levelBonus >= 3) {
                   const sorted = enemiesRef.current
                       .map(e => ({ e, d: Math.sqrt((e.x - laser.x)**2 + (e.y - laser.y)**2) }))
                       .filter(item => item.d < effectiveRange)
                       .sort((a, b) => a.d - b.d);
                   targets = sorted.slice(0, 3).map(item => item.e);
               } else {
                   let nearest = null; let minDst = Infinity;
                   for(const e of enemiesRef.current) { const d = Math.sqrt((e.x - laser.x)**2 + (e.y - laser.y)**2); if (d < effectiveRange && d < minDst) { minDst = d; nearest = e; } }
                   if (nearest) targets.push(nearest);
               }

               targets.forEach(t => {
                   t.hp -= effectiveDamage;
                   createParticles(t.x, t.y, '#00ccff', 1, 1);
               });
               
               if (targets.length > 0 && Math.random() > 0.9) audio.playShoot('LASER'); 
            });
            lasersRef.current = lasersRef.current.filter(l => l.active);

            minesRef.current.forEach(mine => {
               if (!mine.armed) { if (Math.random() > 0.95) { mine.armed = true; audio.playShoot('MINE'); } return; }
               let triggered = false;
               enemiesRef.current.forEach(e => {
                 const d = Math.sqrt((e.x - mine.x)**2 + (e.y - mine.y)**2);
                 if (d < mine.triggerRadius + e.radius) triggered = true;
               });
               if (triggered) {
                 audio.playExplosion('LARGE');
                 mine.active = false;
                 createParticles(mine.x, mine.y, '#00ccff', 30, 8);
                 enemiesRef.current.forEach(e => {
                   const d = Math.sqrt((e.x - mine.x)**2 + (e.y - mine.y)**2);
                   if (d < mine.blastRadius) { e.hp -= mine.damage; createParticles(e.x, e.y, '#00ccff', 5); }
                 });
               }
            });
            minesRef.current = minesRef.current.filter(m => m.active);

            lavaRef.current.forEach(lava => {
                lava.life -= 16.6; if (lava.life <= 0) { lava.active = false; return; }
                enemiesRef.current.forEach(e => { const d = Math.sqrt((e.x - lava.x)**2 + (e.y - lava.y)**2); if (d < lava.radius + e.radius) { e.hp -= LAVA_STATS.DAMAGE; if (Math.random() > 0.8) createParticles(e.x, e.y, '#ffaa00', 1, 2); } });
            });
            lavaRef.current = lavaRef.current.filter(l => l.active);
            
            terrainRef.current.forEach(t => {
                if (t.type === 'LAVA_POOL') {
                    const d = Math.sqrt((t.x - player.x)**2 + (t.y - player.y)**2);
                    if (d < t.radius + player.radius) {
                        if (player.shield > 0) player.shield -= 0.5;
                        else player.hp -= 0.2;
                        if(Math.random() > 0.8) createParticles(player.x, player.y, '#ff4400', 1);
                    }
                }
            });

            if (timestamp - lastSupplyDropTime.current > SUPPLY_DROP_INTERVAL) {
               const angle = Math.random() * Math.PI * 2;
               const dist = random(100, 300);
               const sx = Math.max(50, Math.min(width-50, player.x + Math.cos(angle) * dist));
               const sy = Math.max(50, Math.min(height-50, player.y + Math.sin(angle) * dist));
               lootRef.current.push({ id: `supply-${timestamp}`, x: sx, y: sy, vx: 0, vy: 0, radius: 10, color: COLOR_LOOT_EQUIPMENT, active: true, value: 0, type: 'EQUIPMENT_BOX' });
               createParticles(sx, sy, COLOR_LOOT_EQUIPMENT, 20, 3);
               audio.playSupplyDrop();
               lastSupplyDropTime.current = timestamp;
            }

            if (timestamp - lastSpawnTime.current > ENEMY_SPAWN_RATE_MS) {
              let ex, ey; let valid = false; let attempts = 0;
              while(!valid && attempts < 10) {
                if (Math.random() > 0.5) { ex = Math.random() > 0.5 ? -30 : width + 30; ey = Math.random() * height; } else { ex = Math.random() * width; ey = Math.random() > 0.5 ? -30 : height + 30; }
                valid = true; attempts++;
              }
              if (valid) {
                const rand = Math.random(); 
                let type: Enemy['type'] = 'DRONE'; 
                let hp = 30; let r = 14; let c = COLOR_ENEMY_DRONE;
                
                const isVolcano = biomeIndex % 4 === 1;
                const isIce = biomeIndex % 4 === 2;
                const isForest = biomeIndex % 4 === 3;

                if (isVolcano && rand > 0.8) { type='MAGMA'; hp=80; r=16; c=COLOR_ENEMY_MAGMA; }
                else if (isIce && rand > 0.8) { type='FROST'; hp=50; r=15; c=COLOR_ENEMY_FROST; }
                else if (isForest && rand > 0.8) { type='ROOTER'; hp=60; r=18; c=COLOR_ENEMY_ROOTER; }
                else if (level >= 2 && rand > 0.9) { type='BOMBER'; hp=40; r=18; c=COLOR_ENEMY_BOMBER; }
                else if (level >= 2 && rand > 0.85) { type='ROLLER'; hp=60; r=16; c=COLOR_ENEMY_ROLLER; }
                else if (level >= 3 && rand > 0.95) { type='OCTO'; hp=200; r=25; c=COLOR_ENEMY_OCTO; }
                else if (rand > 0.85) { type='TANK'; hp=150; r=22; c=COLOR_ENEMY_TANK; } 
                else if (rand > 0.65) { type='RUSHER'; hp=20; r=10; c=COLOR_ENEMY_RUSHER; }
                
                const hpScale = Math.pow(ENEMY_HP_SCALE, level - 1);
                enemiesRef.current.push({ id: Math.random().toString(), x: ex, y: ey, vx: 0, vy: 0, radius: r, color: c, active: true, type: type, hp: hp * hpScale, maxHp: hp * hpScale, animFrame: 0 });
                lastSpawnTime.current = timestamp;
              }
            }
            
            enemiesRef.current.forEach(e => {
              if (!e.active) return;
              const dx = player.x - e.x; const dy = player.y - e.y; const dist = Math.sqrt(dx*dx + dy*dy);
              
              let speed = 0.8;
              if (e.type === 'RUSHER') speed = 2.5;
              if (e.type === 'BOMBER') speed = 2.0;
              if (e.type === 'TANK') speed = 0.4;
              if (e.type === 'BOSS') speed = 0.5;
              if (e.type === 'MAGMA') speed = 1.0;
              if (e.type === 'FROST') speed = 0.9;
              if (e.type === 'ROOTER') speed = 0.7;
              
              e.vx = (dx/dist) * speed; e.vy = (dy/dist) * speed;
              
              let collides = false;
              const nextX = e.x + e.vx;
              const nextY = e.y + e.vy;
              for (const t of terrainRef.current) {
                   if (t.type === 'OBSTACLE') {
                       const d = Math.sqrt((nextX - t.x)**2 + (nextY - t.y)**2);
                       if (d < e.radius + t.radius) {
                           collides = true; break;
                       }
                   }
              }

              if (!collides) {
                e.x += e.vx; e.y += e.vy;
              }

              if (e.type === 'FROST' || e.type === 'ROOTER') {
                  if (dist < 300 && timestamp - (e.lastAttackTime || 0) > 3000) {
                      e.lastAttackTime = timestamp;
                      const angle = Math.atan2(dy, dx);
                      bulletsRef.current.push({
                          id: Math.random().toString(), x: e.x, y: e.y,
                          vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
                          radius: 5, color: e.type === 'FROST' ? COLOR_BULLET_FROST : COLOR_BULLET_ROOT,
                          active: true, damage: 10, owner: 'ENEMY',
                          effect: e.type === 'FROST' ? 'FREEZE' : 'ROOT'
                      });
                  }
              }
              
              if (dist < e.radius + player.radius && timestamp > player.invincibleUntil && player.active) {
                 if (player.shield > 0) { player.shield -= 10; player.lastShieldHit = timestamp; audio.playDamage(); }
                 else { player.hp -= 10; audio.playDamage(); }
                 if (player.hp <= 0) {
                    // Death Logic
                    player.lives = Math.max(0, player.lives - 1);
                    player.active = false;
                    player.respawnTimer = timestamp + 3000;
                    audio.playExplosion('LARGE');
                    createParticles(player.x, player.y, player.color, 50, 6);
                 }
              }
              
              enemiesRef.current.forEach(other => {
                 if (e === other) return;
                 const d = Math.sqrt((e.x - other.x)**2 + (e.y - other.y)**2);
                 if (d < e.radius + other.radius) {
                    const push = 0.5;
                    const ax = (e.x - other.x) / d; const ay = (e.y - other.y) / d;
                    e.x += ax * push; e.y += ay * push;
                 }
              });
            });

            bulletsRef.current.forEach(b => {
              if (!b.active) return;
              if (b.isHoming && b.targetId) {
                 const target = enemiesRef.current.find(e => e.id === b.targetId);
                 if (target && target.active) {
                    const angle = Math.atan2(target.y - b.y, target.x - b.x);
                    b.vx = Math.cos(angle) * 6; b.vy = Math.sin(angle) * 6;
                 }
              }
              b.x += b.vx; b.y += b.vy;
              if (b.x < 0 || b.x > width || b.y < 0 || b.y > height) b.active = false;
              
              for (const t of terrainRef.current) {
                  if (t.type === 'OBSTACLE') {
                      const d = Math.sqrt((t.x - b.x)**2 + (t.y - b.y)**2);
                      if (d < t.radius + b.radius) {
                          b.active = false;
                          createParticles(b.x, b.y, b.color, 3);
                          break; 
                      }
                  }
              }

              if (b.active) {
                  if (b.owner === 'PLAYER' || b.owner === 'TURRET') {
                    enemiesRef.current.forEach(e => {
                       if (!e.active || !b.active) return;
                       const d = Math.sqrt((e.x - b.x)**2 + (e.y - b.y)**2);
                       if (d < e.radius + b.radius) {
                          e.hp -= b.damage; 
                          b.active = false;
                          createParticles(b.x, b.y, b.color, 3);
                          audio.playHit(); // Added hit sound
                          if (player.loadout.weapon === 'GAUSS' || (player.loadout.weapon === 'PLASMA' && d < WEAPON_STATS.PLASMA.blastRadius)) {
                              if (player.loadout.weapon === 'GAUSS' || (player.loadout.weapon === 'PLASMA' && player.loadout.weapon === 'PLASMA')) b.active = true; 
                              if (player.loadout.weapon === 'PLASMA') {
                                 enemiesRef.current.forEach(subE => {
                                    if(subE === e) return;
                                    const subD = Math.sqrt((subE.x - b.x)**2 + (subE.y - b.y)**2);
                                    if (subD < WEAPON_STATS.PLASMA.blastRadius) subE.hp -= b.damage * 0.5;
                                 });
                                 createParticles(b.x, b.y, '#00ffff', 10, 4);
                              }
                              if (player.loadout.weapon === 'GAUSS') b.active = true; 
                          }
                       }
                    });
                  } else if (b.owner === 'ENEMY') {
                      const d = Math.sqrt((player.x - b.x)**2 + (player.y - b.y)**2);
                      if (d < player.radius + b.radius && timestamp > player.invincibleUntil && player.active) {
                          b.active = false;
                          if (player.shield > 0) { player.shield -= b.damage; player.lastShieldHit = timestamp; audio.playDamage(); }
                          else { player.hp -= b.damage; audio.playDamage(); }
                          
                          if (b.effect === 'FREEZE') {
                              player.frozenUntil = timestamp + FREEZE_DURATION;
                          } else if (b.effect === 'ROOT') {
                              player.rootedUntil = timestamp + ROOT_DURATION;
                          }

                          if (player.hp <= 0) {
                              // Death Logic
                              player.lives = Math.max(0, player.lives - 1);
                              player.active = false;
                              player.respawnTimer = timestamp + 3000;
                              audio.playExplosion('LARGE');
                              createParticles(player.x, player.y, player.color, 50, 6);
                          }
                      }
                  }
              }
            });
            bulletsRef.current = bulletsRef.current.filter(b => b.active);

            enemiesRef.current.forEach(e => {
               if (e.hp <= 0) {
                  e.active = false;
                  audio.playExplosion('SMALL');
                  createParticles(e.x, e.y, e.color, 10);

                  if (e.type === 'MAGMA') {
                      lavaRef.current.push({ id: `lava-death-${Math.random()}`, x: e.x, y: e.y, vx: 0, vy: 0, radius: 30, color: '#ff4400', active: true, life: 5000, maxLife: 5000 });
                  }
                  
                  const isLarge = ['TANK','BOSS','OCTO','BOMBER','ROLLER','MAGMA','FROST','ROOTER'].includes(e.type);
                  if (Math.random() > 0.5) {
                      if (isLarge && Math.random() > 0.3) {
                          lootRef.current.push({ id: Math.random().toString(), x: e.x, y: e.y, vx: 0, vy: 0, radius: 10, color: COLOR_LOOT_EQUIPMENT, active: true, value: 0, type: 'EQUIPMENT_BOX' });
                      } else {
                          const rand = Math.random();
                          if (rand > 0.9) lootRef.current.push({ id: Math.random().toString(), x: e.x, y: e.y, vx: 0, vy: 0, radius: 6, color: COLOR_LOOT_HEALTH, active: true, value: 20, type: 'HEALTH' });
                          else if (rand > 0.8) lootRef.current.push({ id: Math.random().toString(), x: e.x, y: e.y, vx: 0, vy: 0, radius: 6, color: COLOR_LOOT_SHIELD, active: true, value: 25, type: 'SHIELD_CELL' });
                          else lootRef.current.push({ id: Math.random().toString(), x: e.x, y: e.y, vx: 0, vy: 0, radius: 5, color: COLOR_LOOT_DATA, active: true, value: 1, type: 'DATA' });
                      }
                  }
               }
            });
            enemiesRef.current = enemiesRef.current.filter(e => e.active);

            lootRef.current.forEach(l => {
               if (!player.active) return;
               const d = Math.sqrt((l.x - player.x)**2 + (l.y - player.y)**2);
               if (d < player.radius + l.radius + 50) {
                  l.x += (player.x - l.x) * 0.1; l.y += (player.y - l.y) * 0.1;
                  if (d < player.radius + l.radius) {
                     l.active = false;
                     audio.playPickup(l.type === 'EQUIPMENT_BOX' ? 'EQUIPMENT' : (l.type === 'HEALTH' ? 'HEALTH' : 'LOOT'));
                     if (l.type === 'DATA') { player.loot += 1; player.xp += XP_PER_SCRAP; }
                     if (l.type === 'HEALTH') { player.hp = Math.min(player.maxHp, player.hp + l.value); }
                     if (l.type === 'SHIELD_CELL') { player.shield = Math.min(player.maxShield, player.shield + l.value); }
                     if (l.type === 'TREASURE') { player.xp += 500; player.loot += 5; }
                     if (l.type === 'EQUIPMENT_BOX') {
                         const roll = Math.random();
                         if (roll < 0.33) turretsRef.current.push({ id: Math.random().toString(), x: player.x, y: player.y, vx: 0, vy: 0, radius: 10, color: '#555', active: true, life: TURRET_STATS.DURATION, maxLife: TURRET_STATS.DURATION, lastFireTime: 0, angle: 0 });
                         else if (roll < 0.66) lasersRef.current.push({ id: Math.random().toString(), x: player.x, y: player.y, vx: 0, vy: 0, radius: 8, color: '#0ff', active: true, life: LASER_STATS.DURATION, maxLife: LASER_STATS.DURATION, damage: LASER_STATS.DAMAGE, range: LASER_STATS.RANGE });
                         else minesRef.current.push({ id: Math.random().toString(), x: player.x, y: player.y, vx: 0, vy: 0, radius: 8, color: '#f00', active: true, damage: MINE_STATS.DAMAGE, triggerRadius: MINE_STATS.TRIGGER_RADIUS, blastRadius: MINE_STATS.BLAST_RADIUS, armed: false });
                     }
                  }
               }
            });
            lootRef.current = lootRef.current.filter(l => l.active);

            if (player.loot >= targetLootCount && !extractionZoneRef.current) {
                extractionZoneRef.current = { x: player.x, y: player.y, radius: 100 };
                audio.playUiClick(); 
            }
            if (extractionZoneRef.current && player.active) {
                const d = Math.sqrt((extractionZoneRef.current.x - player.x)**2 + (extractionZoneRef.current.y - player.y)**2);
                if (d < extractionZoneRef.current.radius) {
                    extractionTimerRef.current += 0.016;
                    if (extractionTimerRef.current > EXTRACTION_TIME_SECONDS) {
                        setGameState(GameState.EXTRACTED);
                    }
                } else {
                    extractionTimerRef.current = Math.max(0, extractionTimerRef.current - 0.016);
                }
            }
        }

        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < width; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for (let y = 0; y < height; y += 50) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        ctx.stroke();
        
        terrainRef.current.forEach(t => {
            if (t.type === 'LAVA_POOL') {
                ctx.fillStyle = 'rgba(255, 68, 0, 0.4)'; 
                ctx.beginPath(); ctx.arc(t.x, t.y, t.radius, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 15; ctx.shadowColor = '#ff4400'; ctx.fill(); ctx.shadowBlur = 0;
            } else if (t.type === 'OBSTACLE') {
                ctx.fillStyle = t.color;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    ctx.lineTo(t.x + t.radius * Math.cos(i * Math.PI / 3), t.y + t.radius * Math.sin(i * Math.PI / 3));
                }
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.stroke();
            }
        });

        if (extractionZoneRef.current) {
            ctx.strokeStyle = COLOR_EXTRACTION;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath(); ctx.arc(extractionZoneRef.current.x, extractionZoneRef.current.y, extractionZoneRef.current.radius, 0, Math.PI*2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(0, 255, 100, 0.1)'; ctx.fill();
        }

        lavaRef.current.forEach(l => {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.3)'; ctx.beginPath(); ctx.arc(l.x, l.y, l.radius, 0, Math.PI*2); ctx.fill();
        });

        minesRef.current.forEach(m => {
            ctx.strokeStyle = COLOR_FRIENDLY_OUTLINE; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, Math.PI*2); ctx.stroke();
            if (m.armed) {
                 ctx.fillStyle = COLOR_FRIENDLY_ZONE; ctx.beginPath(); ctx.arc(m.x, m.y, m.triggerRadius, 0, Math.PI*2); ctx.fill();
                 ctx.fillStyle = COLOR_FRIENDLY_OUTLINE; ctx.beginPath(); ctx.arc(m.x, m.y, 3, 0, Math.PI*2); ctx.fill();
            } else {
                 ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(m.x, m.y, 3, 0, Math.PI*2); ctx.fill();
            }
        });

        lasersRef.current.forEach(l => {
            ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(l.x, l.y, 8, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = COLOR_FRIENDLY_OUTLINE; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = COLOR_FRIENDLY_ZONE; ctx.beginPath(); ctx.arc(l.x, l.y, l.range, 0, Math.PI*2); ctx.fill();
            const range = l.range * (1 + metaUpgrades.laserTech * 0.1);
            enemiesRef.current.forEach(e => {
               const d = Math.sqrt((e.x - l.x)**2 + (e.y - l.y)**2);
               if (d < range) {
                  ctx.strokeStyle = COLOR_FRIENDLY_OUTLINE; ctx.lineWidth = 1 + Math.random()*2;
                  ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(e.x, e.y); ctx.stroke();
               }
            });
        });

        turretsRef.current.forEach(t => {
            ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.angle);
            ctx.fillStyle = '#444'; ctx.fillRect(-8, -8, 16, 16);
            ctx.fillStyle = COLOR_FRIENDLY_OUTLINE; ctx.fillRect(0, -3, 12, 6);
            ctx.restore();
            ctx.fillStyle = COLOR_FRIENDLY_ZONE; ctx.beginPath(); ctx.arc(t.x, t.y, TURRET_STATS.RANGE, 0, Math.PI*2); ctx.fill();
        });

        lootRef.current.forEach(l => {
            ctx.fillStyle = l.color; ctx.beginPath(); ctx.arc(l.x, l.y, l.radius, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 10; ctx.shadowColor = l.color; ctx.fill(); ctx.shadowBlur = 0;
        });

        enemiesRef.current.forEach(e => drawSciFiEnemy(ctx, e, timestamp));

        drawAstronaut(ctx, playerRef.current, timestamp);

        bulletsRef.current.forEach(b => {
           ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2); ctx.fill();
        });
        
        chainBeamsRef.current.forEach(beam => {
           beam.life -= 0.05;
           if (beam.life <= 0) { beam.active = false; return; }
           ctx.strokeStyle = beam.color;
           ctx.lineWidth = beam.width * (beam.life / beam.maxLife);
           ctx.lineCap = 'round';
           ctx.beginPath();
           if (beam.points.length > 0) {
               ctx.moveTo(beam.points[0].x, beam.points[0].y);
               for(let i=1; i<beam.points.length; i++) ctx.lineTo(beam.points[i].x, beam.points[i].y);
           }
           ctx.stroke();
        });
        chainBeamsRef.current = chainBeamsRef.current.filter(b => b.active);

        particlesRef.current.forEach(p => {
            p.life -= 0.02; if (p.life <= 0) p.active = false;
            p.x += p.vx; p.y += p.vy;
            ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.fillRect(p.x, p.y, p.radius, p.radius); ctx.fill(); ctx.globalAlpha = 1.0;
        });
        particlesRef.current = particlesRef.current.filter(p => p.active);

        drawJoystick(ctx, touchInput.current.left, '#00ccff'); 
        drawJoystick(ctx, touchInput.current.right, '#ff6600'); 

        onUpdateStats({
           hp: playerRef.current.hp,
           shield: playerRef.current.shield,
           loot: playerRef.current.loot,
           time: extractionTimerRef.current,
           xp: playerRef.current.xp,
           maxXp: playerRef.current.maxXp,
           lives: playerRef.current.lives,
           playerRef: playerRef.current
        });

      } catch (e) { console.error(e); }
      
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, isPaused, targetLootCount, theme, level, metaUpgrades, onUpdateStats, onShowUpgradeMenu]);

  return <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="block touch-none" style={{touchAction: 'none'}} />;
};

export default GameCanvas;
