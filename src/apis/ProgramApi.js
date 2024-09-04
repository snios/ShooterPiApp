import { useEffect } from "react";
import axios from "axios";

const useProgramApi = (serverUrl) => {
  const api = axios.create({
    baseURL: serverUrl,
  });

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

  const createOrUpdate = (pinData) => {
    return api.post("/save", pinData);
  };

  // const update = (id, pinData) => {
  //   return api.get(`/pins/${id}`, pinData);
  // };

  const remove = (id) => {
    return api.get(`/pins/${id}`);
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
  };
};

export default useProgramApi;
