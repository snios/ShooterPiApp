import { useEffect } from "react";
import axios from "axios";
import { useWifiBinding } from "../contexts/WifiBindingProvider";

const useProgramApi = (serverUrl) => {
  const { bindIfNeeded } = useWifiBinding();

  const api = axios.create({
    baseURL: serverUrl,
  });

  useEffect(() => {
    const reqId = api.interceptors.request.use(async (config) => {
      console.log("binding before request");
      await bindIfNeeded(); // säkerställ routing före varje request
      return config;
    });
    return () => api.interceptors.request.eject(reqId);
  }, [bindIfNeeded]);

  useEffect(() => {
    api.defaults.baseURL = serverUrl;
  }, [serverUrl]);

  const get = () => {
    console.log("get all programs:: url", serverUrl);
    return api.get("/list");
  };

  const getById = (id) => {
    console.log("get program by id:: url", serverUrl);
    return api.get("/load", { params: { id: id } });
  };

  const getFwVersion = () => {
    console.log('Get firmware version');

    return api.get("/version");
  }

  const createOrUpdate = (pinData) => {
    return api.post("/save", pinData);
  };

  // const update = (id, pinData) => {
  //   return api.get(`/pins/${id}`, pinData);
  // };

  const remove = (id) => {
    return api.get(`/delete`, { params: { id } });
  };
  const run = (id) => {
    console.log("run program by id::", id);
    return api.get(`/run`, { params: { id: id } });
  };

  // You can add more API functions for getting, creating, updating, or deleting pins

  return {
    get,
    getById,
    createOrUpdate,
    remove,
    run,
    getFwVersion,
  };
};

export default useProgramApi;
