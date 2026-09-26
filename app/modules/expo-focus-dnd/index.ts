import { requireNativeModule } from "expo-modules-core";

// Modul nativ Android pentru "Nu deranja" de sistem. Absent pe iOS / web.
export default requireNativeModule("FocusDnd");
