import api from "./api";

export const playLimbo = async (betData) => {
  try {
    const { data } = await api.post("/limbo/play", betData);
    return data;
  } catch (error) {
    return { success: false, message: error.response?.data?.message || error.message || "Request failed" };
  }
};

export const getMyLimboBets = async () => {
  try {
    const { data } = await api.get("/limbo/bets/my");
    return data;
  } catch (error) {
    return { success: false, message: error.response?.data?.message || error.message || "Request failed" };
  }
};

export const cashOutLimbo = async (betId) => {
  try {
    const { data } = await api.post("/limbo/cashout", { betId });
    return data;
  } catch (error) {
    return { success: false, message: error.response?.data?.message || error.message || "Request failed" };
  }
};
