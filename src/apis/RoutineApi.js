import { useEffect } from 'react';
import axios from 'axios';

const useRoutinesApi = (serverUrl) => {
  const api = axios.create({
    baseURL: serverUrl,
  });

  useEffect(() => {
    // Use the serverUrl in your API calls
    api.defaults.baseURL = serverUrl;
  }, [serverUrl]);


  const get = (id) => {
    if (typeof id === 'undefined') {
      console.log('get all routines:: url', serverUrl);
      return api.get('/routine');
    } else {
      console.log(`get routine with id ${id}:: url`, serverUrl);
      return api.get(`/routine/${id}`);
    }
  };

  const create = (routineData) => {
    return api.post('/routine', routineData);
  };

  const update = (id,routineData) => {
    return api.put(`/routine/${id}`, routineData);
  };

  const remove = (id) => {
    return api.delete(`/routine/${id}`);
  };
  const run = (id) => {
    return api.get(`/routine/${id}/run`);
  };

  return {
    get,
    create,
    run,
    remove,
    update
  };
};

export default useRoutinesApi;
