import { useEffect } from 'react';
import axios from 'axios';

const usePinsApi = (serverUrl) => {
  const api = axios.create({
    baseURL: serverUrl,
  });

  useEffect(() => {
    api.defaults.baseURL = serverUrl;
  }, [serverUrl]);

  const get = () => {
    console.log('get all pins:: url', serverUrl);
    return api.get('/pins');
  };

  const create = (pinData) => {
    return api.post('/pins', pinData);
  };

  const update = (id, pinData) => {
    return api.put(`/pins/${id}`, pinData);
  };

  const remove = (id) => {
    return api.delete(`/pins/${id}`);
  };

  // You can add more API functions for getting, creating, updating, or deleting pins

  return {
    get,
    create,
    update,
    remove,
  };
};

export default usePinsApi;