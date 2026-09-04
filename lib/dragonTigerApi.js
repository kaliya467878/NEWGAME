import api from "./api";

export const getCurrentPeriod = async (duration) => {
  const { data } = await api.get(`/dragon-tiger/${duration}/current`);
  return data;
};

export const getGameHistory = async (duration, params = {}) => {
  const { data } = await api.get(`/dragon-tiger/${duration}/history`, { params });
  return data;
};

export const placeBet = async (duration, payload) => {
  const { data } = await api.post(`/dragon-tiger/${duration}/bet`, payload);
  return data;
};

export const undoBet = async (duration, payload = {}) => {
  const { data } = await api.post(`/dragon-tiger/${duration}/bet/undo`, payload);
  return data;
};

export const getMyBets = async (params = {}) => {
  const { data } = await api.get("/dragon-tiger/bets/my", { params: { ...params, _t: Date.now() } });
  return data;
};
