
export enum GameState {
  MENU = 'MENU',
  CHARACTER_SELECT = 'CHARACTER_SELECT', 
  STORY_INTRO = 'STORY_INTRO',
  LOADOUT_SELECT = 'LOADOUT_SELECT',
  LOADING_MISSION = 'LOADING_MISSION',
  PLAYING = 'PLAYING',
  EXTRACTING = 'EXTRACTING',
  EXTRACTED = 'EXTRACTED',
  GAME_OVER = 'GAME_OVER',
  UPGRADING = 'UPGRADING',
  META_SHOP = 'META_SHOP',
  LEVEL_SELECT = 'LEVEL_SELECT'
}

export type WeaponType = 'RIFLE' | 'SHOTGUN' | 'SNIPER' | 'PLASMA' | 'GAUSS';
export type TacticalType = 'SHIELD' | 'MISSILE' | 'LASER_CHAIN'; 
export type EnemyType = 'DRONE' | 'RUSHER' | 'TANK' | 'BOSS' | 'BOMBER' | 'ROLLER' | 'OCTO' | 'MAGMA' | 'FROST' | 'ROOTER';
export type TerrainType = 'OBSTACLE' | 'LAVA_POOL';
export type CharacterType = 'ASSAULT' | 'VANGUARD' | 'GHOST';

export interface Loadout {
  weapon: WeaponType;
}

export interface MetaUpgrades {
  weaponPower: number;  
  shieldCap: number;    
  missileCount: number; 
  laserTech: number;    
}

export interface Point {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface Entity extends Point, Velocity {
  id: string;
  radius: number;
  color: string;
  active: boolean;
}

export interface Player extends Entity {
  character: CharacterType; 
  hp: number;
  maxHp: number;
  speed: number; 
  shield: number;
  maxShield: number;
  lastShieldHit: number;
  ammo: number;
  loot: number;
  scrap: number;
  tech: number;
  xp: number;
  maxXp: number;
  angle: number;
  loadout: Loadout;
  tacticals: Record<TacticalType, number>;
  weaponLevel: number;
  lives: number;
  invincibleUntil: number;
  frozenUntil: number;
  rootedUntil: number;
  respawnTimer: number;
}

export interface Enemy extends Entity {
  type: EnemyType;
  hp: number;
  maxHp: number;
  lastAttackTime?: number;
  animFrame: number;
}

export interface Bullet extends Entity {
  damage: number;
  owner: 'PLAYER' | 'ENEMY' | 'TURRET';
  isHoming?: boolean;
  targetId?: string;
  effect?: 'FREEZE' | 'ROOT';
}

export interface Terrain extends Entity {
  type: TerrainType;
  width?: number;
  height?: number;
}

export interface Turret extends Entity {
  life: number;
  maxLife: number;
  lastFireTime: number;
  targetId?: string;
  angle: number;
}

export interface ChainBeam extends Entity {
  points: Point[];
  life: number;
  maxLife: number;
  width: number;
}

export interface LaserTower extends Entity {
  life: number;
  maxLife: number;
  damage: number;
  range: number;
}

export interface Mine extends Entity {
  damage: number;
  triggerRadius: number;
  blastRadius: number;
  armed: boolean;
}

export interface Orbital extends Entity {
  angleOffset: number;
  orbitRadius: number;
  speed: number;
  damage: number;
}

export interface LavaPool extends Entity {
  life: number;
  maxLife: number;
  width?: number;
  height?: number;
}

export interface LootItem extends Entity {
  value: number;
  type: 'DATA' | 'HEALTH' | 'SHIELD_CELL' | 'TREASURE' | 'EQUIPMENT_BOX';
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
}

export interface MissionInfo {
  title: string;
  briefing: string;
  targetLoot: number;
  threatLevel: string;
}

export interface MissionChoice {
  id: string;
  biomeIndex: number;
  info: MissionInfo;
  rewardType: 'WEAPON_PLASMA' | 'WEAPON_GAUSS' | 'UPGRADE_POINTS';
}
