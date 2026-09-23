import { storage } from "../utils/storage";
import { CONFIG } from "../config";

/**
 * Optiune de auth pentru socket.io-client. `auth` ca functie e re-apelata de
 * socket.io la fiecare (re)conectare, deci tokenul e mereu proaspat din storage.
 * Se raspandeste in optiunile io(): io(url, { ...socketAuthOption, ... }).
 */
export const socketAuthOption = {
  auth: (cb) =>
    storage
      .getItem(CONFIG.TOKEN_KEY)
      .then((t) => cb({ token: t || "" }))
      .catch(() => cb({ token: "" })),
};
