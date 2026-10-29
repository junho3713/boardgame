/* Factual KNARR card records, checked against the publisher rulebook and public BGA card reference. */
(function(root){
const data={
  "vikingTypes": [
    {
      "color": 3,
      "asset": "vp",
      "counts": {
        "2": 2,
        "3": 3,
        "4": 4
      },
      "art": "assets/original/viking-blue-vp.webp"
    },
    {
      "color": 3,
      "asset": "bracelet",
      "counts": {
        "2": 1,
        "3": 2,
        "4": 2
      },
      "art": "assets/original/viking-blue-bracelet.webp"
    },
    {
      "color": 3,
      "asset": "recruit",
      "counts": {
        "2": 1,
        "3": 1,
        "4": 1
      },
      "art": "assets/original/viking-blue-recruit.webp"
    },
    {
      "color": 3,
      "asset": "rep",
      "counts": {
        "2": 2,
        "3": 2,
        "4": 3
      },
      "art": "assets/original/viking-blue-rep.webp"
    },
    {
      "color": 1,
      "asset": "vp",
      "counts": {
        "2": 3,
        "3": 4,
        "4": 5
      },
      "art": "assets/original/viking-yellow-vp.webp"
    },
    {
      "color": 1,
      "asset": "bracelet",
      "counts": {
        "2": 1,
        "3": 1,
        "4": 2
      },
      "art": "assets/original/viking-yellow-bracelet.webp"
    },
    {
      "color": 1,
      "asset": "recruit",
      "counts": {
        "2": 0,
        "3": 1,
        "4": 1
      },
      "art": "assets/original/viking-yellow-recruit.webp"
    },
    {
      "color": 1,
      "asset": "rep",
      "counts": {
        "2": 2,
        "3": 2,
        "4": 2
      },
      "art": "assets/original/viking-yellow-rep.webp"
    },
    {
      "color": 4,
      "asset": "vp",
      "counts": {
        "2": 1,
        "3": 2,
        "4": 4
      },
      "art": "assets/original/viking-purple-vp.webp"
    },
    {
      "color": 4,
      "asset": "bracelet",
      "counts": {
        "2": 2,
        "3": 2,
        "4": 2
      },
      "art": "assets/original/viking-purple-bracelet.webp"
    },
    {
      "color": 4,
      "asset": "recruit",
      "counts": {
        "2": 2,
        "3": 2,
        "4": 2
      },
      "art": "assets/original/viking-purple-recruit.webp"
    },
    {
      "color": 4,
      "asset": "rep",
      "counts": {
        "2": 1,
        "3": 2,
        "4": 2
      },
      "art": "assets/original/viking-purple-rep.webp"
    },
    {
      "color": 2,
      "asset": "vp",
      "counts": {
        "2": 2,
        "3": 3,
        "4": 4
      },
      "art": "assets/original/viking-green-vp.webp"
    },
    {
      "color": 2,
      "asset": "bracelet",
      "counts": {
        "2": 1,
        "3": 1,
        "4": 2
      },
      "art": "assets/original/viking-green-bracelet.webp"
    },
    {
      "color": 2,
      "asset": "recruit",
      "counts": {
        "2": 2,
        "3": 3,
        "4": 3
      },
      "art": "assets/original/viking-green-recruit.webp"
    },
    {
      "color": 2,
      "asset": "rep",
      "counts": {
        "2": 1,
        "3": 1,
        "4": 1
      },
      "art": "assets/original/viking-green-rep.webp"
    },
    {
      "color": 0,
      "asset": "vp",
      "counts": {
        "2": 3,
        "3": 3,
        "4": 4
      },
      "art": "assets/original/viking-red-vp.webp"
    },
    {
      "color": 0,
      "asset": "bracelet",
      "counts": {
        "2": 2,
        "3": 3,
        "4": 3
      },
      "art": "assets/original/viking-red-bracelet.webp"
    },
    {
      "color": 0,
      "asset": "recruit",
      "counts": {
        "2": 1,
        "3": 1,
        "4": 2
      },
      "art": "assets/original/viking-red-recruit.webp"
    },
    {
      "color": 0,
      "asset": "rep",
      "counts": {
        "2": 0,
        "3": 1,
        "4": 1
      },
      "art": "assets/original/viking-red-rep.webp"
    }
  ],
  "lands": [
    {
      "number": 1,
      "type": "A",
      "reward": {
        "recruit": 1,
        "rep": 1,
        "draw": 1
      },
      "trade": [
        {},
        {
          "vp": 1
        },
        {}
      ],
      "different": 3,
      "id": 1,
      "name": "교역의 땅 A01",
      "art": "assets/original/destination-01.webp"
    },
    {
      "number": 2,
      "type": "A",
      "reward": {
        "bracelet": 1,
        "rep": 1,
        "draw": 1
      },
      "trade": [
        {},
        {
          "vp": 1
        },
        {}
      ],
      "different": 3,
      "id": 2,
      "name": "교역의 땅 A02",
      "art": "assets/original/destination-02.webp"
    },
    {
      "number": 3,
      "type": "A",
      "reward": {
        "bracelet": 1,
        "recruit": 1,
        "draw": 1
      },
      "trade": [
        {},
        {
          "vp": 1
        },
        {}
      ],
      "different": 3,
      "id": 3,
      "name": "교역의 땅 A03",
      "art": "assets/original/destination-03.webp"
    },
    {
      "number": 4,
      "type": "A",
      "reward": {
        "bracelet": 1
      },
      "trade": [
        {
          "vp": 1
        },
        {
          "rep": 1
        },
        {
          "recruit": 1
        }
      ],
      "different": 3,
      "id": 4,
      "name": "교역의 땅 A04",
      "art": "assets/original/destination-04.webp"
    },
    {
      "number": 5,
      "type": "A",
      "reward": {
        "bracelet": 1
      },
      "trade": [
        {
          "vp": 1
        },
        {
          "rep": 1
        },
        {
          "recruit": 1
        }
      ],
      "different": 3,
      "id": 5,
      "name": "교역의 땅 A05",
      "art": "assets/original/destination-05.webp"
    },
    {
      "number": 6,
      "type": "A",
      "reward": {
        "bracelet": 1,
        "draw": 1
      },
      "trade": [
        {},
        {
          "vp": 1
        },
        {
          "draw": 1
        }
      ],
      "cost": [
        4,
        4
      ],
      "id": 6,
      "name": "교역의 땅 A06",
      "art": "assets/original/destination-06.webp"
    },
    {
      "number": 7,
      "type": "A",
      "reward": {
        "draw": 1
      },
      "trade": [
        {
          "draw": 1
        },
        {},
        {
          "vp": 1
        }
      ],
      "cost": [
        4,
        4
      ],
      "id": 7,
      "name": "교역의 땅 A07",
      "art": "assets/original/destination-07.webp"
    },
    {
      "number": 8,
      "type": "A",
      "reward": {
        "draw": 1
      },
      "trade": [
        {
          "vp": 1
        },
        {
          "draw": 1
        },
        {}
      ],
      "cost": [
        4,
        4
      ],
      "id": 8,
      "name": "교역의 땅 A08",
      "art": "assets/original/destination-08.webp"
    },
    {
      "number": 9,
      "type": "A",
      "reward": {
        "rep": 2
      },
      "trade": [
        {},
        {
          "vp": 1
        },
        {
          "rep": 1
        }
      ],
      "cost": [
        3,
        3
      ],
      "id": 9,
      "name": "교역의 땅 A09",
      "art": "assets/original/destination-09.webp"
    },
    {
      "number": 10,
      "type": "A",
      "reward": {
        "recruit": 1,
        "rep": 1
      },
      "trade": [
        {
          "rep": 1
        },
        {},
        {
          "vp": 1
        }
      ],
      "cost": [
        3,
        3
      ],
      "id": 10,
      "name": "교역의 땅 A10",
      "art": "assets/original/destination-10.webp"
    },
    {
      "number": 11,
      "type": "A",
      "reward": {
        "bracelet": 1,
        "rep": 1
      },
      "trade": [
        {},
        {
          "rep": 1
        },
        {
          "vp": 1
        }
      ],
      "cost": [
        3,
        3
      ],
      "id": 11,
      "name": "교역의 땅 A11",
      "art": "assets/original/destination-11.webp"
    },
    {
      "number": 12,
      "type": "A",
      "reward": {
        "bracelet": 1,
        "recruit": 1
      },
      "trade": [
        {
          "vp": 1
        },
        {},
        {
          "recruit": 1
        }
      ],
      "cost": [
        2,
        2
      ],
      "id": 12,
      "name": "교역의 땅 A12",
      "art": "assets/original/destination-12.webp"
    },
    {
      "number": 13,
      "type": "A",
      "reward": {
        "recruit": 1
      },
      "trade": [
        {
          "recruit": 1
        },
        {
          "vp": 1
        },
        {}
      ],
      "cost": [
        2,
        2
      ],
      "id": 13,
      "name": "교역의 땅 A13",
      "art": "assets/original/destination-13.webp"
    },
    {
      "number": 14,
      "type": "A",
      "reward": {
        "recruit": 2
      },
      "trade": [
        {},
        {
          "recruit": 1
        },
        {}
      ],
      "cost": [
        2,
        2
      ],
      "id": 14,
      "name": "교역의 땅 A14",
      "art": "assets/original/destination-14.webp"
    },
    {
      "number": 15,
      "type": "A",
      "reward": {},
      "trade": [
        {
          "vp": 1
        },
        {
          "vp": 1
        },
        {
          "vp": 1
        }
      ],
      "cost": [
        1,
        1
      ],
      "id": 15,
      "name": "교역의 땅 A15",
      "art": "assets/original/destination-15.webp"
    },
    {
      "number": 16,
      "type": "A",
      "reward": {
        "rep": 1
      },
      "trade": [
        {
          "vp": 1
        },
        {
          "vp": 1
        },
        {}
      ],
      "cost": [
        1,
        1
      ],
      "id": 16,
      "name": "교역의 땅 A16",
      "art": "assets/original/destination-16.webp"
    },
    {
      "number": 17,
      "type": "A",
      "reward": {
        "recruit": 1
      },
      "trade": [
        {
          "vp": 1
        },
        {
          "vp": 1
        },
        {}
      ],
      "cost": [
        1,
        1
      ],
      "id": 17,
      "name": "교역의 땅 A17",
      "art": "assets/original/destination-17.webp"
    },
    {
      "number": 18,
      "type": "A",
      "reward": {
        "bracelet": 1,
        "draw": 1
      },
      "trade": [
        {
          "vp": 1
        },
        {},
        {
          "vp": 1
        }
      ],
      "cost": [
        0,
        0
      ],
      "id": 18,
      "name": "교역의 땅 A18",
      "art": "assets/original/destination-18.webp"
    },
    {
      "number": 19,
      "type": "A",
      "reward": {
        "bracelet": 1,
        "rep": 1
      },
      "trade": [
        {
          "vp": 1
        },
        {},
        {
          "vp": 1
        }
      ],
      "cost": [
        0,
        0
      ],
      "id": 19,
      "name": "교역의 땅 A19",
      "art": "assets/original/destination-19.webp"
    },
    {
      "number": 20,
      "type": "A",
      "reward": {
        "bracelet": 1
      },
      "trade": [
        {
          "vp": 1
        },
        {
          "vp": 1
        },
        {}
      ],
      "cost": [
        0,
        0
      ],
      "id": 20,
      "name": "교역의 땅 A20",
      "art": "assets/original/destination-20.webp"
    },
    {
      "number": 21,
      "type": "B",
      "reward": {
        "vp": 5,
        "recruit": 1
      },
      "trade": [
        {},
        {},
        {
          "vp": 1
        }
      ],
      "same": 4,
      "id": 21,
      "name": "영향력의 땅 B01",
      "art": "assets/original/destination-21.webp"
    },
    {
      "number": 22,
      "type": "B",
      "reward": {
        "vp": 5,
        "rep": 1
      },
      "trade": [
        {},
        {},
        {
          "vp": 1
        }
      ],
      "same": 4,
      "id": 22,
      "name": "영향력의 땅 B02",
      "art": "assets/original/destination-22.webp"
    },
    {
      "number": 23,
      "type": "B",
      "reward": {
        "vp": 5,
        "bracelet": 1
      },
      "trade": [
        {},
        {},
        {
          "vp": 1
        }
      ],
      "same": 4,
      "id": 23,
      "name": "영향력의 땅 B03",
      "art": "assets/original/destination-23.webp"
    },
    {
      "number": 24,
      "type": "B",
      "reward": {
        "vp": 4,
        "bracelet": 1,
        "recruit": 1,
        "rep": 1,
        "draw": 1
      },
      "trade": [
        {},
        {},
        {
          "vp": 1
        }
      ],
      "cost": [
        0,
        1,
        2,
        3,
        4
      ],
      "id": 24,
      "name": "영향력의 땅 B04",
      "art": "assets/original/destination-24.webp"
    },
    {
      "number": 25,
      "type": "B",
      "reward": {
        "vp": 4,
        "bracelet": 1,
        "recruit": 1,
        "rep": 1,
        "draw": 1
      },
      "trade": [
        {},
        {},
        {
          "vp": 1
        }
      ],
      "cost": [
        0,
        1,
        2,
        3,
        4
      ],
      "id": 25,
      "name": "영향력의 땅 B05",
      "art": "assets/original/destination-25.webp"
    },
    {
      "number": 26,
      "type": "B",
      "reward": {
        "vp": 6
      },
      "trade": [
        {},
        {
          "vp": 1
        },
        {}
      ],
      "cost": [
        4,
        4,
        1,
        1
      ],
      "id": 26,
      "name": "영향력의 땅 B06",
      "art": "assets/original/destination-26.webp"
    },
    {
      "number": 27,
      "type": "B",
      "reward": {
        "vp": 8,
        "draw": 1
      },
      "trade": [
        {},
        {},
        {
          "vp": 1
        }
      ],
      "cost": [
        4,
        4,
        4,
        0,
        0
      ],
      "id": 27,
      "name": "영향력의 땅 B07",
      "art": "assets/original/destination-27.webp"
    },
    {
      "number": 28,
      "type": "B",
      "reward": {
        "vp": 6
      },
      "trade": [
        {},
        {
          "vp": 1
        },
        {}
      ],
      "cost": [
        3,
        3,
        0,
        0
      ],
      "id": 28,
      "name": "영향력의 땅 B08",
      "art": "assets/original/destination-28.webp"
    },
    {
      "number": 29,
      "type": "B",
      "reward": {
        "vp": 7,
        "rep": 2
      },
      "trade": [
        {},
        {},
        {
          "vp": 1
        }
      ],
      "cost": [
        3,
        3,
        3,
        4,
        4
      ],
      "id": 29,
      "name": "영향력의 땅 B09",
      "art": "assets/original/destination-29.webp"
    },
    {
      "number": 30,
      "type": "B",
      "reward": {
        "vp": 6
      },
      "trade": [
        {},
        {
          "vp": 1
        },
        {}
      ],
      "cost": [
        2,
        2,
        4,
        4
      ],
      "id": 30,
      "name": "영향력의 땅 B10",
      "art": "assets/original/destination-30.webp"
    },
    {
      "number": 31,
      "type": "B",
      "reward": {
        "vp": 8,
        "recruit": 1
      },
      "trade": [
        {},
        {},
        {
          "vp": 1
        }
      ],
      "cost": [
        2,
        2,
        2,
        3,
        3
      ],
      "id": 31,
      "name": "영향력의 땅 B11",
      "art": "assets/original/destination-31.webp"
    },
    {
      "number": 32,
      "type": "B",
      "reward": {
        "vp": 6
      },
      "trade": [
        {},
        {
          "vp": 1
        },
        {}
      ],
      "cost": [
        1,
        1,
        3,
        3
      ],
      "id": 32,
      "name": "영향력의 땅 B12",
      "art": "assets/original/destination-32.webp"
    },
    {
      "number": 33,
      "type": "B",
      "reward": {
        "vp": 9
      },
      "trade": [
        {},
        {},
        {
          "vp": 1
        }
      ],
      "cost": [
        1,
        1,
        1,
        2,
        2
      ],
      "id": 33,
      "name": "영향력의 땅 B13",
      "art": "assets/original/destination-33.webp"
    },
    {
      "number": 34,
      "type": "B",
      "reward": {
        "vp": 6
      },
      "trade": [
        {},
        {
          "vp": 1
        },
        {}
      ],
      "cost": [
        0,
        0,
        2,
        2
      ],
      "id": 34,
      "name": "영향력의 땅 B14",
      "art": "assets/original/destination-34.webp"
    },
    {
      "number": 35,
      "type": "B",
      "reward": {
        "vp": 7,
        "bracelet": 1
      },
      "trade": [
        {},
        {},
        {
          "vp": 1
        }
      ],
      "cost": [
        0,
        0,
        0,
        1,
        1
      ],
      "id": 35,
      "name": "영향력의 땅 B15",
      "art": "assets/original/destination-35.webp"
    }
  ],
  "artifacts": [
    {
      "id": 1,
      "name": "벌꿀술 잔",
      "key": "mead-cup",
      "description": "탐험 후 공용 항구의 선원 1장을 버리고 덱 맨 위 카드로 교체할 수 있어.",
      "art": "assets/original/artifact-1.webp"
    },
    {
      "id": 2,
      "name": "은화",
      "key": "silver-coin",
      "description": "같은 색의 네 번째 이후 선원을 모집할 때마다 승점 1점을 받아.",
      "art": "assets/original/artifact-2.webp"
    },
    {
      "id": 3,
      "name": "가마솥",
      "key": "cauldron",
      "description": "같은 색의 두 번째 선원을 모집하면 어느 항구 칸에서든 무료로 카드를 가져올 수 있어.",
      "art": "assets/original/artifact-3.webp"
    },
    {
      "id": 4,
      "name": "황금 팔찌",
      "key": "golden-bracelet",
      "description": "같은 색의 세 번째 선원을 모집하면 목적지 1장을 예약할 수 있어. 예약은 최대 2장이야.",
      "art": "assets/original/artifact-4.webp"
    },
    {
      "id": 5,
      "name": "투구",
      "key": "helmet",
      "description": "교역의 땅 바로 위에 영향력의 땅을 탐험해 놓으면 추가로 모집 행동을 할 수 있어.",
      "art": "assets/original/artifact-5.webp"
    },
    {
      "id": 6,
      "name": "부적",
      "key": "amulet",
      "description": "다섯 색의 선원으로 가로줄 하나를 완성하면 은팔찌 1개·모집 토큰 1개·명성 1칸을 받아.",
      "art": "assets/original/artifact-6.webp"
    },
    {
      "id": 7,
      "name": "풍향계",
      "key": "weathervane",
      "description": "다섯 색의 선원으로 가로줄 하나를 완성하면 비용을 지불하고 추가 탐험을 할 수 있어.",
      "art": "assets/original/artifact-7.webp"
    }
  ],
  "art": {
    "cardBack": "assets/original/viking-back.webp",
    "landBacks": {
      "A": "assets/original/destination-back-A.webp",
      "B": "assets/original/destination-back-B.webp"
    },
    "ships": {
      "normal": {
        "brown": "assets/original/ship-normal-brown.webp",
        "white": "assets/original/ship-normal-white.webp",
        "beige": "assets/original/ship-normal-beige.webp",
        "black": "assets/original/ship-normal-black.webp"
      },
      "advanced": {
        "brown": "assets/original/ship-advanced-brown.webp",
        "white": "assets/original/ship-advanced-white.webp",
        "beige": "assets/original/ship-advanced-beige.webp",
        "black": "assets/original/ship-advanced-black.webp"
      }
    },
    "board": "assets/original/central-board.webp"
  },
  "source": {
    "rulebook": "https://studiobombyx.com/assets/KNARR_rulebook_EN.pdf",
    "factualCardReference": "https://github.com/thoun/knarr",
    "vikingData": "https://github.com/thoun/knarr/blob/main/modules/php/VikingManager.php",
    "destinationData": "https://github.com/thoun/knarr/blob/main/modules/php/DestinationManager.php",
    "referenceCommit": "6e78ab31083950b7499facdb0b3ba9ebc0cab1ca",
    "credits": "KNARR: Thomas Dupont. Artwork: Antoine Carrion. Publisher: Bombyx. Unofficial private educational implementation. Original engine written separately; no BGA engine code reused."
  }
};
if(typeof module!=="undefined"&&module.exports)module.exports=data;else root.KnarrData=data;
})(typeof globalThis!=="undefined"?globalThis:this);
