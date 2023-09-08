import { atom } from 'recoil';

export const routineState = atom({
  key: 'routineState',
  default: {
    id: null,
    name: '',
    channels: []
  }
});

// Helper Functions to modify routineState
export const addChannel = (setRoutine, newChannel) => {
  setRoutine(prevRoutine => ({
    ...prevRoutine,
    channels: [...prevRoutine.channels, newChannel]
  }));
};

export const updateChannel = (setRoutine, updatedChannel) => {
  setRoutine(prevRoutine => ({
    ...prevRoutine,
    channels: prevRoutine.channels.map(channel =>
      channel.pin_id === updatedChannel.pin_id ? updatedChannel : channel
    )
  }));
};

export const removeChannel = (setRoutine, channel_id) => {
  setRoutine(prevRoutine => ({
    ...prevRoutine,
    channels: prevRoutine.channels.filter(channel => channel.id !== channel_id)
  }));
};

export const addTask = (setRoutine, channel_id, newTask) => {
  setRoutine(prevRoutine => {
    const updatedChannels = prevRoutine.channels.map(channel => {
      if (channel.id !== channel_id) return channel;

      return {
        ...channel,
        tasks: [...channel.tasks, newTask]
      };
    });
    return { ...prevRoutine, channels: updatedChannels };
  });
};

export const updateTask = (setRoutine, channel_id, task_id, updatedTask) => {
  setRoutine(prevRoutine => {
    const updatedChannels = prevRoutine.channels.map(channel => {
      if (channel.id !== channel_id) return channel;

      return {
        ...channel,
        tasks: channel.tasks.map((task) => {
          if (task.id !== task_id) return task;
          return updatedTask;
        })
      };
    });
    return { ...prevRoutine, channels: updatedChannels };
  });
};

export const removeTask = (setRoutine, channel_id, task_id) => {
  setRoutine(prevRoutine => {
    const updatedChannels = prevRoutine.channels.map(channel => {
      if (channel.id !== channel_id) return channel;

      console.log('remove task', )
      return {
        ...channel,
        tasks: channel.tasks.filter((task) => task.id !== task_id)
      };
    });
    return { ...prevRoutine, channels: updatedChannels };
  });
};
