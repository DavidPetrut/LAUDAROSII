import { storage } from "../utils/storage";
import { CONFIG } from "../config";

const getToken = async () => {
  return await storage.getItem(CONFIG.TOKEN_KEY);
};

const request = async (endpoint, options = {}) => {
  const token = await getToken();

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${CONFIG.API_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Eroare la comunicarea cu serverul");
  }

  return data;
};

export const api = {
  get: (endpoint) => request(endpoint, { method: "GET" }),
  post: (endpoint, body) => request(endpoint, { method: "POST", body }),
  put: (endpoint, body) => request(endpoint, { method: "PUT", body }),
  delete: (endpoint) => request(endpoint, { method: "DELETE" }),
};
