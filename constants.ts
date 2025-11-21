
import { CharacterType, WeaponType } from './types';

export const CANVAS_WIDTH = window.innerWidth;
export const CANVAS_HEIGHT = window.innerHeight;

// Colors
export const COLOR_PLAYER = '#ff6600'; 
export const COLOR_PLAYER_SHIELD = '#00aaff';
export const COLOR_ENEMY_DRONE = '#00ccff'; 
export const COLOR_ENEMY_RUSHER = '#ff3333'; 
export const COLOR_ENEMY_TANK = '#aaaaaa';
export const COLOR_ENEMY_BOMBER = '#ffff00'; 
export const COLOR_ENEMY_ROLLER = '#ff8800'; 
export const COLOR_ENEMY_OCTO = '#aa00ff'; 
export const COLOR_ENEMY_MAGMA = '#ff3300'; 
export const COLOR_ENEMY_FROST = '#aaddff'; 
export const COLOR_ENEMY_ROOTER = '#00ff55'; 

export const COLOR_BULLET_PLAYER = '#ffffaa';
export const COLOR_BULLET_ENEMY = '#ff0000';
export const COLOR_BULLET_MISSILE = '#ff00ff';
export const COLOR_BULLET_TURRET = '#00ffaa';
export const COLOR_BULLET_FROST = '#aaddff'; 
export const COLOR_BULLET_ROOT = '#00ff55'; 

export const COLOR_LOOT_DATA = '#00ff00';
export const COLOR_LOOT_HEALTH = '#ff3333';
export const COLOR_LOOT_SHIELD = '#00aaff';
export const COLOR_LOOT_EQUIPMENT = '#aa00ff';
export const COLOR_EXTRACTION = '#00ffaa';
export const COLOR_TREASURE = '#ffd700';

export const COLOR_FRIENDLY_ZONE = 'rgba(0, 255, 255, 0.2)';
export const COLOR_FRIENDLY_OUTLINE = '#00ffff';

export const MAP_THEMES = [
  { bg: '#050505', grid: '#111', obstacleColor: '#222' },
  { bg: '#1a0505', grid: '#331100', obstacleColor: '#331100' },
  { bg: '#000510', grid: '#0a1a2a', obstacleColor: '#003344' },
  { bg: '#051005', grid: '#1a2a1a', obstacleColor: '#112211' }
];

// Character Stats
export const CHARACTERS: Record<CharacterType, { name: string, hp: number, speed: number, weapon: WeaponType, color: string, desc: string }> = {
    ASSAULT: { name: '突击兵', hp: 100, speed: 4, weapon: 'RIFLE', color: '#ff6600', desc: '均衡型。配备突击步枪。' },
    VANGUARD: { name: '重装兵', hp: 160, speed: 3, weapon: 'SHOTGUN', color: '#cc3333', desc: '高生存力。配备霰弹枪。' },
    GHOST: { name: '幽灵', hp: 70, speed: 5.5, weapon: 'SNIPER', color: '#cccccc', desc: '高机动性。配备狙击枪。' }
};

export const PLAYER_BASE_SHIELD = 0;
export const PLAYER_LIVES = 3;
export const INVINCIBILITY_DURATION = 3000;

export const FREEZE_DURATION = 2000;
export const ROOT_DURATION = 2500;

export const ENEMY_HP_SCALE = 1.2; 
export const ENEMY_DMG_SCALE = 1.1; 

export const XP_PER_SCRAP = 10;
export const XP_PER_TECH = 35;
export const LEVEL_XP_BASE = 100; 

export const TACTICAL_SHIELD_AMOUNT = 100;
export const SHIELD_REGEN_DELAY = 3000; 
export const SHIELD_REGEN_RATE = 0.5; 
export const UPGRADE_INTERVAL_SECONDS = 45; 

export const WEAPON_STATS = {
  RIFLE: { damage: 20, fireRate: 150, speed: 12, spread: 0.05, count: 1 },
  SHOTGUN: { damage: 12, fireRate: 800, speed: 10, spread: 0.3, count: 6 },
  SNIPER: { damage: 120, fireRate: 1200, speed: 25, spread: 0, count: 1 },
  PLASMA: { damage: 45, fireRate: 300, speed: 8, spread: 0.1, count: 1, blastRadius: 60 },
  GAUSS: { damage: 35, fireRate: 100, speed: 25, spread: 0.02, count: 1, pierce: true }
};

export const MISSILE_COOLDOWN = 2500; 
export const MISSILE_DAMAGE = 60;

export const LASER_CHAIN_STATS = {
  COOLDOWN: 3500,
  DAMAGE: 50,
  RANGE: 350,
  BOUNCE_RANGE: 250,
  BASE_BOUNCES: 3
};

export const TURRET_STATS = {
  COOLDOWN: 10000,
  DURATION: 15000, 
  RANGE: 400,
  FIRE_RATE: 200,
  DAMAGE: 15
};

export const LASER_STATS = {
  DURATION: 12000,
  RANGE: 300,
  DAMAGE: 2 
};

export const MINE_STATS = {
  DAMAGE: 150,
  TRIGGER_RADIUS: 40,
  BLAST_RADIUS: 100
};

export const ORBITAL_STATS = {
  DAMAGE: 5, 
  RADIUS: 80,
  SPEED: 0.05
};

export const LAVA_STATS = {
  DAMAGE: 2, 
  DURATION: 15000,
  RADIUS: 60
};

export const ENEMY_SPAWN_RATE_MS = 500; 
export const BOSS_SPAWN_INTERVAL = 60000; 
export const SUPPLY_DROP_INTERVAL = 10000; 
export const LEVEL_1_TARGET_LOOT = 10; 
export const LOOT_TO_EXTRACT = 10; 
export const EXTRACTION_TIME_SECONDS = 5;
