## CREAZA transitie VIDEO intre ecrane:

Super! Iată promptul pe care să-l folosești:

---

**Prompt pentru tranziție video:**

> "Adaugă tranziție video pe click pe [ELEMENT] din [ECRAN]. Video: [NUME_VIDEO]. După tranziție: [ACȚIUNE]."

---

**Exemplu:**
> "Adaugă tranziție video pe click pe butonul 'Start' din HomeScreen. Video: washingFeet. După tranziție: navighează la PrayersScreen."

---

**Ce trebuie să știi:**

1. **Import** (2 linii):
```javascript
import { useTransition, TRANSITION_VIDEOS } from "../../global/context";
const { playTransition } = useTransition();
```

2. **Folosire** (1 linie în onPress):
```javascript
onPress={() => playTransition({
  video: TRANSITION_VIDEOS.washingFeet,
  onComplete: () => /* acțiunea ta */
})}
```

3. **Video-uri noi** - adaugă în `TransitionContext.js`:
```javascript
export const TRANSITION_VIDEOS = {
  washingFeet: require("../../public/videos/washing_feet.mp4"),
  altVideo: require("../../public/videos/alt_video.mp4"),
};
```

---
