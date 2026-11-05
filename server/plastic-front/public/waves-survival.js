/* 돌파 전용: 거실·뒷마당 / 일반 플레이와 AI 방치 공통
수정 안내: 시간은 초, batch는 한 번에 나오는 수, interval은 간격, cap은 생존 상한.
pressure.early는 lateAt 이전, pressure.late는 이후. late의 증가 기준은 lateAt부터.
숫자 대신 {base, perTier, min, max}를 쓰면 매 60초마다 증가/감소합니다.
{base, add, every}는 every분마다 add만큼 증가합니다. absolute:true는 시작부터 계산.
null 상한은 제한 없음. mix는 위에서 먼저 맞는 규칙을 사용하며 every는 생성 순번의 배수입니다.
세부 예시와 병과 코드: WAVE-SETTINGS.md. 다른 모드 파일에는 영향을 주지 않습니다.
*/
(function(root){'use strict';
const config={
  "crowdScale": .85,
  "bossCrowdScale": .8,
  "lateAt": 360,
  "retrySeconds": 2,
  "earlyTeamCap": 100,
  // 시간대별 수량·간격·생존 상한. 숫자 하나로 바꾸면 고정값이 됩니다.
  "pressure": {
    "early": {
      "combatCap": null,
      "soldierCap": 100,
      "postCap": {
        "base": 8,
        "perTier": 1,
        "max": 16
      },
      "baseCap": {
        "base": 16,
        "perTier": 2,
        "max": 32
      },
      "postBatch": {
        "base": 2,
        "add": 1,
        "every": 3,
        "max": 4
      },
      "baseBatch": {
        "base": 3,
        "add": 1,
        "every": 2,
        "max": 7
      },
      "postInterval": {
        "base": 18,
        "perTier": -0.6,
        "min": 8
      },
      "baseInterval": {
        "base": 17,
        "perTier": -0.6,
        "min": 7
      },
      "swarmInterval": {
        "base": 4.5,
        "perTier": -0.15,
        "min": 2.8
      },
      "swarmBatch": {
        "base": 2,
        "add": 1,
        "every": 3,
        "max": 4
      },
      "swarmCap": {
        "base": 22,
        "perTier": 5,
        "max": 60
      },
      "assaultBatch": {
        "base": 3,
        "perTier": 0.6,
        "max": 10,
        "round": "floor"
      },
      "assaultInterval": {
        "base": 20,
        "perTier": -0.6,
        "min": 10
      }
    },
    "late": {
      "combatCap": {
        "base": 48,
        "perTier": 2,
        "max": 60
      },
      "soldierCap": {
        "base": 18,
        "perTier": 1,
        "max": 26
      },
      "postCap": 12,
      "baseCap": {
        "base": 18,
        "perTier": 1,
        "max": 24
      },
      "postBatch": 2,
      "baseBatch": 3,
      "postInterval": {
        "base": 22,
        "perTier": -0.5,
        "min": 18
      },
      "baseInterval": {
        "base": 24,
        "perTier": -0.5,
        "min": 18
      },
      "swarmInterval": {
        "base": 4.8,
        "perTier": -0.1,
        "min": 4
      },
      "swarmBatch": 3,
      "swarmCap": {
        "base": 26,
        "perTier": 2,
        "max": 36
      },
      "assaultBatch": {
        "base": 4,
        "add": 1,
        "every": 3,
        "max": 6
      },
      "assaultInterval": {
        "base": 26,
        "perTier": -0.5,
        "min": 22
      }
    }
  },
  // 시작 시 미리 배치된 적. 좌표는 각 맵의 월드 좌표입니다.
  "opening": [
    {
      "type": "bladeGuard",
      "x": 740,
      "y": 2070
    },
    {
      "type": "ant",
      "x": 855,
      "y": 2110
    }
  ],
  // 지속적으로 나오는 지상 벌레. 수량·간격은 위 pressure의 swarm 항목.
  "swarm": {
    "enabled": true,
    "firstAt": 4,
    "fallback": "ant",
    "mix": [
      { "at": 90, "every": 13, "type": "bikeRaider", "maxAlive": 2 },
      // 장난감 병정: 3분부터 5번째마다 / 대장: 5분부터 17번째마다, 생존 1기.
      { "at": 300, "every": 17, "type": "bayonetCaptain", "maxAlive": 1 },
      { "at": 180, "every": 5, "type": "bayonet", "maxAlive": 6 },
      {
        "at": 180,
        "every": 11,
        "type": "rhinoBeetle"
      },
      {
        "at": 120,
        "every": 7,
        "type": "stagBeetle"
      },
      {
        "at": 60,
        "every": 3,
        "type": "soldierAnt"
      },
      // 초반 검병은 기존 무리의 일부를 대체합니다. 동시에 최대 3기.
      { "at": 0, "every": 4, "type": "bladeGuard", "maxAlive": 3 },
      {
        "at": 0,
        "every": 6,
        "type": "beetle"
      }
    ]
  },
  // 돌파 목표 벌레 무리. 디펜스에서는 사용하지 않습니다.
  "hunt": {
    "enabled": true,
    "total": 8,
    "firstAt": 8,
    "earlyCap": 90,
    "fullRetry": 4,
    "batch": {
      "base": 3,
      "perWave": 1.5,
      "perTier": 1,
      "max": 24,
      "round": "floor"
    },
    "interval": {
      "base": 18,
      "perTier": -0.5,
      "min": 12
    },
    "fallback": "ant",
    "mix": [
      { "at": 90, "every": 13, "type": "bikeRaider", "maxAlive": 2 },
      // 장난감 병정: 3분부터 5번째마다 / 대장: 5분부터 17번째마다, 생존 1기.
      { "at": 300, "every": 17, "type": "bayonetCaptain", "maxAlive": 1 },
      { "at": 180, "every": 5, "type": "bayonet", "maxAlive": 6 },
      {
        "at": 180,
        "every": 9,
        "type": "rhinoBeetle"
      },
      {
        "at": 120,
        "every": 6,
        "type": "stagBeetle"
      },
      {
        "at": 180,
        "every": 7,
        "type": "bruteBeetle"
      },
      { "at": 0, "every": 6, "type": "bladeGuard", "maxAlive": 3 },
      {
        "at": 0,
        "wave": 3,
        "firstFraction": 0.2,
        "type": "beetle"
      },
      {
        "at": 60,
        "every": 3,
        "type": "soldierAnt"
      }
    ]
  },
  // 비행 적: at=첫 등장 초 / batch=마릿수 / interval=주기 초 / cap=생존 한도.
  "flying": {
    "butterfly": { "enabled": true, "at": 300, "batch": 1, "interval": 45, "cap": 2 },
    "honeybee": {
      "enabled": true,
      "at": 240,
      "batch": 6,
      "interval": 30,
      "cap": 12
    },
    "hornet": {
      "enabled": true,
      "at": 360,
      "batch": 2,
      "interval": 30,
      "cap": 4
    }
  },
  // 적 병사 돌격대. firstAt·finalStageAt은 디펜스의 시간 단계.
  "assault": {
    "enabled": true,
    "firstAt": 180,
    "finalStageAt": 600,
    "stageDelay": 20,
    "lateFinalDelay": 30,
    "rosters": [
      {
        "at": 0,
        "types": [
          "bayonet",
          "bayonet",
          "bayonet",
          "rifle",
          "sniper"
        ]
      },
      {
        "at": 120,
        "types": [
          "bayonet",
          "bayonet",
          "bayonet",
          "rifle",
          "rocket",
          "sniper",
          "guntruck",
          "machinegun"
        ]
      },
      {
        "at": 240,
        "types": [
          "bayonet",
          "bayonet",
          "rifle",
          "tank",
          "guntruck",
          "bayonet",
          "rocket",
          "sniper",
          "machinegun",
          "mortar"
        ]
      }
    ]
  },
  // 정기 보스. types는 순환 순서. final은 거실 최종 보스 전용.
  "boss": {
    "enabled": true,
    "firstAt": 120,
    "interval": 120,
    "warningSeconds": 10,
    "minAfterKill": 30,
    "types": ["bayonetCaptain", "bladeGuard", "bikeRaider", "crimsonAce", "hornet", "stagBeetle", "rhinoBeetle"],
    "names": {
      "crimsonAce": "진홍 전차 에이스",
      "bayonetCaptain": "장난감 병정 대장",
      "bladeGuard": "블랙 실드 검병 대장",
      "bikeRaider": "바이크 돌격대장",
      "stagBeetle": "왕사슴벌레",
      "rhinoBeetle": "왕장수풍뎅이",
      "hornet": "장수말벌"
    },
    "final": {
      "at": 600,
      "type": "rhinoBeetle",
      "name": "거실의 지배자"
    }
  },
  // 돌파 모드의 전초기지·본진 수비 증원. 디펜스에서는 사용하지 않습니다.
  "guards": {
    "postInitial": [
      "bayonet",
      "bayonet",
      "bayonet",
      "sniper",
      "rocket"
    ],
    "postFirstDelay": 15,
    "baseInitial": [
      "bayonet",
      "bayonet",
      "bayonet",
      "rifle",
      "sniper",
      "guntruck",
      "guntruck",
      "rocket",
      "rocket",
      "tank"
    ],
    "lateBaseInitial": [
      "bayonet",
      "bayonet",
      "bayonet",
      "rifle",
      "guntruck",
      "tank"
    ],
    "baseFirstDelay": 14,
    "lateBaseFirstDelay": 24,
    "rosters": [
      {
        "at": 0,
        "types": [
          "bayonet",
          "bayonet",
          "bayonet",
          "rifle",
          "sniper"
        ]
      },
      {
        "at": 120,
        "types": [
          "bayonet",
          "bayonet",
          "bayonet",
          "rifle",
          "rocket",
          "sniper",
          "guntruck",
          "machinegun"
        ]
      },
      {
        "at": 240,
        "types": [
          "bayonet",
          "bayonet",
          "bayonet",
          "rifle",
          "tank",
          "rocket",
          "guntruck",
          "sniper",
          "machinegun",
          "mortar"
        ]
      }
    ]
  }
};
if(typeof module!=='undefined'&&module.exports)module.exports=config;
else{root.FrontWaveConfigs=root.FrontWaveConfigs||{};root.FrontWaveConfigs.survival=config;}
})(typeof window==='undefined'?globalThis:window);
