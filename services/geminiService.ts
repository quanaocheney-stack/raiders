
import { GoogleGenAI, Type } from "@google/genai";
import { MissionInfo, MissionChoice } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper for loot progression
const getTargetLoot = (level: number) => {
  if (level === 1) return 10;
  if (level === 2) return 20;
  return (level - 1) * 20;
};

// Fallback
const FALLBACK_MISSION: MissionChoice = {
  id: 'fallback', biomeIndex: 1, rewardType: 'WEAPON_PLASMA',
  info: { title: "未知区域", briefing: "侦测到不稳定的能量读数。区域内存在大量敌对机械体。首要目标是搜集数据核心并存活。", targetLoot: 20, threatLevel: "高" }
};

export const generateNextMission = async (level: number): Promise<MissionChoice> => {
  const targetLoot = getTargetLoot(level);
  
  try {
    if (!process.env.API_KEY) {
        return { ...FALLBACK_MISSION, info: { ...FALLBACK_MISSION.info, targetLoot } };
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `生成下一个科幻游戏关卡 (Level ${level})。
      规则:
      1. Target Loot 必须是 ${targetLoot}。
      2. RewardType 必须是下列之一: 'WEAPON_PLASMA', 'WEAPON_GAUSS', 'UPGRADE_POINTS'。
      3. BiomeIndex: 0=Industrial, 1=Mars, 2=Ice, 3=Toxic.
      4. 返回单个任务对象。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            biomeIndex: { type: Type.INTEGER, description: "0-3" },
            rewardType: { type: Type.STRING, enum: ['WEAPON_PLASMA', 'WEAPON_GAUSS', 'UPGRADE_POINTS'] },
            info: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                briefing: { type: Type.STRING },
                targetLoot: { type: Type.NUMBER },
                threatLevel: { type: Type.STRING }
              },
              required: ["title", "briefing", "targetLoot", "threatLevel"]
            }
          },
          required: ["id", "biomeIndex", "rewardType", "info"]
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    if (json.info) {
      return json as MissionChoice;
    }
    return { ...FALLBACK_MISSION, info: { ...FALLBACK_MISSION.info, targetLoot } };

  } catch (error) {
    console.error("Failed to generate mission:", error);
    return { ...FALLBACK_MISSION, info: { ...FALLBACK_MISSION.info, targetLoot } };
  }
};

export const generateMissionBriefing = async (): Promise<MissionInfo> => {
  return FALLBACK_MISSION.info;
};
