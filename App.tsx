
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, MissionInfo, Loadout, WeaponType, TacticalType, Player, MetaUpgrades, MissionChoice, CharacterType } from './types';
import GameCanvas from './components/GameCanvas';
import CRTOverlay from './components/CRTOverlay';
import { generateNextMission } from './services/geminiService';
import { audio } from './services/audioService';
import { LEVEL_1_TARGET_LOOT, CHARACTERS } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [mission, setMission] = useState<MissionInfo | null>(null);
  const [loadout, setLoadout] = useState<Loadout>({ weapon: 'RIFLE' });
  const [characterType, setCharacterType] = useState<CharacterType>('ASSAULT');
  
  const [tacticalLevels, setTacticalLevels] = useState<Record<TacticalType, number>>({
      SHIELD: 0,
      MISSILE: 0,
      LASER_CHAIN: 0
  });
  const [selectedTacticalUpgrade, setSelectedTacticalUpgrade] = useState<TacticalType | null>(null);

  const [level, setLevel] = useState(1);
  const [upgradePoints, setUpgradePoints] = useState(0);
  const [metaUpgrades, setMetaUpgrades] = useState<MetaUpgrades>({
    weaponPower: 0,
    shieldCap: 0,
    missileCount: 0,
    laserTech: 0
  });

  const [nextMission, setNextMission] = useState<MissionChoice | null>(null);
  const [biomeIndex, setBiomeIndex] = useState(0);
  const [rewardType, setRewardType] = useState<MissionChoice['rewardType'] | undefined>(undefined);

  const [hp, setHp] = useState(100);
  const [shield, setShield] = useState(0);
  const [loot, setLoot] = useState(0);
  const [extractTimer, setExtractTimer] = useState(0);
  const [xp, setXp] = useState(0);
  const [maxXp, setMaxXp] = useState(100);
  const [lives, setLives] = useState(3);

  const [showUpgradeMenu, setShowUpgradeMenu] = useState(false);
  const playerRef = useRef<Player | null>(null);
  const [upgradeTrigger, setUpgradeTrigger] = useState(0);

  const [isPaused, setIsPaused] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleInteract = () => {
        audio.init();
        window.removeEventListener('click', handleInteract);
        window.removeEventListener('keydown', handleInteract);
    };
    window.addEventListener('click', handleInteract);
    window.addEventListener('keydown', handleInteract);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
        window.removeEventListener('click', handleInteract);
        window.removeEventListener('keydown', handleInteract);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Escape') {
            if (gameState === GameState.PLAYING || gameState === GameState.EXTRACTING) {
                setIsPaused(prev => {
                    const newState = !prev;
                    if (newState) audio.playUiClick();
                    return newState;
                });
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  useEffect(() => {
      if (gameState === GameState.PLAYING) {
          audio.playBGM(biomeIndex);
      } else {
          audio.stopBGM();
      }
  }, [gameState, biomeIndex]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    audio.playUiClick();
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDeploy = () => {
    if (selectedTacticalUpgrade) {
        setTacticalLevels(prev => ({
            ...prev,
            [selectedTacticalUpgrade]: prev[selectedTacticalUpgrade] + 1
        }));
    }

    audio.playUiClick();
    setGameState(GameState.LOADING_MISSION);
    setIsPaused(false);
    setTimeout(() => {
      setGameState(GameState.PLAYING);
    }, 2000);
  };

  const prepareLevelSelect = () => {
    audio.playUiClick();
    setGameState(GameState.LEVEL_SELECT);
    setNextMission(null); 
    
    generateNextMission(level + 1).then(missionData => {
        setNextMission(missionData);
    });
  };

  const handleConfirmDeploy = () => {
    if (!nextMission) return;
    audio.playUiClick();
    setMission(nextMission.info);
    setBiomeIndex(nextMission.biomeIndex);
    setRewardType(nextMission.rewardType);
    setLevel(prev => prev + 1);
    
    setSelectedTacticalUpgrade(null);
    setGameState(GameState.LOADOUT_SELECT);
  };

  const startGameFlow = () => {
      audio.playUiClick();
      setGameState(GameState.CHARACTER_SELECT);
  }

  const handleCharacterSelect = (type: CharacterType) => {
    audio.playUiClick();
    setCharacterType(type);
    
    const crashMission: MissionInfo = {
      title: "未知区域 (Crash Site)",
      briefing: "警告：飞船坠毁。检测到敌对机械生命体。建议立即搜寻物资并撤离。",
      targetLoot: 10,
      threatLevel: "CRITICAL"
    };
    setMission(crashMission);
    setBiomeIndex(0); 
    setRewardType(undefined);
    setGameState(GameState.STORY_INTRO);
  };

  const handleProceedFromStory = () => {
      audio.playUiClick();
      setSelectedTacticalUpgrade(null); 
      setGameState(GameState.LOADOUT_SELECT);
  }

  const quitToMenu = () => {
      audio.stopBGM();
      audio.playUiClick();
      setIsPaused(false);
      setLevel(1);
      setMetaUpgrades({ weaponPower: 0, shieldCap: 0, missileCount: 0, laserTech: 0 });
      setTacticalLevels({ SHIELD: 0, MISSILE: 0, LASER_CHAIN: 0 });
      setUpgradePoints(0);
      setGameState(GameState.MENU);
  };

  const updateStats = useCallback((stats: any) => {
    setHp(prev => Math.abs(prev - stats.hp) > 1 ? stats.hp : prev);
    setShield(prev => Math.abs(prev - stats.shield) > 1 ? stats.shield : prev);
    setLoot(prev => prev !== stats.loot ? stats.loot : prev);
    setExtractTimer(prev => Math.abs(prev - stats.time) > 0.1 ? stats.time : prev);
    setXp(prev => prev !== stats.xp ? stats.xp : prev);
    setMaxXp(prev => prev !== stats.maxXp ? stats.maxXp : prev);
    setLives(prev => prev !== stats.lives ? stats.lives : prev);
    playerRef.current = stats.playerRef;
  }, []);

  const handleShowUpgrade = useCallback((open: boolean, canInteract: boolean) => {
    if (open) {
        setShowUpgradeMenu(true);
        setGameState(GameState.UPGRADING); 
        audio.playLevelUp();
    }
  }, []);

  const performUpgrade = (type: 'WEAPON' | 'TACTICAL_BOOST' | 'HP') => {
     const p = playerRef.current;
     if (!p) return;
     audio.playUiClick();

     if (type === 'WEAPON') p.weaponLevel += 1;
     else if (type === 'TACTICAL_BOOST') {
         p.maxShield += 15; p.shield += 15;
     } else if (type === 'HP') { p.maxHp += 25; p.hp = p.maxHp; }
     
     setUpgradeTrigger(prev => prev + 1); 
     setShowUpgradeMenu(false);
     setGameState(GameState.PLAYING);
  };

  const buyMetaUpgrade = (type: keyof MetaUpgrades) => {
    if (upgradePoints <= 0) return;
    audio.playUiClick();

    const currentVal = metaUpgrades[type];
    if (type === 'laserTech' && currentVal >= 5) return;
    
    // @ts-ignore
    setMetaUpgrades(prev => ({ ...prev, [type]: prev[type] + 1 }));
    setUpgradePoints(prev => prev - 1);
  };

  const TacticalOption = ({ type, name, desc }: { type: TacticalType, name: string, desc: string }) => {
      const currentLvl = tacticalLevels[type];
      const isSelected = selectedTacticalUpgrade === type;
      
      return (
        <button 
          onClick={() => { setSelectedTacticalUpgrade(type); audio.playUiClick(); }}
          className={`p-4 border text-left transition-all flex justify-between items-center ${
            isSelected
              ? 'border-blue-500 bg-blue-900/20 text-white' 
              : 'border-gray-700 text-gray-500 hover:border-gray-500'
          }`}
        >
          <div>
              <div className="font-bold font-mono text-lg">{name}</div>
              <div className="text-xs mt-1 opacity-80">{desc}</div>
          </div>
          <div className="text-right">
              <div className="text-xs uppercase text-gray-500">Current Level</div>
              <div className={`text-xl font-mono font-bold ${currentLvl > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                  {currentLvl} {isSelected && <span className="text-green-400"> -> {currentLvl + 1}</span>}
              </div>
          </div>
        </button>
      );
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden text-white select-none font-sans">
      <GameCanvas 
        gameState={gameState} 
        setGameState={setGameState}
        targetLootCount={mission?.targetLoot || 10}
        loadout={loadout}
        tacticalLevels={tacticalLevels}
        onUpdateStats={updateStats}
        onShowUpgradeMenu={handleShowUpgrade}
        upgradeTrigger={upgradeTrigger}
        level={level}
        metaUpgrades={metaUpgrades}
        biomeIndex={biomeIndex}
        rewardType={rewardType}
        isPaused={isPaused}
        characterType={characterType}
      />
      <CRTOverlay />

      {gameState === GameState.LOADING_MISSION && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
           <div className="text-center animate-pulse">
              <div className="text-4xl font-mono text-orange-500 mb-2">DEPLOYING...</div>
              <div className="text-sm text-gray-500 font-mono">ZONE {level} - {mission?.title}</div>
           </div>
        </div>
      )}

      {gameState === GameState.STORY_INTRO && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-950/50 backdrop-blur-md">
            <div className="max-w-3xl w-full border-4 border-red-600 bg-black p-12 text-center shadow-[0_0_100px_rgba(255,0,0,0.4)] animate-in zoom-in duration-500">
                <h1 className="text-6xl font-bold text-red-500 font-mono mb-4 tracking-widest animate-pulse">CRITICAL FAILURE</h1>
                <div className="h-px w-full bg-red-800 mb-8"></div>
                <p className="text-2xl text-white mb-8 leading-relaxed font-mono">
                    <span className="text-red-400">[系统警告]</span> 飞船动力核心离线。<br/>
                    迫降坐标: <span className="text-orange-400">SECTOR-7 (未知区域)</span><br/><br/>
                    环境扫描显示大量敌对信号。你需要利用紧急逃生舱中的装备生存下来，并搜集足够的能量核心以重启撤离系统。
                </p>
                <div className="border border-red-900 bg-red-900/20 p-6 mb-8 text-left">
                    <div className="text-sm text-red-400 mb-2">MISSION BRIEFING:</div>
                    <div className="text-xl font-bold text-white">{mission?.briefing}</div>
                    <div className="mt-4 text-sm text-gray-400">目标: 搜集 {mission?.targetLoot} 个数据核心</div>
                </div>
                <button onClick={handleProceedFromStory} className="px-12 py-5 bg-red-700 hover:bg-red-600 text-white font-bold text-2xl tracking-widest border-2 border-white">
                    紧急部署 / DEPLOY
                </button>
            </div>
          </div>
      )}

      {isPaused && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-gray-900/90 border-2 border-yellow-500 p-10 w-full max-w-md text-center shadow-[0_0_50px_rgba(255,200,0,0.2)]">
              <h2 className="text-3xl font-mono text-yellow-500 mb-8 animate-pulse">游戏暂停 / PAUSED</h2>
              <div className="flex flex-col gap-4">
                 <button onClick={() => { setIsPaused(false); audio.playUiClick(); }} className="px-6 py-3 bg-gray-800 border border-gray-600 hover:bg-yellow-900/50 hover:border-yellow-500 transition-all text-xl font-bold">
                    继续行动 (RESUME)
                 </button>
                 <button onClick={quitToMenu} className="px-6 py-3 bg-gray-800 border border-gray-600 hover:bg-red-900/50 hover:border-red-500 transition-all text-xl font-bold text-red-400">
                    放弃任务 (ABORT)
                 </button>
              </div>
           </div>
        </div>
      )}

      {showUpgradeMenu && !isPaused && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-gray-900/90 border-2 border-cyan-500 p-8 w-full max-w-lg shadow-[0_0_50px_rgba(0,255,255,0.2)]">
              <h2 className="text-2xl font-mono text-cyan-400 mb-6 animate-pulse">系统升级 / SYSTEM UPGRADE</h2>
              <div className="space-y-4">
                 <div className="flex justify-between items-center p-4 border border-gray-700 hover:bg-white/5 transition-colors group">
                    <div><div className="font-bold text-white">武器超频</div><div className="text-xs text-gray-400">+20% 伤害</div></div>
                    <button onClick={() => performUpgrade('WEAPON')} className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-mono">SELECT</button>
                 </div>
                 <div className="flex justify-between items-center p-4 border border-gray-700 hover:bg-white/5 transition-colors group">
                    <div><div className="font-bold text-white">战术增幅</div><div className="text-xs text-gray-400">增强护盾/导弹</div></div>
                    <button onClick={() => performUpgrade('TACTICAL_BOOST')} className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-mono">SELECT</button>
                 </div>
                 <div className="flex justify-between items-center p-4 border border-gray-700 hover:bg-white/5 transition-colors group">
                    <div><div className="font-bold text-white">纳米修复</div><div className="text-xs text-gray-400">+25 最大生命 & 治疗</div></div>
                    <button onClick={() => performUpgrade('HP')} className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-mono">SELECT</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {gameState === GameState.LEVEL_SELECT && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
           <div className="max-w-4xl w-full p-1 bg-gray-900 border border-gray-800 shadow-[0_0_50px_rgba(0,100,255,0.1)]">
              <div className="p-12 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 text-xs text-gray-600 font-mono">UPLINK ESTABLISHED</div>
                  <div className="absolute bottom-0 left-0 p-4 text-xs text-gray-600 font-mono">ENCRYPTION: NONE</div>
                  
                  {!nextMission ? (
                      <div className="flex flex-col items-center justify-center h-64 animate-pulse">
                          <div className="text-4xl font-mono text-blue-500 mb-4 tracking-widest">SCANNING SECTOR...</div>
                          <div className="w-64 h-1 bg-gray-800 overflow-hidden">
                              <div className="h-full bg-blue-500 animate-[shimmer_1s_infinite] w-full"></div>
                          </div>
                          <div className="mt-4 text-gray-500 font-mono text-sm">DOWNLOADING TOPOGRAPHY DATA</div>
                      </div>
                  ) : (
                      <div className="animate-in zoom-in duration-300">
                          <div className="flex justify-between items-end mb-6 border-b border-gray-700 pb-4">
                             <div>
                                 <h2 className="text-sm text-orange-500 font-mono mb-1">INCOMING TRANSMISSION</h2>
                                 <h1 className="text-5xl font-bold text-white font-mono">{nextMission.info.title}</h1>
                             </div>
                             <div className="text-right">
                                 <div className="text-xs text-gray-500">ZONE ID</div>
                                 <div className="text-xl font-mono font-bold">{level + 1}-ALPHA</div>
                             </div>
                          </div>

                          <div className="grid grid-cols-3 gap-8 mb-12">
                              <div className="col-span-2">
                                  <h3 className="text-gray-400 font-bold mb-2">BRIEFING</h3>
                                  <p className="text-lg leading-relaxed text-gray-200">{nextMission.info.briefing}</p>
                              </div>
                              <div className="space-y-4 border-l border-gray-800 pl-8">
                                  <div>
                                      <div className="text-xs text-gray-500 uppercase">Threat Level</div>
                                      <div className="text-red-500 font-bold text-xl">{nextMission.info.threatLevel}</div>
                                  </div>
                                  <div>
                                      <div className="text-xs text-gray-500 uppercase">Target Loot</div>
                                      <div className="text-blue-400 font-bold text-xl">{nextMission.info.targetLoot} UNITS</div>
                                  </div>
                                  <div>
                                      <div className="text-xs text-gray-500 uppercase">Signature Detected</div>
                                      <div className="text-yellow-400 font-bold text-sm">
                                          {nextMission.rewardType === 'WEAPON_PLASMA' && 'PLASMA TECH'}
                                          {nextMission.rewardType === 'WEAPON_GAUSS' && 'GAUSS TECH'}
                                          {nextMission.rewardType === 'UPGRADE_POINTS' && 'HIGH ENERGY'}
                                      </div>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="text-center">
                              <button 
                                onClick={handleConfirmDeploy}
                                className="px-16 py-4 bg-white text-black font-bold text-2xl hover:bg-orange-500 hover:text-white transition-all tracking-widest"
                              >
                                INITIATE DEPLOYMENT
                              </button>
                          </div>
                      </div>
                  )}
              </div>
           </div>
        </div>
      )}

      {gameState === GameState.META_SHOP && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="max-w-4xl w-full p-8 border border-orange-500/30 bg-gray-900">
            <h2 className="text-4xl font-mono text-orange-500 mb-4">战备补给 / SUPPLY</h2>
            <div className="text-xl mb-8 text-gray-300">可用点数: <span className="text-orange-400 font-bold text-3xl">{upgradePoints}</span></div>
            <div className="grid grid-cols-2 gap-6 mb-12">
              <div className="p-4 border border-gray-700 flex justify-between items-center">
                <div><div className="font-bold text-xl">武器强化模块</div><div className="text-sm text-gray-400">Lv {metaUpgrades.weaponPower} (+{metaUpgrades.weaponPower * 20}% 伤害)</div></div>
                <button onClick={() => buyMetaUpgrade('weaponPower')} disabled={upgradePoints <= 0} className="px-4 py-2 bg-orange-700 disabled:opacity-50">升级</button>
              </div>
              <div className="p-4 border border-gray-700 flex justify-between items-center">
                <div><div className="font-bold text-xl">护盾发生器</div><div className="text-sm text-gray-400">Lv {metaUpgrades.shieldCap} (+{metaUpgrades.shieldCap * 25} 护盾上限)</div></div>
                <button onClick={() => buyMetaUpgrade('shieldCap')} disabled={upgradePoints <= 0} className="px-4 py-2 bg-orange-700 disabled:opacity-50">升级</button>
              </div>
              <div className="p-4 border border-gray-700 flex justify-between items-center">
                <div><div className="font-bold text-xl">导弹扩容仓</div><div className="text-sm text-gray-400">Lv {metaUpgrades.missileCount} (每次发射 +{metaUpgrades.missileCount} 枚)</div></div>
                <button onClick={() => buyMetaUpgrade('missileCount')} disabled={upgradePoints <= 0} className="px-4 py-2 bg-orange-700 disabled:opacity-50">升级</button>
              </div>
              <div className="p-4 border border-gray-700 flex justify-between items-center">
                <div>
                    <div className="font-bold text-xl">光子谐振器</div>
                    <div className="text-sm text-gray-400">
                        Lv {metaUpgrades.laserTech} / 5
                        {metaUpgrades.laserTech >= 5 && " (已满级)"}
                    </div>
                    <div className="text-xs text-blue-400 mt-1">
                        {metaUpgrades.laserTech === 0 && "提升激光类武器伤害"}
                        {metaUpgrades.laserTech === 1 && "解锁: 伤害 +20%"}
                        {metaUpgrades.laserTech === 2 && "解锁: 激光塔可穿透目标"}
                        {metaUpgrades.laserTech === 3 && "解锁: 连锁激光分裂+1"}
                        {metaUpgrades.laserTech === 4 && "解锁: 激光塔全屏打击"}
                    </div>
                </div>
                <button onClick={() => buyMetaUpgrade('laserTech')} disabled={upgradePoints <= 0 || metaUpgrades.laserTech >= 5} className="px-4 py-2 bg-orange-700 disabled:opacity-50">
                    {metaUpgrades.laserTech >= 5 ? "MAX" : "升级"}
                </button>
              </div>
            </div>
            <div className="text-center">
               <button onClick={prepareLevelSelect} className="px-12 py-4 bg-orange-600 text-black font-bold text-2xl hover:bg-orange-500">选择下一区域 (NEXT LEVEL)</button>
            </div>
          </div>
        </div>
      )}

      {/* Character Select Screen */}
      {gameState === GameState.CHARACTER_SELECT && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/95">
             <div className="max-w-6xl w-full p-8">
                <h2 className="text-4xl font-mono text-center text-white mb-12">选择特勤干员 / SELECT OPERATOR</h2>
                <div className="grid grid-cols-3 gap-8">
                   {Object.entries(CHARACTERS).map(([key, char]) => (
                       <button 
                         key={key}
                         onClick={() => handleCharacterSelect(key as CharacterType)}
                         className="group border border-gray-700 hover:border-white p-8 text-left transition-all hover:bg-gray-900 relative overflow-hidden"
                       >
                          <div className="absolute top-0 right-0 p-4 text-8xl font-bold opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">{key.substring(0,1)}</div>
                          <div className="text-2xl font-bold mb-2" style={{color: char.color}}>{char.name}</div>
                          <div className="text-sm text-gray-400 font-mono mb-4">{key} CLASS</div>
                          <div className="h-px w-12 bg-gray-600 mb-6"></div>
                          <div className="space-y-2 text-sm text-gray-300">
                              <div className="flex justify-between"><span>HP</span><span className="font-mono text-white">{char.hp}</span></div>
                              <div className="flex justify-between"><span>SPEED</span><span className="font-mono text-white">{char.speed}</span></div>
                              <div className="flex justify-between"><span>WEAPON</span><span className="font-mono text-orange-400">{char.weapon}</span></div>
                          </div>
                          <div className="mt-6 text-xs text-gray-500">{char.desc}</div>
                       </button>
                   ))}
                </div>
             </div>
          </div>
      )}

      {/* Loadout Select (Armory) - Updated to only show Tactical */}
      {gameState === GameState.LOADOUT_SELECT && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/90">
          <div className="max-w-4xl w-full p-8 animate-in slide-in-from-bottom-10 duration-500">
            <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                <div>
                   <h2 className="text-4xl font-mono text-white">区域军械库 / ARMORY</h2>
                   <p className="text-gray-400 mt-1">领取本关的战术补给 (Select One Tactical Upgrade)</p>
                </div>
                <div className="text-orange-500 font-bold font-mono text-xl">LEVEL {level}</div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="md:col-span-2">
                <h3 className="text-blue-500 font-mono mb-4 text-xl">战术装备 (TACTICAL)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <TacticalOption type="SHIELD" name="护盾发生器" desc="提升护盾上限 (+25) 与回复速度。" />
                  <TacticalOption type="MISSILE" name="智能导弹" desc="周期性自动发射追踪导弹。" />
                  <TacticalOption type="LASER_CHAIN" name="激光发射器" desc="周期性发射连锁激光。" />
                </div>
                {!selectedTacticalUpgrade && (
                    <div className="text-red-500 text-sm mt-4 text-center animate-pulse">请选择一项战术升级以继续</div>
                )}
              </div>
            </div>
            
            <div className="mt-12 flex justify-center">
               <button 
                 onClick={handleDeploy} 
                 disabled={!selectedTacticalUpgrade}
                 className="px-12 py-4 border-2 border-white text-white font-bold text-xl hover:bg-white hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
               >
                确认部署 / DEPLOY
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === GameState.MENU && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
          <div className="text-center border-2 border-orange-600 p-12 bg-black/90 max-w-2xl w-full flex flex-col items-center">
            <h1 className="text-6xl font-bold mb-4 text-orange-500 font-mono tracking-tighter">RAIDER</h1>
            <div className="text-xl font-mono text-gray-400 tracking-widest mb-8">零号协议</div>
            
            <button onClick={startGameFlow} className="px-10 py-4 bg-orange-600 text-black font-bold text-xl hover:bg-orange-500 transition-all w-64">
              开始行动
            </button>

            {deferredPrompt && (
              <button onClick={handleInstallApp} className="mt-6 px-6 py-3 border border-gray-700 text-gray-400 hover:border-white hover:text-white text-sm font-mono tracking-widest uppercase transition-all w-64 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 9.75l-3 3m0 0l3 3m-3-3h7.5M8.159 3h7.682c.546 0 .99.454.985 1.005l-.05 5.533c-.006.602-.489 1.07-1.091 1.07H8.315c-.602 0-1.085-.468-1.091-1.07l-.05-5.533C7.169 3.454 7.613 3 8.159 3z" />
                </svg>
                下载 / 安装游戏
              </button>
            )}
            
            <div className="mt-8 text-xs text-gray-600 font-mono max-w-xs">
               iOS 用户请点击底部分享按钮，选择“添加到主屏幕”以获得全屏体验
            </div>
          </div>
        </div>
      )}

      {(gameState === GameState.PLAYING || gameState === GameState.EXTRACTING || gameState === GameState.UPGRADING) && (
        <div className="absolute inset-0 pointer-events-none z-10 p-8 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2">
               <div className="flex items-center gap-2">
                 <div className="w-8 text-xs font-bold text-orange-500">HP</div>
                 <div className={`h-3 w-48 bg-gray-800 border border-gray-600 skew-x-12`}>
                    <div className="h-full bg-orange-500 transition-all duration-200" style={{ width: `${(hp/playerRef.current?.maxHp!)*100 || 100}%` }}></div>
                 </div>
                 <span className="font-mono text-lg">{Math.round(hp)}</span>
               </div>
               {(shield > 0 || tacticalLevels.SHIELD > 0 || metaUpgrades.shieldCap > 0) && (
                 <div className="flex items-center gap-2">
                   <div className="w-8 text-xs font-bold text-blue-400">SHD</div>
                   <div className={`h-3 w-48 bg-gray-800 border border-gray-600 skew-x-12`}>
                      <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${(shield/playerRef.current?.maxShield!)*100 || 0}%` }}></div>
                   </div>
                   <span className="font-mono text-lg text-blue-400">{Math.round(shield)}</span>
                 </div>
               )}
               <div className="flex gap-1 mt-1">
                  {[...Array(lives)].map((_, i) => (
                     <div key={i} className="w-3 h-3 bg-white rounded-full shadow-[0_0_5px_white]"></div>
                  ))}
               </div>
            </div>
             <div className="flex flex-col items-center">
                <div className="text-xs text-gray-500 mb-1 font-mono tracking-widest">LEVEL {level} - UPGRADE PROGRESS</div>
                <div className="w-64 h-2 bg-gray-800 rounded border border-gray-700">
                   <div className="h-full bg-cyan-500 transition-all duration-200 shadow-[0_0_10px_cyan]" style={{ width: `${Math.min(100, (xp/maxXp)*100)}%` }}></div>
                </div>
             </div>
          </div>

          <div className="absolute right-8 bottom-8 text-right">
             <div className="text-xs text-gray-500">任务进度</div>
             <div className="text-3xl font-mono font-bold text-green-400">{loot} / <span className="text-gray-600">{mission?.targetLoot}</span></div>
             {loot >= (mission?.targetLoot || 10) && <div className="text-green-400 animate-pulse font-bold">撤离点已激活</div>}
          </div>

          {gameState === GameState.EXTRACTING && (
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="text-green-400 text-2xl font-bold mb-2">正在撤离</div>
              <div className="text-4xl font-mono">{extractTimer.toFixed(1)}s</div>
            </div>
          )}
        </div>
      )}

      {gameState === GameState.EXTRACTED && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-green-900/20 backdrop-blur-sm">
           <div className="text-center border border-green-500 p-12 bg-black">
            <h1 className="text-6xl font-bold text-green-500 mb-4">区域肃清</h1>
            <div className="text-xl text-gray-300 mb-8">获得 <span className="text-orange-500 font-bold">1</span> 升级点</div>
            <button onClick={() => {
                setUpgradePoints(p => p + 1);
                setGameState(GameState.META_SHOP);
            }} className="px-8 py-3 bg-green-600 text-black font-bold hover:bg-green-500 transition-colors uppercase">
                前往整备
            </button>
          </div>
        </div>
      )}

      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-red-900/20 backdrop-blur-sm">
          <div className="text-center">
            <h1 className="text-8xl font-bold text-red-600 mb-4 tracking-widest">行动失败</h1>
            <div className="text-gray-400 mb-8">在第 {level} 层阵亡</div>
            <button onClick={quitToMenu} className="px-8 py-3 border border-red-600 text-red-500 hover:bg-red-600 hover:text-black transition-colors uppercase tracking-widest">
                返回基地
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
