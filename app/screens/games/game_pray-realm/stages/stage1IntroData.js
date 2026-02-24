/**
 * Stage 1 Intro Data - Scene configuration
 * textPosition: 'top' | 'bottom' | 'bottom-right'
 * verticalOffset: ajustare Y (pozitiv = mai jos, negativ = mai sus)
 * buttonCentered: true pentru buton centrat (doar scene8)
 */

const rem = (size) => size * 2.5;

export const STAGE_1_INTRO = {
  stageId: 1,
  scenes: [
    {
      id: 1,
      image: require("../assets/lore/introgame/1_scene.png"),
      textPosition: "top",
      lines: ["Inca o zi pierduta...", "Vreau sa imi schimb viata!"],
    },
    {
      id: 2,
      image: require("../assets/lore/introgame/2_scene.png"),
      textPosition: "top",
      lines: ["Doamne, vreau sa cresc...", "Unde esti??", "Foloseste-ma!"],
    },
    {
      id: 3,
      image: require("../assets/lore/introgame/3_scene.png"),
      textPosition: "bottom",
      lines: ["Incerc sa lupt, dar parca nu merge...", "Imi simt inima prinsa, legata."],
      verticalOffset: rem(-25),
    },
    {
      id: 4,
      image: require("../assets/lore/introgame/4_scene.png"),
      textPosition: "bottom",
      lines: [
        "Ma simt depasit numeric",
        "de fiecare data cand incerc sa o fac...",
        "Am nevoie de ajutor!",
      ],
    },
    {
      id: 5,
      image: require("../assets/lore/introgame/5_scene.png"),
      textPosition: "top",
      lines: [
        "Eu te voi ajuta!",
        "Am deja un plan Victorios, dar...",
        "Trebuie sa faci exact ce iti voi spune!",
      ],
    },
    {
      id: 6,
      image: require("../assets/lore/introgame/6_scene.png"),
      textPosition: "bottom-right",
      lines: ["Echipeaza-te!", "Ia Sabia, scutul...", "Toata armatura."],
      verticalOffset: rem(38),
    },
    {
      id: 7,
      image: require("../assets/lore/introgame/7_scene.png"),
      textPosition: "bottom-right",
      lines: ["Apoi dute inapoi", "cu armele Mele!", "Victoria este a Mea!"],
      verticalOffset: rem(-18),
    },
    {
      id: 8,
      image: require("../assets/lore/introgame/8_scene.png"),
      textPosition: "bottom",
      lines: ["Daca iti doresti cu adevarat...,", "atunci te voi folosi!!"],
      verticalOffset: rem(-8),
      buttonCentered: true,
      isLast: true,
    },
  ],
};

export const INTRO_ASSETS = {
  arrowButton: require("../assets/lore/introgame/right_arrow1.png"),
  goButton: require("../assets/lore/introgame/button_go.png"),
};
